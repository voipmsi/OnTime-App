import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  Clock,
  DollarSign,
  Camera,
  MapPin,
  CheckCircle2,
  ChevronDown,
  User,
} from 'lucide-react';
import {
  deriveShiftsFromPunches,
  formatDecimalHours,
  formatTimeOnly,
  formatDateOnly,
  formatCurrency,
  generateTimesheetCSV,
  downloadCSV,
} from '../../lib/timeUtils';
import { ShiftRecord, Punch } from '../../types';
import { DEMO_USERS } from '../../lib/demoData';
import { PunchDetailModal } from './PunchDetailModal';

export const TimesheetsView: React.FC = () => {
  const { punches, jobs, organization, teamMembers } = useAuth();

  // Selected date period filter
  const [selectedPeriod, setSelectedPeriod] = useState<'this_pay_period' | 'last_pay_period' | 'all'>('this_pay_period');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPunchForAudit, setSelectedPunchForAudit] = useState<Punch | null>(null);

  const currentMembers = teamMembers && teamMembers.length > 0 ? teamMembers : DEMO_USERS;

  // Build hourly rate dictionary
  const userHourlyRates = useMemo(() => {
    const rates: Record<string, number> = {};
    for (const u of currentMembers) {
      if (u.hourlyRate) rates[u.id] = u.hourlyRate;
    }
    return rates;
  }, [currentMembers]);

  // Derive all shifts
  const allDerivedShifts = useMemo(() => {
    const rules = organization?.overtimeRules || { dailyHours: 8, weeklyHours: 40, rateMultiplier: 1.5 };
    return deriveShiftsFromPunches(punches, rules, userHourlyRates);
  }, [punches, organization, userHourlyRates]);

  // Filtered shifts based on date period & controls
  const filteredShifts = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);

    return allDerivedShifts.filter((shift) => {
      // Period filter
      if (selectedPeriod === 'this_pay_period' && shift.clockInTime < startOfWeek.getTime()) {
        return false;
      }
      if (
        selectedPeriod === 'last_pay_period' &&
        (shift.clockInTime < startOfLastWeek.getTime() || shift.clockInTime > endOfLastWeek.getTime())
      ) {
        return false;
      }

      // Employee filter
      if (selectedEmployeeId !== 'all' && shift.userId !== selectedEmployeeId) {
        return false;
      }

      // Job filter
      if (selectedJobId !== 'all' && shift.jobId !== selectedJobId) {
        return false;
      }

      // Search filter
      if (
        searchQuery &&
        !shift.userName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !shift.jobName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [allDerivedShifts, selectedPeriod, selectedEmployeeId, selectedJobId, searchQuery]);

  // Aggregate stats
  const totals = useMemo(() => {
    let regH = 0;
    let otH = 0;
    let totalH = 0;
    let breakMin = 0;
    let gross = 0;

    for (const s of filteredShifts) {
      regH += s.regularHours;
      otH += s.overtimeHours;
      totalH += s.totalWorkedHours;
      breakMin += s.totalBreakMinutes;
      gross += s.estimatedGrossPay || 0;
    }

    return {
      regularHours: regH,
      overtimeHours: otH,
      totalHours: totalH,
      breakMinutes: breakMin,
      grossPay: gross,
      shiftCount: filteredShifts.length,
    };
  }, [filteredShifts]);

  const handleExportPayrollCSV = () => {
    const csv = generateTimesheetCSV(filteredShifts);
    downloadCSV(csv, `payroll_${organization?.name.replace(/\s+/g, '_')}_${selectedPeriod}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Company Timesheets & Payroll
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pay period aggregations, daily/weekly overtime calculations, and CSV export for payroll processing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedPeriod('this_pay_period')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'this_pay_period'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current Period
            </button>
            <button
              onClick={() => setSelectedPeriod('last_pay_period')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'last_pay_period'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Previous Period
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedPeriod === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportPayrollCSV}
            disabled={filteredShifts.length === 0}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Payroll CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Metrics (High Density) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Shifts</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totals.shiftCount}</p>
          <span className="text-[10px] text-slate-500">Filtered logs</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Regular Hours</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatDecimalHours(totals.regularHours)}</p>
          <span className="text-[10px] text-slate-500">1.0x baseline</span>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${totals.overtimeHours > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Overtime</span>
            {totals.overtimeHours > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          </div>
          <p className={`text-2xl font-black mt-1 ${totals.overtimeHours > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
            {formatDecimalHours(totals.overtimeHours)}
          </p>
          <span className="text-[10px] text-slate-500">&gt; 8h/day or 40h/wk</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Breaks</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{totals.breakMinutes} min</p>
          <span className="text-[10px] text-slate-500">Rest & meal breaks</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Est. Gross Payroll</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{formatCurrency(totals.grossPay)}</p>
          <span className="text-[10px] text-slate-500">Regular + OT rates</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter employee or job site..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 text-xs font-medium"
          />
        </div>

        {/* Employee Filter */}
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
        >
          <option value="all">All Employees</option>
          {currentMembers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>

        {/* Job Filter */}
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
        >
          <option value="all">All Job Sites</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      {/* Timesheet Data Table */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Job Location</th>
                <th className="px-4 py-3">Clock In / Out</th>
                <th className="px-4 py-3 text-right">Regular</th>
                <th className="px-4 py-3 text-right">Overtime</th>
                <th className="px-4 py-3 text-right">Total Hours</th>
                <th className="px-4 py-3 text-right">Est. Pay</th>
                <th className="px-4 py-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No timesheet shifts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-indigo-50/40 transition">
                    {/* Worker */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{shift.userName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {shift.userEmail}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                      {formatDateOnly(shift.clockInTime)}
                    </td>

                    {/* Job */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                        {shift.jobName}
                      </span>
                    </td>

                    {/* Times */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                        <span className="text-slate-900 font-semibold">{formatTimeOnly(shift.clockInTime)}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-900 font-semibold">
                          {shift.clockOutTime ? formatTimeOnly(shift.clockOutTime) : 'Active'}
                        </span>
                      </div>
                      {shift.totalBreakMinutes > 0 && (
                        <span className="text-[10px] text-slate-500 block">
                          Break: {shift.totalBreakMinutes} min
                        </span>
                      )}
                    </td>

                    {/* Regular Hours */}
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 font-mono">
                      {shift.regularHours.toFixed(2)}h
                    </td>

                    {/* Overtime Hours */}
                    <td className="px-4 py-3 text-right font-bold font-mono">
                      {shift.overtimeHours > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          +{shift.overtimeHours.toFixed(2)}h
                        </span>
                      ) : (
                        <span className="text-slate-400">0.00h</span>
                      )}
                    </td>

                    {/* Total Worked Hours */}
                    <td className="px-4 py-3 text-right font-black text-slate-900 font-mono">
                      {shift.totalWorkedHours.toFixed(2)}h
                    </td>

                    {/* Gross Pay */}
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 font-mono">
                      {formatCurrency(shift.estimatedGrossPay)}
                    </td>

                    {/* Audit Action Button */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedPunchForAudit(shift.clockInPunch)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 transition"
                        title="View Clock-in Photo & GPS Pin"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Punch Detail Audit Modal */}
      {selectedPunchForAudit && (
        <PunchDetailModal
          punch={selectedPunchForAudit}
          job={jobs.find((j) => j.id === selectedPunchForAudit.jobId)}
          onClose={() => setSelectedPunchForAudit(null)}
        />
      )}
    </div>
  );
};
