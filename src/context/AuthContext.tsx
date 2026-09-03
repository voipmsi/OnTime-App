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

// LocalStorage Keys for persistent storage
const LS_ORG_KEY = 'workpulse_persisted_org';
const LS_JOBS_KEY = 'workpulse_persisted_jobs';
const LS_TEAM_KEY = 'workpulse_persisted_team';
const LS_PUNCHES_KEY = 'workpulse_persisted_punches';
const LS_ACTIVE_USER_ID_KEY = 'workpulse_active_user_id';
const LS_SAVED_ORGS_LIST_KEY = 'workpulse_saved_orgs_list';

interface AuthContextValue {
  firebaseUser: User | null;
  orgUser: OrgUser | null;
  organization: Organization | null;
  jobs: Job[];
  punches: Punch[];
  teamMembers: OrgUser[];
  savedOrganizations: Organization[];
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
  addEmployee: (employee: {
    fullName: string;
    email: string;
    role: UserRole;
    assignedJobIds: string[];
    hourlyRate?: number;
    phone?: string;
    isActive?: boolean;
  }) => Promise<void>;
  updateEmployee: (userId: string, updates: Partial<OrgUser>) => Promise<void>;
  updateOrgSettings: (updates: Partial<Organization>) => Promise<void>;
  switchOrganization: (orgId: string) => void;
  resetToDefaultDemoData: () => void;
  seedDemoDatabase: () => Promise<{ success: boolean; message: string }>;
  triggerManualSync: () => Promise<{ synced: number; failed: number }>;
  syncOfflinePunches: () => Promise<{ synced: number; failed: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Safe LocalStorage read helper
function getStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Initialize state from LocalStorage so data NEVER disappears on reload
  const [organization, setOrganization] = useState<Organization | null>(() => {
    return getStoredJson<Organization>(LS_ORG_KEY, DEMO_ORGANIZATION);
  });

  const [teamMembers, setTeamMembers] = useState<OrgUser[]>(() => {
    const stored = getStoredJson<OrgUser[]>(LS_TEAM_KEY, []);
    if (stored && stored.length > 0) return stored;
    return [...DEMO_USERS];
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const stored = getStoredJson<Job[]>(LS_JOBS_KEY, []);
    if (stored && stored.length > 0) return stored;
    return [...DEMO_JOBS];
  });

  const [punches, setPunches] = useState<Punch[]>(() => {
    const stored = getStoredJson<Punch[]>(LS_PUNCHES_KEY, []);
    if (stored && stored.length > 0) return stored;
    return generateDemoPunches();
  });

  const [savedOrganizations, setSavedOrganizations] = useState<Organization[]>(() => {
    const list = getStoredJson<Organization[]>(LS_SAVED_ORGS_LIST_KEY, []);
    if (!list.find((o) => o.id === DEMO_ORG_ID)) {
      list.unshift(DEMO_ORGANIZATION);
    }
    return list;
  });

  const [orgUser, setOrgUser] = useState<OrgUser | null>(() => {
    const savedUserId = localStorage.getItem(LS_ACTIVE_USER_ID_KEY);
    const initialTeam = getStoredJson<OrgUser[]>(LS_TEAM_KEY, DEMO_USERS);
    if (savedUserId) {
      const match = initialTeam.find((u) => u.id === savedUserId);
      if (match) return match;
    }
    // Default to Alex Rivera or first admin
    return initialTeam.find((u) => u.role === 'owner' || u.role === 'admin') || initialTeam[0] || DEMO_USERS[2];
  });

  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // -----------------------------------------------------------------
  // AUTO-PERSIST TO LOCALSTORAGE
  // -----------------------------------------------------------------
  useEffect(() => {
    if (organization) {
      try {
        localStorage.setItem(LS_ORG_KEY, JSON.stringify(organization));
        localStorage.setItem('current_org_id', organization.id);
        // Also update saved org list
        setSavedOrganizations((prev) => {
          const exists = prev.find((o) => o.id === organization.id);
          const updated = exists
            ? prev.map((o) => (o.id === organization.id ? organization : o))
            : [organization, ...prev];
          localStorage.setItem(LS_SAVED_ORGS_LIST_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.warn('LocalStorage save org error:', err);
      }
    }
  }, [organization]);

  useEffect(() => {
    if (teamMembers && teamMembers.length > 0) {
      try {
        localStorage.setItem(LS_TEAM_KEY, JSON.stringify(teamMembers));
      } catch (err) {
        console.warn('LocalStorage save team error:', err);
      }
    }
  }, [teamMembers]);

  useEffect(() => {
    if (jobs && jobs.length > 0) {
      try {
        localStorage.setItem(LS_JOBS_KEY, JSON.stringify(jobs));
      } catch (err) {
        console.warn('LocalStorage save jobs error:', err);
      }
    }
  }, [jobs]);

  useEffect(() => {
    if (punches) {
      try {
        localStorage.setItem(LS_PUNCHES_KEY, JSON.stringify(punches));
      } catch (err) {
        console.warn('LocalStorage save punches error:', err);
      }
    }
  }, [punches]);

  useEffect(() => {
    if (orgUser) {
      try {
        localStorage.setItem(LS_ACTIVE_USER_ID_KEY, orgUser.id);
      } catch (err) {
        console.warn('LocalStorage save active user id error:', err);
      }
    }
  }, [orgUser]);

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

  // Real Firebase Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoMode(false);
        setLoading(true);

        try {
          const savedOrgId = localStorage.getItem('current_org_id') || organization?.id || DEMO_ORG_ID;

          const userDocRef = doc(db, 'organizations', savedOrgId, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const uData = userSnap.data() as OrgUser;
            setOrgUser(uData);

            const orgDocRef = doc(db, 'organizations', savedOrgId);
            const orgSnap = await getDoc(orgDocRef);
            if (orgSnap.exists()) {
              setOrganization(orgSnap.data() as Organization);
            }
          } else {
            const defaultUser: OrgUser = {
              id: fbUser.uid,
              organizationId: savedOrgId,
              role: 'owner',
              fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              email: fbUser.email || '',
              createdAt: Date.now(),
              assignedJobIds: [],
              isActive: true,
              consentAcceptedAt: Date.now(),
            };
            setOrgUser(defaultUser);
          }
        } catch (e) {
          console.warn('Error fetching user profile:', e);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore real-time jobs, punches & users when in Firebase Auth mode
  useEffect(() => {
    if (!organization?.id || isDemoMode) return;

    const usersRef = collection(db, 'organizations', organization.id, 'users');
    const unsubUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const uList: OrgUser[] = [];
        snapshot.forEach((d) => {
          uList.push({ id: d.id, ...d.data() } as OrgUser);
        });
        if (uList.length > 0) setTeamMembers(uList);
      },
      (err) => console.warn('Firestore users listener:', err)
    );

    const jobsRef = collection(db, 'organizations', organization.id, 'jobs');
    const unsubJobs = onSnapshot(
      jobsRef,
      (snapshot) => {
        const jList: Job[] = [];
        snapshot.forEach((d) => {
          jList.push({ id: d.id, ...d.data() } as Job);
        });
        if (jList.length > 0) setJobs(jList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      },
      (err) => console.warn('Firestore jobs listener:', err)
    );

    const punchesRef = collection(db, 'organizations', organization.id, 'punches');
    const punchesQuery = query(punchesRef, orderBy('timestamp', 'desc'));
    const unsubPunches = onSnapshot(
      punchesQuery,
      (snapshot) => {
        const pList: Punch[] = [];
        snapshot.forEach((d) => {
          pList.push({ id: d.id, ...d.data() } as Punch);
        });
        if (pList.length > 0) setPunches(pList);
      },
      (err) => console.warn('Firestore punches listener:', err)
    );

    return () => {
      unsubUsers();
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

    const currentJob =
      jobs.find((j) => j.id === activeJobId) ||
      (activeClockInPunch
        ? {
            id: activeClockInPunch.jobId,
            organizationId: organization?.id || '',
            name: activeClockInPunch.jobName,
            address: '',
            latitude: activeClockInPunch.latitude || 0,
            longitude: activeClockInPunch.longitude || 0,
            isActive: true,
          }
        : null);

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

  // Live timer interval ticker
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
    let uid = `user_${Date.now()}`;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      uid = userCredential.user.uid;
    } catch (authErr: any) {
      console.warn('Firebase Auth signup warning (proceeding with local persistent store):', authErr);
    }

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
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName.trim())}`,
    };

    // Save to LocalStorage immediately
    localStorage.setItem(LS_ORG_KEY, JSON.stringify(newOrg));
    localStorage.setItem(LS_ACTIVE_USER_ID_KEY, uid);
    localStorage.setItem(LS_TEAM_KEY, JSON.stringify([newOwner]));

    setOrganization(newOrg);
    setOrgUser(newOwner);
    setTeamMembers([newOwner]);

    // Save to Firestore if available
    try {
      await setDoc(doc(db, 'organizations', newOrgId), newOrg);
      await setDoc(doc(db, 'organizations', newOrgId, 'users', uid), newOwner);
    } catch (fsErr) {
      console.warn('Firestore write warning:', fsErr);
    }
  };

  const signOut = async () => {
    if (firebaseUser) {
      await fbSignOut(auth);
    }
    setFirebaseUser(null);
  };

  const loginAsDemoUser = (userId: string) => {
    const targetUser =
      teamMembers.find((u) => u.id === userId) ||
      DEMO_USERS.find((u) => u.id === userId) ||
      teamMembers[0] ||
      DEMO_USERS[0];
    setOrgUser(targetUser);
    localStorage.setItem(LS_ACTIVE_USER_ID_KEY, targetUser.id);
  };

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
  };

  const acceptConsent = async () => {
    if (!orgUser) return;
    const now = Date.now();
    const updatedUser = { ...orgUser, consentAcceptedAt: now };
    setOrgUser(updatedUser);
    setTeamMembers((prev) => prev.map((u) => (u.id === orgUser.id ? updatedUser : u)));

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
    if (!orgUser) throw new Error('User must be logged in to record punch');

    const job = jobs.find((j) => j.id === jobId);
    let distanceMeters: number | null = null;
    let withinGeofence = true;

    if (latitude && longitude && job && job.latitude && job.longitude) {
      distanceMeters = calculateDistanceInMeters(latitude, longitude, job.latitude, job.longitude);
      const radius = job.geofenceRadiusMeters || organization?.defaultGeofenceRadiusMeters || 150;
      withinGeofence = distanceMeters <= radius;
    }

    const punchData: Omit<Punch, 'id'> = {
      organizationId: organization?.id || DEMO_ORG_ID,
      userId: orgUser.id,
      userEmail: orgUser.email || '',
      userName: orgUser.fullName,
      jobId,
      jobName: job?.name || 'General Job Site',
      type,
      breakType: breakType || null,
      timestamp: Date.now(),
      latitude: latitude || null,
      longitude: longitude || null,
      gpsAccuracyMeters: gpsAccuracyMeters || null,
      withinGeofence,
      distanceFromJobMeters: distanceMeters,
      photoUrl: photoDataUri || null,
      notes: notes || null,
      syncedAt: Date.now(),
      createdOffline: !isOnline,
      syncStatus: 'synced',
    };

    // Save locally to state & LocalStorage
    const localPunch: Punch = {
      ...punchData,
      id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setPunches((prev) => [localPunch, ...prev]);

    // If online & Firebase configured, upload to Firestore
    if (isOnline && organization?.id && !isDemoMode) {
      try {
        const punchesRef = collection(db, 'organizations', organization.id, 'punches');
        await addDoc(punchesRef, punchData);
      } catch (err) {
        console.warn('Firestore write punch failed:', err);
      }
    }

    return { success: true, punch: localPunch };
  };

  const createJob = async (jobInput: Omit<Job, 'id' | 'organizationId' | 'createdAt'>) => {
    if (!organization) return;
    const newJob: Job = {
      ...jobInput,
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: organization.id,
      createdAt: Date.now(),
    };

    setJobs((prev) => [newJob, ...prev]);

    if (!isDemoMode) {
      try {
        const jobDocRef = doc(db, 'organizations', organization.id, 'jobs', newJob.id);
        await setDoc(jobDocRef, newJob);
      } catch (err) {
        console.warn('Firestore write job failed:', err);
      }
    }
  };

  const updateJob = async (jobId: string, updates: Partial<Job>) => {
    if (!organization) return;
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j)));

    if (!isDemoMode) {
      try {
        const jobDocRef = doc(db, 'organizations', organization.id, 'jobs', jobId);
        await updateDoc(jobDocRef, updates);
      } catch (err) {
        console.warn('Firestore update job failed:', err);
      }
    }
  };

  const addEmployee = async (empData: {
    fullName: string;
    email: string;
    role: UserRole;
    assignedJobIds: string[];
    hourlyRate?: number;
    phone?: string;
    isActive?: boolean;
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
      isActive: empData.isActive !== undefined ? empData.isActive : true,
      consentAcceptedAt: null,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(empData.fullName)}`,
    };

    setTeamMembers((prev) => [newEmp, ...prev]);

    if (!isDemoMode) {
      try {
        const userDocRef = doc(db, 'organizations', organization.id, 'users', newUserId);
        await setDoc(userDocRef, newEmp);
      } catch (err) {
        console.warn('Firestore add employee failed:', err);
      }
    }
  };

  const updateEmployee = async (userId: string, updates: Partial<OrgUser>) => {
    if (!organization) return;
    setTeamMembers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    if (orgUser?.id === userId) {
      setOrgUser((prev) => (prev ? { ...prev, ...updates } : null));
    }

    if (!isDemoMode) {
      try {
        const userDocRef = doc(db, 'organizations', organization.id, 'users', userId);
        await updateDoc(userDocRef, updates);
      } catch (err) {
        console.warn('Firestore update employee failed:', err);
      }
    }
  };

  const updateOrgSettings = async (updates: Partial<Organization>) => {
    if (!organization) return;
    const updated = { ...organization, ...updates };
    setOrganization(updated);

    if (!isDemoMode) {
      try {
        const orgRef = doc(db, 'organizations', organization.id);
        await updateDoc(orgRef, updates);
      } catch (err) {
        console.warn('Firestore update org failed:', err);
      }
    }
  };

  const switchOrganization = (orgId: string) => {
    const target = savedOrganizations.find((o) => o.id === orgId);
    if (target) {
      setOrganization(target);
      localStorage.setItem(LS_ORG_KEY, JSON.stringify(target));
      localStorage.setItem('current_org_id', target.id);
    }
  };

  const resetToDefaultDemoData = () => {
    localStorage.removeItem(LS_ORG_KEY);
    localStorage.removeItem(LS_JOBS_KEY);
    localStorage.removeItem(LS_TEAM_KEY);
    localStorage.removeItem(LS_PUNCHES_KEY);
    localStorage.removeItem(LS_ACTIVE_USER_ID_KEY);

    setOrganization(DEMO_ORGANIZATION);
    setJobs([...DEMO_JOBS]);
    setTeamMembers([...DEMO_USERS]);
    setPunches(generateDemoPunches());
    setOrgUser(DEMO_USERS[2]);
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
        teamMembers,
        savedOrganizations,
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
        switchOrganization,
        resetToDefaultDemoData,
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
