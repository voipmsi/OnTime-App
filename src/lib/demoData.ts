import { Organization, OrgUser, Job, Punch } from '../types';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

export const DEMO_ORG_ID = 'org_apex_field_services';

export const DEMO_ORGANIZATION: Organization = {
  id: DEMO_ORG_ID,
  name: 'Apex Field Services & Construction',
  timezone: 'America/Los_Angeles',
  createdAt: Date.now() - 30 * 86400000,
  overtimeRules: {
    dailyHours: 8,
    weeklyHours: 40,
    rateMultiplier: 1.5,
  },
  requirePhoto: true,
  requireLocation: true,
};

export const DEMO_JOBS: Job[] = [
  {
    id: 'job_downtown_plaza',
    organizationId: DEMO_ORG_ID,
    name: 'Downtown Commercial Plaza (Phase 2)',
    address: '450 Mission St, San Francisco, CA 94105',
    latitude: 37.7909,
    longitude: -122.3988,
    geofenceRadiusMeters: 250,
    isActive: true,
    clientName: 'Skyline Urban Development',
    notes: 'Access via south freight elevator. PPE hard hat required on 3rd floor.',
    createdAt: Date.now() - 25 * 86400000,
  },
  {
    id: 'job_substation_b12',
    organizationId: DEMO_ORG_ID,
    name: 'West Grid Substation B-12',
    address: '1820 Shoreline Blvd, Mountain View, CA 94043',
    latitude: 37.4220,
    longitude: -122.0841,
    geofenceRadiusMeters: 300,
    isActive: true,
    clientName: 'Pacific Electric & Power',
    notes: 'Check-in with site security gate prior to vehicle entry.',
    createdAt: Date.now() - 20 * 86400000,
  },
  {
    id: 'job_north_logistics',
    organizationId: DEMO_ORG_ID,
    name: 'North Harbor Logistics Warehouse 4',
    address: '1000 Maritime St, Oakland, CA 94607',
    latitude: 37.8105,
    longitude: -122.3025,
    geofenceRadiusMeters: 400,
    isActive: true,
    clientName: 'Pacific Rim Freight Logistics',
    notes: 'Dock bays 14 through 28 electrical retrofit.',
    createdAt: Date.now() - 15 * 86400000,
  },
  {
    id: 'job_sunflower_residential',
    organizationId: DEMO_ORG_ID,
    name: 'Sunflower Valley Estates',
    address: '2200 Elm Street, San Jose, CA 95126',
    latitude: 37.3382,
    longitude: -121.8863,
    geofenceRadiusMeters: 150,
    isActive: false, // Inactive / completed job for demo
    clientName: 'Crestline Residential Builders',
    notes: 'Job completed last month. Archived.',
    createdAt: Date.now() - 60 * 86400000,
  },
];

export const DEMO_USERS: OrgUser[] = [
  {
    id: 'user_sarah_chen',
    organizationId: DEMO_ORG_ID,
    role: 'owner',
    fullName: 'Sarah Chen',
    email: 'sarah.chen@apexfield.com',
    phone: '(415) 555-0192',
    createdAt: Date.now() - 30 * 86400000,
    assignedJobIds: ['job_downtown_plaza', 'job_substation_b12', 'job_north_logistics'],
    consentAcceptedAt: Date.now() - 30 * 86400000,
    hourlyRate: 55,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'user_marcus_vance',
    organizationId: DEMO_ORG_ID,
    role: 'manager',
    fullName: 'Marcus Vance',
    email: 'marcus.vance@apexfield.com',
    phone: '(415) 555-0143',
    createdAt: Date.now() - 25 * 86400000,
    assignedJobIds: ['job_downtown_plaza', 'job_substation_b12'],
    consentAcceptedAt: Date.now() - 25 * 86400000,
    hourlyRate: 42,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'user_alex_rivera',
    organizationId: DEMO_ORG_ID,
    role: 'employee',
    fullName: 'Alex Rivera',
    email: 'alex.rivera@apexfield.com',
    phone: '(510) 555-0188',
    createdAt: Date.now() - 20 * 86400000,
    assignedJobIds: ['job_downtown_plaza', 'job_substation_b12', 'job_north_logistics'],
    consentAcceptedAt: Date.now() - 20 * 86400000,
    hourlyRate: 34,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'user_jordan_taylor',
    organizationId: DEMO_ORG_ID,
    role: 'employee',
    fullName: 'Jordan Taylor',
    email: 'jordan.taylor@apexfield.com',
    phone: '(408) 555-0177',
    createdAt: Date.now() - 15 * 86400000,
    assignedJobIds: ['job_downtown_plaza'],
    consentAcceptedAt: Date.now() - 15 * 86400000,
    hourlyRate: 28,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80',
  },
];

