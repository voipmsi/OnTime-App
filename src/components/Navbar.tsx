import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  Users,
  MapPin,
  FileSpreadsheet,
  Settings,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
  Shield,
  Briefcase,
  AlertCircle,
  BookOpen,
  Building2,
  Download,
  FileText,
} from 'lucide-react';
import { formatSecondsToTimer } from '../lib/timeUtils';
import { DEMO_USERS } from '../lib/demoData';
import { generateAdminGuidePDF, generateEmployeeGuidePDF } from '../lib/pdfGenerator';

export type NavigationTab =
  | 'clock'
  | 'mytimesheet'
  | 'liveroster'
  | 'timesheets'
  | 'jobs'
  | 'team'
  | 'settings'
  | 'userguide';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenAuthModal }) => {
  const {
    orgUser,
    organization,
    isClockedIn,
    isOnBreak,
    elapsedSeconds,
    activeJob,
    isOwner,
    isAdmin,
    isManager,
    isDemoMode,
    isOnline,
    pendingOfflineCount,
    loginAsDemoUser,
    signOut,
    triggerManualSync,
    seedDemoDatabase,
  } = useAuth();

  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const orgName = organization?.name || 'WorkPulse';

  const downloadAdminPDF = () => {
    try {
      const doc = generateAdminGuidePDF(orgName);
      doc.save(`${orgName.replace(/\s+/g, '_')}_Admin_Operations_Guide.pdf`);
    } catch (err) {
      console.error('Error generating admin PDF:', err);
    }
  };

  const downloadEmployeePDF = () => {
    try {
      const doc = generateEmployeeGuidePDF(orgName);
      doc.save(`${orgName.replace(/\s+/g, '_')}_Employee_Field_Guide.pdf`);
    } catch (err) {
      console.error('Error generating employee PDF:', err);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerManualSync();
      setSyncFeedback(`Synced ${res.synced} punches (${res.failed} failed)`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e) {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeed = async () => {
    setIsSyncing(true);
    const res = await seedDemoDatabase();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4000);
    setIsSyncing(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onTabChange('clock')}
              className="flex items-center space-x-2.5 focus:outline-none group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-500 transition-colors">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-base tracking-tight text-white">WorkPulse</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    High Density
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-xs">
                  {organization?.name || 'Field Time Clock'}
                </p>
              </div>
            </button>
          </div>

          {/* Center Status Pill (Visible if Clocked In) */}
          {isClockedIn && (
            <div
              onClick={() => onTabChange('clock')}
              className="cursor-pointer hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-emerald-500/40 text-emerald-300 shadow-sm hover:border-emerald-400 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {isOnBreak ? 'ON BREAK' : 'CLOCKED IN'}:
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {formatSecondsToTimer(elapsedSeconds)}
              </span>
              {activeJob && (
                <span className="text-[11px] text-slate-300 max-w-[120px] truncate">
                  • {activeJob.name}
                </span>
              )}
            </div>
          )}

          {/* Right Action Items */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Connectivity & Offline Sync Status */}
            <div className="flex items-center">
              {!isOnline ? (
                <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span className="text-[11px]">Offline</span>
                  {pendingOfflineCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
                      {pendingOfflineCount}
                    </span>
                  )}
                </div>
              ) : pendingOfflineCount > 0 ? (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 text-xs font-medium transition"
                  title="Click to sync offline punches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-[11px]">Sync ({pendingOfflineCount})</span>
                </button>
              ) : (
                <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Live Sync</span>
                </div>
              )}
            </div>

            {/* PDF Guides Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPdfMenuOpen(!isPdfMenuOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/50 text-xs font-semibold text-indigo-200 hover:text-white transition shadow-xs"
                title="Download PDF User & Admin Manuals"
              >
                <Download className="w-3.5 h-3.5 text-indigo-300" />
                <span className="hidden sm:inline">PDF Guides</span>
                <ChevronDown className="w-3 h-3 text-indigo-300" />
              </button>

              {isPdfMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 pb-1.5 border-b border-slate-700">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Download PDF Guides
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Formatted printable documentation
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => {
                        downloadAdminPDF();
                        setIsPdfMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg hover:bg-indigo-600/20 text-slate-200 hover:text-white transition group"
                    >
                      <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">Admin Operations Guide</p>
                        <p className="text-[10px] text-slate-400">Setup checklist, jobs, rates, & payroll</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        downloadEmployeePDF();
                        setIsPdfMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg hover:bg-emerald-600/20 text-slate-200 hover:text-white transition group"
                    >
                      <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">Employee Field Guide</p>
                        <p className="text-[10px] text-slate-400">Clock in, breaks, offline & timesheet</p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-700 px-2">
                    <button
                      onClick={() => {
                        onTabChange('userguide');
                        setIsPdfMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                      <span>View Online Documentation</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-slate-400">Role:</span>
                <span className="font-semibold text-white capitalize">{orgUser?.role || 'Guest'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Quick Switch Test Persona
                    </p>
                  </div>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAsDemoUser(u.id);
                        setIsDemoMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-1.5 text-left hover:bg-slate-700 transition ${
                        orgUser?.id === u.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-200'
                      }`}
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.fullName}
                        className="w-6 h-6 rounded-full object-cover mr-2.5 border border-slate-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{u.role} • ${u.hourlyRate}/hr</p>
                      </div>
                      {orgUser?.id === u.id && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  ))}

                  <div className="mt-1 pt-1 border-t border-slate-700 px-2 space-y-1">
                    <button
                      onClick={() => {
                        handleSeed();
                        setIsDemoMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset / Seed Sample Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Auth */}
            {orgUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500 transition"
                >
                  <img
                    src={orgUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${orgUser.fullName}`}
                    alt={orgUser.fullName}
                    className="w-7 h-7 rounded-full border border-slate-700 object-cover bg-slate-800"
                  />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-1 z-50">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <p className="text-xs font-bold text-white">{orgUser.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{orgUser.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.2 bg-slate-700 text-slate-300 rounded">
                        {orgUser.role}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onOpenAuthModal();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Switch to Firebase Auth</span>
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/20"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync feedback notification toast */}
      {syncFeedback && (
        <div className="bg-indigo-600 text-white text-xs py-1 px-4 text-center font-medium animate-fadeIn">
          {syncFeedback}
        </div>
      )}

      {/* Navigation Sub-Tabs (High Density Sub-Header) */}
      <div className="border-t border-slate-800 bg-slate-900/90 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 py-1">
          {/* 1. Time Clock (Main Terminal) */}
          <button
            onClick={() => onTabChange('clock')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'clock'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time Clock</span>
          </button>

          {/* 2. My Timesheet */}
          <button
            onClick={() => onTabChange('mytimesheet')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'mytimesheet'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Timesheet</span>
          </button>

          {/* Admin / Manager Views */}
          {isManager && (
            <>
              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* 3. Live Roster */}
              <button
                onClick={() => onTabChange('liveroster')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  activeTab === 'liveroster'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Roster</span>
              </button>

              {/* 4. Timesheets & Payroll */}
              <button
                onClick={() => onTabChange('timesheets')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  activeTab === 'timesheets'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Timesheets & Payroll</span>
              </button>

              {/* 5. Jobs & Locations */}
              <button
                onClick={() => onTabChange('jobs')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  activeTab === 'jobs'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Jobs & Sites</span>
              </button>

              {/* 6. Team & Roles */}
              <button
                onClick={() => onTabChange('team')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  activeTab === 'team'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team</span>
              </button>

              {/* 7. Settings (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => onTabChange('settings')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Company Settings</span>
                </button>
              )}
            </>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* User Guide & PDF Download Tab */}
          <button
            onClick={() => onTabChange('userguide')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'userguide'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>User Guides & PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
