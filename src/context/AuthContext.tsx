import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import {
  Organization,
  OrgUser,
  Job,
  Punch,
  PunchType,
  BreakType,
  UserRole,
} from '../types';
import {
  DEMO_ORG_ID,
  DEMO_ORGANIZATION,
  DEMO_JOBS,
  DEMO_USERS,
  generateDemoPunches,
  seedDemoDataToFirestore,
} from '../lib/demoData';
import {
  enqueueOfflinePunch,
  getPendingOfflinePunches,
  subscribeToSyncQueue,
  syncOfflinePunches,
} from '../lib/offlineQueue';
import { calculateDistanceInMeters } from '../lib/geoUtils';

interface AuthContextValue {
  firebaseUser: User | null;
  orgUser: OrgUser | null;
  organization: Organization | null;
  jobs: Job[];
  punches: Punch[];
  loading: boolean;
  isDemoMode: boolean;
  pendingOfflineCount: number;
  pendingOfflinePunches: number;
  isOnline: boolean;
  hasConsent: boolean;

  // Active Live Timeclock State
  isClockedIn: boolean;
  isOnBreak: boolean;
  activeJob: Job | null;
  activeClockInPunch: Punch | null;
  activeBreakStartPunch: Punch | null;
  elapsedSeconds: number;
  breakElapsedSeconds: number;

  // Permissions helpers
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isManagerOrAbove: boolean;
  isEmployee: boolean;
  canManageOrg: boolean;

