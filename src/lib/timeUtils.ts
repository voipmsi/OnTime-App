import { Punch, ShiftRecord, OvertimeRules } from '../types';

export const DEFAULT_OVERTIME_RULES: OvertimeRules = {
  dailyHours: 8,
  weeklyHours: 40,
  rateMultiplier: 1.5,
};

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format decimal hours (e.g. 8.5) to '8h 30m'
 */
export function formatDecimalHours(hours: number): string {
  if (!hours || isNaN(hours)) return '0h 00m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Format timestamp to nice time string (e.g. '08:45 AM')
 */
export function formatTimeOnly(timestamp: number): string {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format timestamp to date string (e.g. 'Aug 31, 2026')
 */
export function formatDateOnly(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format timestamp to full date-time string
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format currency e.g. $1,250.00
 */
export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Derives complete shifts from an array of raw punches for a user/org.
 * Pairs clock_in with corresponding clock_out, tracking all intermediate break_start/break_end punches.
 */
export function deriveShiftsFromPunches(
  punches: Punch[],
  overtimeRules: OvertimeRules = DEFAULT_OVERTIME_RULES,
  userHourlyRates: Record<string, number> = {}
): ShiftRecord[] {
  // Sort punches chronologically
  const sortedPunches = [...punches].sort((a, b) => a.timestamp - b.timestamp);

  // Group punches by user
  const punchesByUser: Record<string, Punch[]> = {};
  for (const p of sortedPunches) {
    if (!punchesByUser[p.userId]) {
      punchesByUser[p.userId] = [];
    }
    punchesByUser[p.userId].push(p);
  }

  const allShifts: ShiftRecord[] = [];

  for (const userId in punchesByUser) {
    const userPunches = punchesByUser[userId];
    let currentShift: Partial<ShiftRecord> | null = null;
    let openBreakStart: Punch | null = null;

    for (let i = 0; i < userPunches.length; i++) {
      const punch = userPunches[i];

      if (punch.type === 'clock_in') {
        // If there was a previous unclosed shift, close it implicitly at the new clock in or keep it open
        if (currentShift && currentShift.clockInPunch) {
          allShifts.push(finalizeShift(currentShift, overtimeRules, userHourlyRates[userId]));
        }

        const dateStr = new Date(punch.timestamp).toISOString().split('T')[0];
        currentShift = {
          id: `shift_${punch.id}`,
          userId: punch.userId,
          userName: punch.userName || 'Employee',
          userEmail: punch.userEmail || '',
          jobId: punch.jobId,
          jobName: punch.jobName,
          date: dateStr,
          clockInTime: punch.timestamp,
          clockInPunch: punch,
          breakPunches: [],
          totalBreakMinutes: 0,
          unpaidBreakMinutes: 0,
          paidBreakMinutes: 0,
          isComplete: false,
        };
        openBreakStart = null;
      } else if (punch.type === 'break_start') {
        if (currentShift) {
          currentShift.breakPunches = currentShift.breakPunches || [];
          currentShift.breakPunches.push(punch);
          openBreakStart = punch;
        }
      } else if (punch.type === 'break_end') {
        if (currentShift) {
          currentShift.breakPunches = currentShift.breakPunches || [];
          currentShift.breakPunches.push(punch);
          if (openBreakStart) {
            const breakDurationMin = (punch.timestamp - openBreakStart.timestamp) / (1000 * 60);
            if (openBreakStart.breakType === 'unpaid' || punch.breakType === 'unpaid') {
              currentShift.unpaidBreakMinutes = (currentShift.unpaidBreakMinutes || 0) + breakDurationMin;
            } else {
              currentShift.paidBreakMinutes = (currentShift.paidBreakMinutes || 0) + breakDurationMin;
            }
            currentShift.totalBreakMinutes = (currentShift.totalBreakMinutes || 0) + breakDurationMin;
            openBreakStart = null;
          }
        }
      } else if (punch.type === 'clock_out') {
        if (currentShift) {
          // If a break was left open at clock out, count it
          if (openBreakStart) {
            const breakDurationMin = (punch.timestamp - openBreakStart.timestamp) / (1000 * 60);
            if (openBreakStart.breakType === 'unpaid') {
              currentShift.unpaidBreakMinutes = (currentShift.unpaidBreakMinutes || 0) + breakDurationMin;
            } else {
              currentShift.paidBreakMinutes = (currentShift.paidBreakMinutes || 0) + breakDurationMin;
            }
            currentShift.totalBreakMinutes = (currentShift.totalBreakMinutes || 0) + breakDurationMin;
            openBreakStart = null;
          }
          currentShift.clockOutTime = punch.timestamp;
          currentShift.clockOutPunch = punch;
          currentShift.isComplete = true;
          allShifts.push(finalizeShift(currentShift, overtimeRules, userHourlyRates[userId]));
          currentShift = null;
        }
      }
    }

    // If an active shift is still open
    if (currentShift && currentShift.clockInPunch) {
      allShifts.push(finalizeShift(currentShift, overtimeRules, userHourlyRates[userId]));
    }
  }

  // Sort shifts newest first
  return allShifts.sort((a, b) => b.clockInTime - a.clockInTime);
}

function finalizeShift(
  rawShift: Partial<ShiftRecord>,
  rules: OvertimeRules,
  hourlyRate: number = 25
): ShiftRecord {
  const endTime = rawShift.clockOutTime || Date.now();
  const rawElapsedHours = Math.max(0, (endTime - (rawShift.clockInTime || 0)) / (1000 * 3600));
  const unpaidBreakHours = (rawShift.unpaidBreakMinutes || 0) / 60;
  const totalWorkedHours = Math.max(0, rawElapsedHours - unpaidBreakHours);

  // Daily overtime calculation
  const dailyThreshold = rules.dailyHours || 8;
  const regularHours = Math.min(totalWorkedHours, dailyThreshold);
  const overtimeHours = Math.max(0, totalWorkedHours - dailyThreshold);

  const rate = rawShift.hourlyRate || hourlyRate || 25;
  const otRate = rate * (rules.rateMultiplier || 1.5);
  const estimatedGrossPay = regularHours * rate + overtimeHours * otRate;

  return {
    id: rawShift.id || `shift_${Date.now()}`,
    userId: rawShift.userId || '',
    userName: rawShift.userName || 'Employee',
    userEmail: rawShift.userEmail || '',
    jobId: rawShift.jobId || '',
    jobName: rawShift.jobName || 'Unknown Job',
    date: rawShift.date || new Date(rawShift.clockInTime || Date.now()).toISOString().split('T')[0],
    clockInTime: rawShift.clockInTime || Date.now(),
    clockOutTime: rawShift.clockOutTime,
    clockInPunch: rawShift.clockInPunch!,
    clockOutPunch: rawShift.clockOutPunch,
    breakPunches: rawShift.breakPunches || [],
    totalBreakMinutes: Math.round(rawShift.totalBreakMinutes || 0),
    unpaidBreakMinutes: Math.round(rawShift.unpaidBreakMinutes || 0),
    paidBreakMinutes: Math.round(rawShift.paidBreakMinutes || 0),
    totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
    regularHours: parseFloat(regularHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    hourlyRate: rate,
    estimatedGrossPay: parseFloat(estimatedGrossPay.toFixed(2)),
    isComplete: !!rawShift.isComplete,
    hasOvertime: overtimeHours > 0,
  };
}

/**
 * Generate CSV string for export
 */
export function generateTimesheetCSV(shifts: ShiftRecord[]): string {
  const headers = [
    'Employee Name',
    'Employee Email',
    'Date',
    'Job Site',
    'Clock In',
    'Clock Out',
    'Status',
    'Unpaid Break (min)',
    'Paid Break (min)',
    'Regular Hours',
    'Overtime Hours',
    'Total Worked Hours',
    'Hourly Rate ($)',
    'Estimated Gross Pay ($)',
  ];

  const rows = shifts.map((s) => [
    `"${s.userName.replace(/"/g, '""')}"`,
    `"${s.userEmail.replace(/"/g, '""')}"`,
    s.date,
    `"${s.jobName.replace(/"/g, '""')}"`,
    formatTimeOnly(s.clockInTime),
    s.clockOutTime ? formatTimeOnly(s.clockOutTime) : 'Still Active',
    s.isComplete ? 'Completed' : 'In Progress',
    s.unpaidBreakMinutes.toString(),
    s.paidBreakMinutes.toString(),
    s.regularHours.toFixed(2),
    s.overtimeHours.toFixed(2),
    s.totalWorkedHours.toFixed(2),
    (s.hourlyRate || 0).toFixed(2),
    (s.estimatedGrossPay || 0).toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Helper to download CSV file
 */
export function downloadCSV(csvContent: string, fileName: string = 'timesheets.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
