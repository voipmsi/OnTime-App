export type UserRole = 'owner' | 'admin' | 'manager' | 'employee';

export type PunchType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export type BreakType = 'paid' | 'unpaid';

export interface OvertimeRules {
  dailyHours: number; // e.g. 8
  weeklyHours: number; // e.g. 40
  rateMultiplier: number; // e.g. 1.5
}

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  createdAt: number;
  overtimeRules?: OvertimeRules;
  requirePhoto?: boolean;
  requireLocation?: boolean;
}

export interface OrgUser {
  id: string;
  organizationId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  createdAt: number;
  assignedJobIds: string[]; // List of Job IDs
  consentAcceptedAt?: number | null;
  hourlyRate?: number;
  isActive: boolean;
  avatarUrl?: string;
}

export interface Job {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number | null; // e.g. 200m (stored for review)
  isActive: boolean;
  clientName?: string;
  notes?: string;
  createdAt?: number;
}

export interface Punch {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  jobId: string;
  jobName: string;
  type: PunchType;
  breakType?: BreakType;
  timestamp: number; // Unix epoch in ms
  photoUrl?: string; // Cloud Storage URL or local data URI
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
  withinGeofence?: boolean;
  distanceFromJobMeters?: number;
  syncedAt?: number;
  createdOffline?: boolean;
  notes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface OfflineQueuedPunch extends Omit<Punch, 'id'> {
  queueId: string;
  photoBlobData?: string; // base64 representation for offline storage
  attempts: number;
  lastAttemptAt?: number;
}

export interface ShiftRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  jobId: string;
  jobName: string;
  date: string; // YYYY-MM-DD
  clockInTime: number;
  clockOutTime?: number;
  clockInPunch: Punch;
  clockOutPunch?: Punch;
  breakPunches: Punch[];
  totalBreakMinutes: number;
  unpaidBreakMinutes: number;
  paidBreakMinutes: number;
  totalWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate?: number;
  estimatedGrossPay?: number;
  isComplete: boolean;
  hasOvertime: boolean;
}

export interface LiveStatus {
  isClockedIn: boolean;
  isOnBreak: boolean;
  activeJob?: Job | null;
  lastPunch?: Punch | null;
  clockInPunch?: Punch | null;
  breakStartPunch?: Punch | null;
  clockInTimestamp?: number | null;
  breakStartTimestamp?: number | null;
}