  // Actions
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithOrg: (orgName: string, fullName: string, email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoUser: (userId: string) => void;
  toggleDemoMode: (enabled: boolean) => void;
  acceptConsent: () => Promise<void>;
  recordPunch: (params: {
    jobId: string;
    type: PunchType;
    breakType?: BreakType;
    latitude?: number;
    longitude?: number;
    gpsAccuracyMeters?: number;
    photoDataUri?: string;
    notes?: string;
  }) => Promise<{ success: boolean; punch?: Punch; queuedOffline?: boolean; error?: string }>;

  // Admin Operations
  createJob: (job: Omit<Job, 'id' | 'organizationId' | 'createdAt'>) => Promise<void>;
  updateJob: (jobId: string, updates: Partial<Job>) => Promise<void>;
  addEmployee: (employee: { fullName: string; email: string; role: UserRole; assignedJobIds: string[]; hourlyRate?: number; phone?: string }) => Promise<void>;
  updateEmployee: (userId: string, updates: Partial<OrgUser>) => Promise<void>;
  updateOrgSettings: (updates: Partial<Organization>) => Promise<void>;
  seedDemoDatabase: () => Promise<{ success: boolean; message: string }>;
  triggerManualSync: () => Promise<{ synced: number; failed: number }>;
  syncOfflinePunches: () => Promise<{ synced: number; failed: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [orgUser, setOrgUser] = useState<OrgUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true); // Defaults to demo mode for instant testing
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (organization?.id) {
        syncOfflinePunches(organization.id).catch(() => {});
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubSync = subscribeToSyncQueue((count) => {
      setPendingOfflineCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSync();
    };
  }, [organization?.id]);

  // Demo Mode initialization
  useEffect(() => {
    if (isDemoMode && !firebaseUser) {
      // Initialize with demo organization & Alex Rivera by default
      setOrganization(DEMO_ORGANIZATION);
      setJobs(DEMO_JOBS);
      setOrgUser(DEMO_USERS[2]); // Alex Rivera
      setPunches(generateDemoPunches());
      setLoading(false);
    }
  }, [isDemoMode, firebaseUser]);

  // Real Firebase Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoMode(false);
        setLoading(true);

        // Find user profile across organizations or in user index
        try {
          // Check local stored orgId or user metadata
          const savedOrgId = localStorage.getItem('current_org_id') || DEMO_ORG_ID;

          // Attempt lookup in savedOrgId/users/uid
          const userDocRef = doc(db, 'organizations', savedOrgId, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const uData = userSnap.data() as OrgUser;
            setOrgUser(uData);

            // Fetch Org doc
            const orgDocRef = doc(db, 'organizations', savedOrgId);
            const orgSnap = await getDoc(orgDocRef);
            if (orgSnap.exists()) {
              setOrganization(orgSnap.data() as Organization);
            }
          } else {
            // Default user profile if fresh
            const defaultUser: OrgUser = {
              id: fbUser.uid,
              organizationId: savedOrgId,
              role: 'owner',
              fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              createdAt: Date.now(),
              assignedJobIds: [],
              isActive: true,
              consentAcceptedAt: null,
            };
            setOrgUser(defaultUser);
          }
        } catch (e) {
          console.warn('Error fetching user profile:', e);
        } finally {
          setLoading(false);
        }
      } else {
        if (!isDemoMode) {
          setOrgUser(null);
          setOrganization(null);
          setJobs([]);
          setPunches([]);
          setLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [isDemoMode]);

  // Listen to Firestore real-time jobs & punches when organization is set
  useEffect(() => {
    if (!organization?.id || isDemoMode) return;

    // Listen to jobs
    const jobsRef = collection(db, 'organizations', organization.id, 'jobs');
    const unsubJobs = onSnapshot(jobsRef, (snapshot) => {
      const jList: Job[] = [];
      snapshot.forEach((doc) => {
        jList.push({ id: doc.id, ...doc.data() } as Job);
      });
      setJobs(jList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => {
      console.warn('Firestore jobs listener warning:', err);
    });

    // Listen to punches
    const punchesRef = collection(db, 'organizations', organization.id, 'punches');
    const punchesQuery = query(punchesRef, orderBy('timestamp', 'desc'));
    const unsubPunches = onSnapshot(punchesQuery, (snapshot) => {
      const pList: Punch[] = [];
      snapshot.forEach((doc) => {
        pList.push({ id: doc.id, ...doc.data() } as Punch);
      });
      setPunches(pList);
    }, (err) => {
      console.warn('Firestore punches listener warning:', err);
    });

    return () => {
      unsubJobs();
      unsubPunches();
    };
  }, [organization?.id, isDemoMode]);

  // Calculate live clock-in status for the current logged-in user
  const liveStatus = useMemo(() => {
    if (!orgUser) {
      return {
        isClockedIn: false,
        isOnBreak: false,
        activeJob: null,
        activeClockInPunch: null,
        activeBreakStartPunch: null,
        clockInTimestamp: null,
        breakStartTimestamp: null,
      };
    }

    // Filter punches for this user and sort chronologically
    const userPunches = punches
      .filter((p) => p.userId === orgUser.id)
      .sort((a, b) => a.timestamp - b.timestamp);

    let isClockedIn = false;
    let isOnBreak = false;
    let activeJobId = '';
    let activeClockInPunch: Punch | null = null;
    let activeBreakStartPunch: Punch | null = null;

    for (const p of userPunches) {
      if (p.type === 'clock_in') {
        isClockedIn = true;
        isOnBreak = false;
        activeJobId = p.jobId;
        activeClockInPunch = p;
        activeBreakStartPunch = null;
      } else if (p.type === 'clock_out') {
        isClockedIn = false;
        isOnBreak = false;
        activeJobId = '';
        activeClockInPunch = null;
        activeBreakStartPunch = null;
      } else if (p.type === 'break_start') {
        isOnBreak = true;
        activeBreakStartPunch = p;
      } else if (p.type === 'break_end') {
        isOnBreak = false;
        activeBreakStartPunch = null;
      }
    }

    const currentJob = jobs.find((j) => j.id === activeJobId) || (activeClockInPunch ? {
      id: activeClockInPunch.jobId,
      organizationId: organization?.id || '',
      name: activeClockInPunch.jobName,
      address: '',
      latitude: activeClockInPunch.latitude || 0,
      longitude: activeClockInPunch.longitude || 0,
      isActive: true,
    } : null);

    return {
      isClockedIn,
      isOnBreak,
      activeJob: currentJob,
      activeClockInPunch,
      activeBreakStartPunch,
      clockInTimestamp: activeClockInPunch?.timestamp || null,
      breakStartTimestamp: activeBreakStartPunch?.timestamp || null,
    };
  }, [orgUser, punches, jobs, organization]);

  // Live timer interval ticker (updates every second)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now();
      if (liveStatus.isClockedIn && liveStatus.clockInTimestamp) {
        const diff = Math.max(0, Math.floor((now - liveStatus.clockInTimestamp) / 1000));
        setElapsedSeconds(diff);
      } else {
        setElapsedSeconds(0);
      }

      if (liveStatus.isOnBreak && liveStatus.breakStartTimestamp) {
        const bDiff = Math.max(0, Math.floor((now - liveStatus.breakStartTimestamp) / 1000));
        setBreakElapsedSeconds(bDiff);
      } else {
        setBreakElapsedSeconds(0);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [liveStatus]);

  // Role permissions
  const isOwner = orgUser?.role === 'owner';
  const isAdmin = isOwner || orgUser?.role === 'admin';
  const isManager = isAdmin || orgUser?.role === 'manager';
  const isEmployee = orgUser?.role === 'employee';
  const canManageOrg = isAdmin;

  // Actions
  const signInWithEmail = async (email: string, pass: string) => {
    setIsDemoMode(false);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithOrg = async (orgName: string, fullName: string, email: string, pass: string) => {
    setIsDemoMode(false);
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;

    const newOrgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('current_org_id', newOrgId);

    const newOrg: Organization = {
      id: newOrgId,
      name: orgName.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
      createdAt: Date.now(),
      overtimeRules: { dailyHours: 8, weeklyHours: 40, rateMultiplier: 1.5 },
      requirePhoto: true,
      requireLocation: true,
    };

    const newOwner: OrgUser = {
      id: uid,
      organizationId: newOrgId,
      role: 'owner',
      fullName: fullName.trim(),
      email: email.trim(),
      createdAt: Date.now(),
      assignedJobIds: [],
      consentAcceptedAt: Date.now(),
      isActive: true,
      hourlyRate: 50,
    };

    // Save to Firestore
    await setDoc(doc(db, 'organizations', newOrgId), newOrg);
    await setDoc(doc(db, 'organizations', newOrgId, 'users', uid), newOwner);

    setOrganization(newOrg);
    setOrgUser(newOwner);
  };

  const signOut = async () => {
    if (firebaseUser) {
      await fbSignOut(auth);
    }
    setFirebaseUser(null);
    setOrgUser(null);
    setOrganization(null);
    setJobs([]);
    setPunches([]);
  };

  const loginAsDemoUser = (userId: string) => {
    setIsDemoMode(true);
    const targetUser = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
    setOrgUser(targetUser);
    setOrganization(DEMO_ORGANIZATION);
    setJobs(DEMO_JOBS);
  };

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      setOrgUser(DEMO_USERS[2]); // Alex Rivera
      setOrganization(DEMO_ORGANIZATION);
      setJobs(DEMO_JOBS);
      setPunches(generateDemoPunches());
    }
  };

  const acceptConsent = async () => {
    if (!orgUser) return;
    const now = Date.now();
    const updatedUser = { ...orgUser, consentAcceptedAt: now };
    setOrgUser(updatedUser);

    if (!isDemoMode && organization?.id) {
      try {
        await updateDoc(doc(db, 'organizations', organization.id, 'users', orgUser.id), {
          consentAcceptedAt: now,
        });
      } catch (err) {
        console.warn('Error updating consent timestamp:', err);
      }
    }
  };

  const recordPunch = async ({
    jobId,
    type,
    breakType,
    latitude,
    longitude,
    gpsAccuracyMeters,
    photoDataUri,
    notes,
  }: {
    jobId: string;
    type: PunchType;
    breakType?: BreakType;
    latitude?: number;
    longitude?: number;
    gpsAccuracyMeters?: number;
    photoDataUri?: string;
    notes?: string;
  }) => {
    if (!orgUser || !organization) {
      return { success: false, error: 'User or Organization not initialized' };
    }

    const job = jobs.find((j) => j.id === jobId);
    const jobName = job?.name || 'Selected Job Site';

    // Calculate distance from job
    let distanceFromJobMeters: number | undefined = undefined;
    if (job && latitude !== undefined && longitude !== undefined && job.latitude && job.longitude) {
      distanceFromJobMeters = calculateDistanceInMeters(
        latitude,
        longitude,
        job.latitude,
        job.longitude
      );
    }

    const punchTimestamp = Date.now();

    const punchData: Omit<Punch, 'id'> = {
      organizationId: organization.id,
      userId: orgUser.id,
      userEmail: orgUser.email,
      userName: orgUser.fullName,
      jobId,
      jobName,
      type,
      breakType,
      timestamp: punchTimestamp,
      latitude,
      longitude,
      gpsAccuracyMeters,
      distanceFromJobMeters,
      notes,
    };

    // If offline or in demo mode or network down
    if (!navigator.onLine || !isOnline) {
      // Queue offline in IndexedDB
      const queued = await enqueueOfflinePunch(punchData, photoDataUri);
      // Also update local punches state so employee sees their active clock status immediately!
      const localPunch: Punch = {
        ...punchData,
        id: queued.queueId,
        photoUrl: photoDataUri,
        createdOffline: true,
        syncStatus: 'pending',
      };
      setPunches((prev) => [localPunch, ...prev]);
      return { success: true, punch: localPunch, queuedOffline: true };
    }

    if (isDemoMode) {
      // In demo mode, record into local state + firestore if configured
      const demoPunch: Punch = {
        ...punchData,
        id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        photoUrl: photoDataUri || orgUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
        syncedAt: Date.now(),
        createdOffline: false,
        syncStatus: 'synced',
      };
      setPunches((prev) => [demoPunch, ...prev]);
      return { success: true, punch: demoPunch };
    }

    // Real Firebase write
    try {
      let finalPhotoUrl = photoDataUri;
      if (photoDataUri && photoDataUri.startsWith('data:image')) {
        try {
          const photoStorageRef = ref(
            storage,
            `organizations/${organization.id}/punches/${orgUser.id}/${punchTimestamp}_${type}.jpg`
          );
          await uploadString(photoStorageRef, photoDataUri, 'data_url');
          finalPhotoUrl = await getDownloadURL(photoStorageRef);
        } catch (sErr) {
          console.warn('Storage upload warning:', sErr);
        }
      }

      const punchesRef = collection(db, 'organizations', organization.id, 'punches');
      const docRef = await addDoc(punchesRef, {
        ...punchData,
        photoUrl: finalPhotoUrl || null,
        syncedAt: Date.now(),
        createdOffline: false,
        syncStatus: 'synced',
      });

      const newPunch: Punch = {
        ...punchData,
        id: docRef.id,
        photoUrl: finalPhotoUrl,
        syncedAt: Date.now(),
        createdOffline: false,
        syncStatus: 'synced',
      };

      return { success: true, punch: newPunch };
    } catch (err: any) {
      console.warn('Firebase write failed, queuing offline punch:', err);
      const queued = await enqueueOfflinePunch(punchData, photoDataUri);
      const localPunch: Punch = {
        ...punchData,
        id: queued.queueId,
        photoUrl: photoDataUri,
        createdOffline: true,
        syncStatus: 'pending',
      };
      setPunches((prev) => [localPunch, ...prev]);
      return { success: true, punch: localPunch, queuedOffline: true };
    }
  };

  const createJob = async (jobInput: Omit<Job, 'id' | 'organizationId' | 'createdAt'>) => {
    if (!organization) return;
    const newJob: Job = {
      ...jobInput,
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: organization.id,
      createdAt: Date.now(),
    };

    if (isDemoMode) {
      setJobs((prev) => [newJob, ...prev]);
      return;
    }

    const jobDocRef = doc(db, 'organizations', organization.id, 'jobs', newJob.id);
    await setDoc(jobDocRef, newJob);
  };

  const updateJob = async (jobId: string, updates: Partial<Job>) => {
    if (!organization) return;
    if (isDemoMode) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j)));
      return;
    }

    const jobDocRef = doc(db, 'organizations', organization.id, 'jobs', jobId);
    await updateDoc(jobDocRef, updates);
  };

  const addEmployee = async (empData: {
    fullName: string;
    email: string;
    role: UserRole;
    assignedJobIds: string[];
    hourlyRate?: number;
    phone?: string;
  }) => {
    if (!organization) return;
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEmp: OrgUser = {
      id: newUserId,
      organizationId: organization.id,
      role: empData.role,
      fullName: empData.fullName.trim(),
      email: empData.email.trim().toLowerCase(),
      phone: empData.phone,
      createdAt: Date.now(),
      assignedJobIds: empData.assignedJobIds,
      hourlyRate: empData.hourlyRate || 25,
      isActive: true,
      consentAcceptedAt: null,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(empData.fullName)}`,
    };

    if (isDemoMode) {
      DEMO_USERS.push(newEmp);
      return;
    }

    const userDocRef = doc(db, 'organizations', organization.id, 'users', newUserId);
    await setDoc(userDocRef, newEmp);
  };

  const updateEmployee = async (userId: string, updates: Partial<OrgUser>) => {
    if (!organization) return;
    if (isDemoMode) {
      const idx = DEMO_USERS.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        DEMO_USERS[idx] = { ...DEMO_USERS[idx], ...updates };
      }
      if (orgUser?.id === userId) {
        setOrgUser((prev) => (prev ? { ...prev, ...updates } : null));
      }
      return;
    }

    const userDocRef = doc(db, 'organizations', organization.id, 'users', userId);
    await updateDoc(userDocRef, updates);
    if (orgUser?.id === userId) {
      setOrgUser((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const updateOrgSettings = async (updates: Partial<Organization>) => {
    if (!organization) return;
    const updated = { ...organization, ...updates };
    setOrganization(updated);

    if (!isDemoMode) {
      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, updates);
    }
  };

  const seedDemoDatabase = async () => {
    return await seedDemoDataToFirestore();
  };

  const triggerManualSync = async () => {
    if (!organization?.id) return { synced: 0, failed: 0 };
    return await syncOfflinePunches(organization.id);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        orgUser,
        organization,
        jobs,
        punches,
        loading,
        isDemoMode,
        pendingOfflineCount,
        pendingOfflinePunches: pendingOfflineCount,
        isOnline,
        hasConsent: Boolean(orgUser?.consentAcceptedAt),

        isClockedIn: liveStatus.isClockedIn,
        isOnBreak: liveStatus.isOnBreak,
        activeJob: liveStatus.activeJob,
        activeClockInPunch: liveStatus.activeClockInPunch,
        activeBreakStartPunch: liveStatus.activeBreakStartPunch,
        elapsedSeconds,
        breakElapsedSeconds,

        isOwner,
        isAdmin,
        isManager,
        isManagerOrAbove: isManager,
        isEmployee,
        canManageOrg,

        signInWithEmail,
        signUpWithOrg,
        signOut,
        loginAsDemoUser,
        toggleDemoMode,
        acceptConsent,
        recordPunch,

        createJob,
        updateJob,
        addEmployee,
        updateEmployee,
        updateOrgSettings,
        seedDemoDatabase,
        triggerManualSync,
        syncOfflinePunches: triggerManualSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
