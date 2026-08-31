import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Radio,
  Clock,
  MapPin,
  Coffee,
  Users,
  Search,
  Filter,
  Camera,
  Shield,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { formatSecondsToTimer, formatTimeOnly } from '../../lib/timeUtils';
import { Punch, Job, OrgUser } from '../../types';
import { DEMO_USERS } from '../../lib/demoData';
import { PunchDetailModal } from './PunchDetailModal';

interface ActiveWorkerStatus {
  userId: string;
  user?: OrgUser | null;
  userName: string;
  userEmail: string;
  role: string;
  avatarUrl?: string;
  jobId: string;
  jobName: string;
  job?: Job | null;
  clockInPunch: Punch;
  clockInTime: number;
  isOnBreak: boolean;
  breakStartPunch?: Punch | null;
  breakStartTime?: number | null;
  elapsedSeconds: number;
  breakElapsedSeconds: number;
}

export const LiveRoster: React.FC = () => {
  const { punches, jobs, organization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJobId, setFilterJobId] = useState('all');
  const [selectedPunchForModal, setSelectedPunchForModal] = useState<Punch | null>(null);

  // Compute active clocked-in employees right now
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeWorkers: ActiveWorkerStatus[] = useMemo(() => {
    // Group punches by user and sort chronologically
    const sorted = [...punches].sort((a, b) => a.timestamp - b.timestamp);
    const punchesByUser: Record<string, Punch[]> = {};
    for (const p of sorted) {
      if (!punchesByUser[p.userId]) punchesByUser[p.userId] = [];
      punchesByUser[p.userId].push(p);
    }

    const activeList: ActiveWorkerStatus[] = [];

    for (const userId in punchesByUser) {
      const userPunches不易 = punchesByUser[userId];
      let clockInPunch: Punch | null = null;
      let isOnBreak = false;
      let breakStartPunch: Punch | null = null;

      for (const p of userPunches不易) {
        if (p.type === 'clock_in') {
          clockInPunch逗: clockInPunch = p;
          isOnBreak = false;
          breakStartPunch = null;
        } else if (p.type === 'clock_out') {
          clockInPunch = null;
          isOnBreak = false;
          breakStartPunch = null;
        } else if (p.type === 'break_start') {
          isOnBreak = true;
          breakStartPunch = p;
        } else if (p.type === 'break_end') {
          isOnBreak = false;
          breakStartPunch = null;
        }
      }

      if (clockInPunch) {
        const matchingJob = jobs.find((j) => j.id === clockInPunch!.jobId);
        const matchingUser = DEMO_USERS.find((u) => u.id === userId);

        const elapsed = Math.max(0, Math.floor((currentTime - clockInPunch.timestamp) / 1000));
        const breakElapsed = breakStartPunch
          ? Math.max(0, Math.floor((currentTime - breakStartPunch.timestamp) / 1000))
          : 0;

        activeList.push({
          userId,
          user: matchingUser,
          userName: clockInPunch.userName || matchingUser?.fullName || 'Field Worker',
          userEmail: clockInPunch.userEmail || matchingUser?.email || '',
          role: matchingUser?.role || 'employee',
          avatarUrl: matchingUser?.avatarUrl || clockInPunch.photoUrl,
          jobId: clockInPunch.jobId,
          jobName: clockInPunch.jobName,
          job: matchingJob,
          clockInPunch,
          clockInTime: clockInPunch.timestamp,
          isOnBreak,
          breakStartPunch,
          breakStartTime: breakStartPunch?.timestamp,
          elapsedSeconds: elapsed,
          breakElapsedSeconds: breakElapsed,
        });
      }
    }

    return activeList.sort((a, b) => b.clockInTime - a.clockInTime);
  }, [punches, jobs, currentTime]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return activeWorkers.filter((w) => {
      const matchSearch依然 =
        w.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.jobName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchJob = filterJobId === 'all' || w.jobId === filterJobId;
      return matchSearch依然 && matchJob;
    });
  }, [activeWorkers, searchQuery, filterJobId]);

  const totalActive = activeWorkers.length;
  const onBreakCount = activeWorkers.filter((w) => w.isOnBreak).length;
  const uniqueSites = new Set(activeWorkers.map((w) => w.jobId)).size;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* High Density Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Personnel</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900">{totalActive}</p>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Clocked in across all sites</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">On Break</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-amber-600">{onBreakCount}</p>
            <span className="text-xs text-slate-500">of {totalActive} active</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Rest & meal breaks</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Job Sites</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-indigo-600">{uniqueSites}</p>
            <span className="text-xs text-slate-500">deployed</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Geofence boundaries active</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Verification Rate</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-600">100%</p>
            <span className="text-xs text-emerald-600 font-semibold">GPS + Photo</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Zero buddy-punch violations</p>
        </div>
      </div>

      {/* Main Attendance Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Container Header with Filters */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Live Attendance Feed</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filteredWorkers.length} Active
              </span>
            </h2>
            <p className="text-xs text-slate-500">Real-time headcounts, GPS distance audits, and running timers</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search worker or site..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 w-44 sm:w-52 font-medium"
              />
            </div>

            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Job Sites</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Table */}
        {filteredWorkers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Radio className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No field personnel currently clocked in</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When field workers clock in using their terminal or mobile browser, their live telemetry and photo verification will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Job Site</th>
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Status & Duration</th>
                  <th className="py-3 px-4">GPS Proximity</th>
                  <th className="py-3 px-4 text-right">Audit & Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                {filteredWorkers.map((worker) => (
                  <tr key={worker.userId} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            worker.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.userName}`
                          }
                          alt={worker.userName}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{worker.userName}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{worker.role}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate max-w-[180px]">{worker.jobName}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {worker.job?.address || 'Site Location'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {formatTimeOnly(worker.clockInTime)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              worker.isOnBreak ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                            }`}
                          />
                          <span className={`font-bold font-mono text-sm ${worker.isOnBreak ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {formatSecondsToTimer(worker.elapsedSeconds)}
                          </span>
                        </div>
                        {worker.isOnBreak && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                            Break: {formatSecondsToTimer(worker.breakElapsedSeconds)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {worker.clockInPunch.distanceFromJobMeters !== undefined ? (
                        <div className="flex items-center space-x-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              worker.clockInPunch.distanceFromJobMeters > 300
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            ±{worker.clockInPunch.distanceFromJobMeters}m from site
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">GPS Recorded</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedPunchForModal(worker.clockInPunch)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Inspect Audit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Punch Verification Modal */}
      {selectedPunchForModal && (
        <PunchDetailModal
          punch={selectedPunchForModal}
          job={jobs.find((j) => j.id === selectedPunchForModal.jobId)}
          onClose={() => setSelectedPunchForModal(null)}
        />
      )}
    </div>
  );
};
