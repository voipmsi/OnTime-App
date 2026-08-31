import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  Coffee,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Download,
  Info,
} from 'lucide-react';
import {
  deriveShiftsFromPunches,
  formatDecimalHours,
  formatTimeOnly,
  formatDateOnly,
  formatCurrency,
  generateTimesheetCSV,
  downloadCSV,
} from '../lib/timeUtils';
import { Punch, ShiftRecord } from '../types';

interface MyTimesheetProps {
  onBackToClock: () => void;
}

export const MyTimesheet: React.FC<MyTimesheetProps> = ({ onBackToClock }) => {
  const { orgUser, punches, organization } = useAuth();

  // Filter punches for current employee
  const employeePunches = useMemo(() => {
    if (!orgUser) return [];
    return punches.filter((p) => p.userId === orgUser.id);
  }, [punches, orgUser]);

  // Derive shifts
  const allShifts = useMemo(() => {
    const rules = organization?.overtimeRules || { dailyHours: 8, weeklyHours: 40, rateMultiplier: 1.5 };
    const rates: Record<string, number> = {};
    if (orgUser?.hourlyRate) {
      rates[orgUser.id] = orgUser.hourlyRate;
    }
    return deriveShiftsFromPunches(employeePunches, rules, rates);
  }, [employeePunches, organization, orgUser]);

  // Selected Pay Period / Week filter
  const [selectedPeriod, setSelectedPeriod] = useState<'this_week' | 'last_week' | 'all'>('this_week');
  const [selectedPunchForModal, setSelectedPunchForModal] = useState<Punch | null>(null);

  // Filter shifts based on selected period
  const filteredShifts = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);

    if (selectedPeriod === 'this_week') {
      return allShifts.filter((s) => s.clockInTime >= startOfWeek.getTime());
    } else if (selectedPeriod === 'last_week') {
      return allShifts.filter(
        (s) => s.clockInTime >= startOfLastWeek.getTime() && s.clockInTime <= endOfLastWeek.getTime()
      );
    }
    return allShifts;
  }, [allShifts, selectedPeriod]);

  // Aggregated totals
  const totals = useMemo(() => {
    let regularHours = 0;
    let overtimeHours = 0;
    let totalHours = 0;
    let breakMinutes = 0;
    let grossPay = 0;

    for (const s of filteredShifts) {
      regularHours += s.regularHours;
      overtimeHours += s.overtimeHours;
      totalHours += s.totalWorkedHours;
      breakMinutes += s.totalBreakMinutes;
      grossPay += s.estimatedGrossPay || 0;
    }

    return {
      regularHours,
      overtimeHours,
      totalHours,
      breakMinutes,
      grossPay,
      hasOvertime: overtimeHours > 0,
    };
  }, [filteredShifts]);

  const handleExportMyCSV = () => {
    const csv = generateTimesheetCSV(filteredShifts);
    downloadCSV(csv, `timesheet_${orgUser?.fullName.replace(/\s+/g, '_')}_${selectedPeriod}.csv`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>My Timesheet & Hours</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged shift history, break breakdown, and overtime tracking for {orgUser?.fullName}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Period selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedPeriod('this_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'this_week'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setSelectedPeriod('last_week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'last_week'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All History
            </button>
          </div>

          <button
            onClick={handleExportMyCSV}
            disabled={filteredShifts.length === 0}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 transition disabled:opacity-40 shadow-xs"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Summary Cards (High Density) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Hours */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Worked</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatDecimalHours(totals.totalHours)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Net of unpaid breaks</p>
        </div>

        {/* Regular Hours */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Regular Hours</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatDecimalHours(totals.regularHours)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Standard rate</p>
        </div>

        {/* Overtime Hours */}
        <div
          className={`p-4 rounded-xl border text-slate-900 shadow-sm ${
            totals.overtimeHours > 0
              ? 'bg-amber-50/60 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Overtime (1.5x)</p>
            {totals.overtimeHours > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          </div>
          <p
            className={`text-2xl font-black mt-1 ${
              totals.overtimeHours > 0 ? 'text-amber-700' : 'text-slate-400'
            }`}
          >
            {formatDecimalHours(totals.overtimeHours)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">&gt; 8h/day or 40h/week</p>
        </div>

        {/* Estimated Gross Pay */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Est. Gross Pay</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {formatCurrency(totals.grossPay)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Rate: ${orgUser?.hourlyRate || 25}/hr</p>
        </div>
      </div>

      {/* Shifts Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Shift Log ({filteredShifts.length})
        </h3>

        {filteredShifts.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No shifts recorded for this period</p>
            <p className="text-xs text-slate-500">
              Clock in on the Time Clock tab to record your first shift.
            </p>
          </div>
        ) : (
          filteredShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 hover:border-indigo-200 hover:shadow-xs transition space-y-3"
            >
              {/* Top Row: Date, Job Site & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {new Date(shift.clockInTime).toLocaleDateString([], { weekday: 'short' })}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{shift.jobName}</h4>
                    <p className="text-xs text-slate-500">{formatDateOnly(shift.clockInTime)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {shift.hasOvertime && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                      +{formatDecimalHours(shift.overtimeHours)} OT
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                      shift.isComplete
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                    }`}
                  >
                    {shift.isComplete ? 'Complete' : 'In Progress'}
                  </span>
                </div>
              </div>

              {/* Middle Row: Hours & Times */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Clock In</span>
                  <button
                    onClick={() => setSelectedPunchForModal(shift.clockInPunch)}
                    className="font-bold text-slate-900 hover:text-indigo-600 flex items-center space-x-1 mt-0.5"
                  >
                    <span>{formatTimeOnly(shift.clockInTime)}</span>
                    <Camera className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Clock Out</span>
                  {shift.clockOutPunch ? (
                    <button
                      onClick={() => setSelectedPunchForModal(shift.clockOutPunch!)}
                      className="font-bold text-slate-900 hover:text-indigo-600 flex items-center space-x-1 mt-0.5"
                    >
                      <span>{formatTimeOnly(shift.clockOutTime!)}</span>
                      <Camera className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <span className="font-semibold text-emerald-600 mt-0.5 block">Active Now</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Breaks</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {shift.totalBreakMinutes > 0 ? `${shift.totalBreakMinutes} min` : 'None'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Worked Duration</span>
                  <span className="font-black text-indigo-600 mt-0.5 block text-sm font-mono">
                    {formatDecimalHours(shift.totalWorkedHours)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Punch Photo Verification Modal */}
      {selectedPunchForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 capitalize">
                {selectedPunchForModal.type.replace('_', ' ')} Verification
              </h3>
              <button
                onClick={() => setSelectedPunchForModal(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Photo */}
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {selectedPunchForModal.photoUrl ? (
                <img
                  src={selectedPunchForModal.photoUrl}
                  alt="Punch Verification"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-400 p-4">
                  <Camera className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <span className="text-xs">No verification photo</span>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedPunchForModal.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Site:</span>
                <span className="font-medium text-slate-900 truncate max-w-[180px]">
                  {selectedPunchForModal.jobName}
                </span>
              </div>
              {selectedPunchForModal.distanceFromJobMeters !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance from job:</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedPunchForModal.distanceFromJobMeters} meters
                  </span>
                </div>
              )}
              {selectedPunchForModal.createdOffline && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Queued Offline:</span>
                  <span>Yes (Synced later)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