// Helper to generate realistic sample punches across recent days
export function generateDemoPunches(): Punch[] {
  const punches: Punch[] = [];
  const now = Date.now();
  const dayMs = 86400000;

  // Day -2 for Alex Rivera (Complete shift with 1 hour Overtime: 9 hours worked + 30m unpaid meal break)
  const day2ClockIn = now - 2 * dayMs - 9.5 * 3600000;
  const day2BreakStart = day2ClockIn + 4 * 3600000;
  const day2BreakEnd = day2BreakStart + 30 * 60000;
  const day2ClockOut = day2ClockIn + 9.5 * 3600000;

  punches.push(
    {
      id: 'demo_punch_alex_d2_in',
      organizationId: DEMO_ORG_ID,
      userId: 'user_alex_rivera',
      userName: 'Alex Rivera',
      userEmail: 'alex.rivera@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'clock_in',
      timestamp: day2ClockIn,
      latitude: 37.7909,
      longitude: -122.3988,
      gpsAccuracyMeters: 6,
      distanceFromJobMeters: 14,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day2ClockIn + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_alex_d2_bstart',
      organizationId: DEMO_ORG_ID,
      userId: 'user_alex_rivera',
      userName: 'Alex Rivera',
      userEmail: 'alex.rivera@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'break_start',
      breakType: 'unpaid',
      timestamp: day2BreakStart,
      latitude: 37.7908,
      longitude: -122.3987,
      gpsAccuracyMeters: 8,
      distanceFromJobMeters: 22,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day2BreakStart + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_alex_d2_bend',
      organizationId: DEMO_ORG_ID,
      userId: 'user_alex_rivera',
      userName: 'Alex Rivera',
      userEmail: 'alex.rivera@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'break_end',
      breakType: 'unpaid',
      timestamp: day2BreakEnd,
      latitude: 37.7909,
      longitude: -122.3988,
      gpsAccuracyMeters: 5,
      distanceFromJobMeters: 15,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day2BreakEnd + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_alex_d2_out',
      organizationId: DEMO_ORG_ID,
      userId: 'user_alex_rivera',
      userName: 'Alex Rivera',
      userEmail: 'alex.rivera@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'clock_out',
      timestamp: day2ClockOut,
      latitude: 37.7911,
      longitude: -122.3986,
      gpsAccuracyMeters: 7,
      distanceFromJobMeters: 28,
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day2ClockOut + 500,
      createdOffline: false,
    }
  );

  // Day -1 for Jordan Taylor (Complete shift: 8 hours worked)
  const day1ClockIn = now - 1 * dayMs - 8.5 * 3600000;
  const day1BreakStart = day1ClockIn + 3.5 * 3600000;
  const day1BreakEnd = day1BreakStart + 30 * 60000;
  const day1ClockOut = day1ClockIn + 8.5 * 3600000;

  punches.push(
    {
      id: 'demo_punch_jordan_d1_in',
      organizationId: DEMO_ORG_ID,
      userId: 'user_jordan_taylor',
      userName: 'Jordan Taylor',
      userEmail: 'jordan.taylor@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'clock_in',
      timestamp: day1ClockIn,
      latitude: 37.7909,
      longitude: -122.3988,
      gpsAccuracyMeters: 9,
      distanceFromJobMeters: 18,
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day1ClockIn + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_jordan_d1_bstart',
      organizationId: DEMO_ORG_ID,
      userId: 'user_jordan_taylor',
      userName: 'Jordan Taylor',
      userEmail: 'jordan.taylor@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'break_start',
      breakType: 'unpaid',
      timestamp: day1BreakStart,
      latitude: 37.7910,
      longitude: -122.3989,
      gpsAccuracyMeters: 8,
      distanceFromJobMeters: 20,
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day1BreakStart + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_jordan_d1_bend',
      organizationId: DEMO_ORG_ID,
      userId: 'user_jordan_taylor',
      userName: 'Jordan Taylor',
      userEmail: 'jordan.taylor@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'break_end',
      breakType: 'unpaid',
      timestamp: day1BreakEnd,
      latitude: 37.7909,
      longitude: -122.3988,
      gpsAccuracyMeters: 6,
      distanceFromJobMeters: 16,
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day1BreakEnd + 500,
      createdOffline: false,
    },
    {
      id: 'demo_punch_jordan_d1_out',
      organizationId: DEMO_ORG_ID,
      userId: 'user_jordan_taylor',
      userName: 'Jordan Taylor',
      userEmail: 'jordan.taylor@apexfield.com',
      jobId: 'job_downtown_plaza',
      jobName: 'Downtown Commercial Plaza (Phase 2)',
      type: 'clock_out',
      timestamp: day1ClockOut,
      latitude: 37.7912,
      longitude: -122.3985,
      gpsAccuracyMeters: 10,
      distanceFromJobMeters: 35,
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80',
      syncedAt: day1ClockOut + 500,
      createdOffline: false,
    }
  );

  // Today: Marcus Vance currently clocked in 3.5 hours ago at Substation B-12
  const marcusTodayIn = now - 3.5 * 3600000;
  punches.push({
    id: 'demo_punch_marcus_today_in',
    organizationId: DEMO_ORG_ID,
    userId: 'user_marcus_vance',
    userName: 'Marcus Vance',
    userEmail: 'marcus.vance@apexfield.com',
    jobId: 'job_substation_b12',
    jobName: 'West Grid Substation B-12',
    type: 'clock_in',
    timestamp: marcusTodayIn,
    latitude: 37.4221,
    longitude: -122.0842,
    gpsAccuracyMeters: 6,
    distanceFromJobMeters: 12,
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&h=300&q=80',
    syncedAt: marcusTodayIn + 500,
    createdOffline: false,
  });

  // Today: Alex Rivera currently clocked in 2.2 hours ago at Downtown Plaza
  const alexTodayIn = now - 2.2 * 3600000;
  punches.push({
    id: 'demo_punch_alex_today_in',
    organizationId: DEMO_ORG_ID,
    userId: 'user_alex_rivera',
    userName: 'Alex Rivera',
    userEmail: 'alex.rivera@apexfield.com',
    jobId: 'job_downtown_plaza',
    jobName: 'Downtown Commercial Plaza (Phase 2)',
    type: 'clock_in',
    timestamp: alexTodayIn,
    latitude: 37.7909,
    longitude: -122.3988,
    gpsAccuracyMeters: 5,
    distanceFromJobMeters: 14,
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
    syncedAt: alexTodayIn + 500,
    createdOffline: false,
  });

  return punches;
}

/**
 * Seed Firestore with the Demo Organization, Jobs, Users, and Sample Punches
 */
export async function seedDemoDataToFirestore(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Set Organization Doc
    const orgRef = doc(db, 'organizations', DEMO_ORG_ID);
    await setDoc(orgRef, DEMO_ORGANIZATION, { merge: true });

    // 2. Set Users
    for (const user of DEMO_USERS) {
      const userRef = doc(db, 'organizations', DEMO_ORG_ID, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
    }

    // 3. Set Jobs
    for (const job of DEMO_JOBS) {
      const jobRef = doc(db, 'organizations', DEMO_ORG_ID, 'jobs', job.id);
      await setDoc(jobRef, job, { merge: true });
    }

    // 4. Set Punches
    const demoPunches = generateDemoPunches();
    for (const punch of demoPunches) {
      const punchRef = doc(db, 'organizations', DEMO_ORG_ID, 'punches', punch.id);
      await setDoc(punchRef, punch, { merge: true });
    }

    return {
      success: true,
      message: 'Demo organization "Apex Field Services" successfully seeded into Firestore!',
    };
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    return {
      success: false,
      message: error?.message || 'Failed to seed demo data',
    };
  }
}
