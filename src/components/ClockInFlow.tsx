import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  Square,
  Coffee,
  Clock,
  MapPin,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  WifiOff,
  RefreshCw,
  Calendar,
  History,
  Timer,
  FileText,
  Building,
  Plus,
  Shield,
  Search,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Job, PunchType, BreakType } from '../types';
import { formatSecondsToTimer, formatTimeOnly, formatDecimalHours } from '../lib/timeUtils';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ClockInFlowProps {
  onViewTimesheet: () => void;
  onNavigateToJobs?: () => void;
  onOpenAuthModal?: () => void;
}

export const ClockInFlow: React.FC<ClockInFlowProps> = ({
  onViewTimesheet,
  onNavigateToJobs,
  onOpenAuthModal,
}) => {
  const {
    orgUser,
    organization,
    jobs,
    punches,
    isClockedIn,
    isOnBreak,
    activeJob,
    activeClockInPunch,
    activeBreakStartPunch,
    elapsedSeconds,
    breakElapsedSeconds,
    recordPunch,
    isOnline,
    pendingOfflineCount,
    isManagerOrAbove,
  } = useAuth();

  // Filter jobs assigned to this employee (or all active jobs if no specific restrictions)
  const assignedJobs = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.isActive);
    if (!orgUser?.assignedJobIds || orgUser.assignedJobIds.length === 0) {
      return activeJobs;
    }
    const filtered = activeJobs.filter((j) => orgUser.assignedJobIds.includes(j.id));
    return filtered.length > 0 ? filtered : activeJobs;
  }, [jobs, orgUser]);

  // Selected job for clock in
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    return assignedJobs[0]?.id || '';
  });

  // Keep selectedJobId valid if assignedJobs change
  React.useEffect(() => {
    if ((!selectedJobId || !assignedJobs.some((j) => j.id === selectedJobId)) && assignedJobs.length > 0) {
      setSelectedJobId(assignedJobs[0].id);
    }
  }, [assignedJobs, selectedJobId]);

  const currentSelectedJob = useMemo(() => {
    return (
      jobs.find((j) => j.id === (isClockedIn && activeJob ? activeJob.id : selectedJobId)) ||
      assignedJobs[0] ||
      null
    );
  }, [jobs, selectedJobId, isClockedIn, activeJob, assignedJobs]);

  // Camera & Punch Modal state
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [targetPunchType, setTargetPunchType] = useState<PunchType>('clock_in');
  const [targetBreakType, setTargetBreakType] = useState<BreakType | undefined>(undefined);
  const [isBreakSelectionOpen, setIsBreakSelectionOpen] = useState(false);
  const [showJobSelectorModal, setShowJobSelectorModal] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');

  // Today's worked hours summary
  const todaySummary = useMemo(() => {
    if (!orgUser) return { totalHours: 0, punchCount: 0 };
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPunches = punches.filter((p) => {
      const pDate = new Date(p.timestamp).toISOString().split('T')[0];
      return p.userId === orgUser.id && pDate === todayStr;
    });

    return {
      totalHours: elapsedSeconds / 3600,
      punchCount: todayPunches.length,
    };
  }, [punches, orgUser, elapsedSeconds]);

  // Handle Punch Flow Triggers
  const handleInitiateClockIn = () => {
    if (!currentSelectedJob) return;
    setTargetPunchType('clock_in');
    setTargetBreakType(undefined);
    setIsPunchModalOpen(true);
  };

  const handleInitiateClockOut = () => {
    if (!currentSelectedJob) return;
    setTargetPunchType('clock_out');
    setTargetBreakType(undefined);
    setIsPunchModalOpen(true);
  };

  const handleSelectBreakType = (type: BreakType) => {
    setIsBreakSelectionOpen(false);
    setTargetPunchType('break_start');
    setTargetBreakType(type);
    setIsPunchModalOpen(true);
  };

  const handleInitiateEndBreak = () => {
    if (!currentSelectedJob) return;
    setTargetPunchType('break_end');
    setTargetBreakType(undefined);
    setIsPunchModalOpen(true);
  };

  const handleExecutePunch = async (params: {
    photoDataUri?: string;
    latitude?: number;
    longitude?: number;
    gpsAccuracyMeters?: number;
    notes?: string;
  }) => {
    if (!currentSelectedJob) return;

    await recordPunch({
      jobId: currentSelectedJob.id,
      type: targetPunchType,
      breakType: targetBreakType,
      latitude: params.latitude,
      longitude: params.longitude,
      gpsAccuracyMeters: params.gpsAccuracyMeters,
      photoDataUri: params.photoDataUri,
      notes: params.notes,
    });
  };

  const filteredModalJobs = assignedJobs.filter(
    (j) =>
      j.name.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      j.address.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      (j.clientName && j.clientName.toLowerCase().includes(jobSearchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Role & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <img
            src={
              orgUser?.avatarUrl ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${orgUser?.fullName || 'User'}`
            }
            alt={orgUser?.fullName || 'User'}
            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900">{orgUser?.fullName || 'Guest Worker'}</h2>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  isManagerOrAbove
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {orgUser?.role || 'Employee'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {organization?.name || 'Field Services'} • {assignedJobs.length} active job sites available in database
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {isManagerOrAbove && onNavigateToJobs && (
            <button
              onClick={onNavigateToJobs}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add / Manage Jobs</span>
            </button>
          )}

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Switch Login Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-950">Offline Mode Active</p>
              <p className="text-amber-800 text-[11px]">
                Punches and photos are saved locally to your device and will auto-upload when you reconnect.
              </p>
            </div>
          </div>
          {pendingOfflineCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-600 text-white font-bold rounded text-xs shrink-0">
              {pendingOfflineCount} Queued
            </span>
          )}
        </div>
      )}

      {/* High Density Metric Cards for Employee Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
          <p
            className={`text-xl sm:text-2xl font-bold ${
              isOnBreak ? 'text-amber-600' : isClockedIn ? 'text-emerald-600' : 'text-slate-800'
            }`}
          >
            {isOnBreak ? 'On Break' : isClockedIn ? 'Active' : 'Off Clock'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isClockedIn ? 'Live tracking' : 'Ready to punch'}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hours Today</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-indigo-600">
            {formatDecimalHours(todaySummary.totalHours)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {todaySummary.punchCount} punch event{todaySummary.punchCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Job Site</p>
          <p
            className="text-sm sm:text-base font-bold text-slate-800 truncate"
            title={currentSelectedJob?.name}
          >
            {currentSelectedJob?.name || 'No Site Selected'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {currentSelectedJob?.clientName || 'Standard Job'}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Verification</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-base sm:text-lg">GPS + Photo</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isOnline ? 'Cloud Synced' : 'Offline Buffer'}
          </p>
        </div>
      </div>

      {/* Main Terminal Mockup */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-slate-800 relative max-w-md mx-auto">
        {/* Top speaker notch */}
        <div className="w-16 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Inner Phone Terminal Screen */}
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col border border-slate-200 shadow-inner">
          {/* Indigo Header Banner */}
          <div className="bg-indigo-600 p-4 text-white">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs opacity-90 font-mono">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-indigo-500 rounded-full">
                {isOnline ? 'ONLINE • DATABASE SYNCED' : 'OFFLINE MODE'}
              </span>
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-90">
              Current Shift Status
            </h3>
            <p className="text-2xl font-bold mt-0.5">
              {isOnBreak ? 'On Break' : isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </p>

            <div className="mt-2.5 flex items-center gap-2 text-[11px] bg-indigo-700/80 w-fit px-2.5 py-1 rounded text-white font-medium">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnBreak
                    ? 'bg-amber-400 animate-pulse'
                    : isClockedIn
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-slate-300'
                }`}
              />
              <span className="truncate max-w-[200px]">
                {currentSelectedJob?.name || 'Select Job Site'}
              </span>
            </div>
          </div>

          {/* Screen Content Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-5 bg-white text-slate-800">
            <div>
              {/* Running Time Display */}
              <div className="mb-4 text-center sm:text-left">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">
                  Time Elapsed
                </p>
                <p className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-slate-900 select-none">
                  {isClockedIn ? formatSecondsToTimer(elapsedSeconds) : '00:00:00'}
                </p>
                {isClockedIn && activeClockInPunch && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Punch In:{' '}
                    <span className="font-semibold text-slate-700">
                      {formatTimeOnly(activeClockInPunch.timestamp)}
                    </span>
                    {isOnBreak && activeBreakStartPunch && (
                      <span className="ml-2 text-amber-600 font-semibold">
                        (Break: {formatSecondsToTimer(breakElapsedSeconds)})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Job Site Selection Area */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {isClockedIn ? 'Active Job Site' : 'Select Job to Clock In'}
                  </label>
                  {!isClockedIn && assignedJobs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowJobSelectorModal(true)}
                      className="text-[11px] text-indigo-600 hover:underline font-bold"
                    >
                      Browse All ({assignedJobs.length})
                    </button>
                  )}
                </div>

                {isClockedIn ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {activeJob?.name || 'Assigned Job'}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {activeJob?.address || 'Site Location'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                        Clocked In
                      </span>
                    </div>
                  </div>
                ) : assignedJobs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                    <p className="text-xs font-bold text-amber-900">No Job Sites in Database</p>
                    <p className="text-[11px] text-amber-800">
                      An administrator must add jobs in the Admin Portal first.
                    </p>
                    {isManagerOrAbove && onNavigateToJobs && (
                      <button
                        onClick={onNavigateToJobs}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                      >
                        Add Job Site in Admin Portal
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full appearance-none px-3 py-2.5 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition truncate"
                      >
                        {assignedJobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.name} {job.clientName ? `(${job.clientName})` : ''}
                          </option>
                        ))}
                      </select>
                      <MapPin className="w-4 h-4 text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Selected Job Mini Card */}
                    {currentSelectedJob && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] space-y-1 text-slate-700">
                        <div className="flex items-center justify-between text-indigo-900 font-bold">
                          <span className="truncate">{currentSelectedJob.name}</span>
                          <span className="text-[10px] text-indigo-600 shrink-0 font-normal">
                            Geofence: {currentSelectedJob.geofenceRadiusMeters || 250}m
                          </span>
                        </div>
                        {currentSelectedJob.address && (
                          <p className="text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{currentSelectedJob.address}</span>
                          </p>
                        )}
                        {currentSelectedJob.notes && (
                          <p className="text-[10px] text-slate-600 italic line-clamp-1">
                            Note: {currentSelectedJob.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {!isClockedIn ? (
                  <button
                    onClick={handleInitiateClockIn}
                    disabled={!currentSelectedJob}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START SHIFT / CLOCK IN</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {!isOnBreak ? (
                      <button
                        onClick={() => setIsBreakSelectionOpen(true)}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2"
                      >
                        <Coffee className="w-4 h-4" />
                        <span>START BREAK</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleInitiateEndBreak}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>END BREAK & RESUME</span>
                      </button>
                    )}

                    <button
                      onClick={handleInitiateClockOut}
                      className="w-full py-3 border-2 border-red-500 text-red-600 hover:bg-red-50 active:scale-[0.99] rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>CLOCK OUT</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Status Pill */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg shrink-0">
                <MapPin className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-800">Site Verification</p>
                <p className="text-[10px] text-slate-500 truncate">
                  GPS Active • Facial Selfie Verification
                </p>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="bg-indigo-50 p-2.5 px-4 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-semibold">
            <span>All systems synced</span>
            <button
              onClick={onViewTimesheet}
              className="hover:underline flex items-center gap-1 text-indigo-800 font-bold"
            >
              <History className="w-3.5 h-3.5" />
              <span>My Hours</span>
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
          Mobile Employee Terminal • Offline Capable
        </p>
      </div>

      {/* Full Job Browser Modal for Employees */}
      {showJobSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 text-slate-900 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Choose Job Site</h3>
                <p className="text-[11px] text-slate-500">
                  Select a project location created by your administrator
                </p>
              </div>
              <button
                onClick={() => setShowJobSelectorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                placeholder="Search job name, client, or address..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Jobs List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredModalJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setShowJobSelectorModal(false);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition space-y-1.5 ${
                    selectedJobId === job.id
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{job.name}</h4>
                    {selectedJobId === job.id && (
                      <span className="flex items-center space-x-1 text-[10px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.2 rounded">
                        <Check className="w-3 h-3" />
                        <span>Selected</span>
                      </span>
                    )}
                  </div>
                  {job.clientName && (
                    <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 truncate">
                      <Building className="w-3 h-3" />
                      <span>{job.clientName}</span>
                    </p>
                  )}
                  {job.address && (
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{job.address}</span>
                    </p>
                  )}
                  {job.notes && (
                    <p className="text-[10px] text-slate-400 italic line-clamp-1">{job.notes}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Break Type Selection Modal */}
      {isBreakSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Select Break Category</h3>
              <button
                onClick={() => setIsBreakSelectionOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {/* Option 1: Unpaid Meal Break */}
              <button
                onClick={() => handleSelectBreakType('unpaid')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 text-left transition flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">30-Min Meal Break (Unpaid)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Deducted from worked shift duration
                  </p>
                </div>
                <Coffee className="w-4 h-4 text-amber-500" />
              </button>

              {/* Option 2: Paid Rest Break */}
              <button
                onClick={() => handleSelectBreakType('paid')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 text-left transition flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">15-Min Rest Break (Paid)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Counts toward total paid shift hours
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Camera & GPS Modal */}
      {currentSelectedJob && (
        <CameraCaptureModal
          isOpen={isPunchModalOpen}
          onClose={() => setIsPunchModalOpen(false)}
          job={currentSelectedJob}
          punchType={targetPunchType}
          breakType={targetBreakType}
          onConfirmPunch={handleExecutePunch}
        />
      )}
    </div>
  );
};
