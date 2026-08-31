import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavigationTab } from './components/Navbar';
import { ClockInFlow } from './components/ClockInFlow';
import { MyTimesheet } from './components/MyTimesheet';
import { LiveRoster } from './components/Admin/LiveRoster';
import { TimesheetsView } from './components/Admin/TimesheetsView';
import { JobManager } from './components/Admin/JobManager';
import { EmployeeManager } from './components/Admin/EmployeeManager';
import { OrgSettings } from './components/Admin/OrgSettings';
import { ConsentModal } from './components/ConsentModal';
import { AuthModal } from './components/AuthModal';
import {
  WifiOff,
  RefreshCw,
  Download,
  AlertCircle,
  Clock,
  Radio,
  FileSpreadsheet,
  MapPin,
  Users,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    orgUser,
    organization,
    isManagerOrAbove,
    hasConsent,
    acceptConsent,
    pendingOfflinePunches,
    syncOfflinePunches,
    isOnline,
    isDemoMode,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<NavigationTab>('clock');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check consent when user logs in
  useEffect(() => {
    if (orgUser && !hasConsent) {
      setShowConsentModal(true);
    }
  }, [orgUser, hasConsent]);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflinePunches();
    } finally {
      setIsSyncing(false);
    }
  };

  // If regular employee tries to navigate to admin tab, keep them on clock
  useEffect(() => {
    if (!isManagerOrAbove && ['liveroster', 'timesheets', 'jobs', 'team', 'settings'].includes(activeTab)) {
      setActiveTab('clock');
    }
  }, [isManagerOrAbove, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white pb-20 md:pb-8">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Offline / Pending Sync Banner */}
      {(!isOnline || pendingOfflinePunches > 0) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-800 shadow-sm">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {!isOnline ? 'You are working offline.' : 'Offline punches queued.'}{' '}
              <strong className="text-amber-950 font-bold">
                {pendingOfflinePunches} punch{pendingOfflinePunches === 1 ? '' : 'es'} pending sync
              </strong>
            </span>
          </div>

          {isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold border border-amber-300 flex items-center space-x-1 transition text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>
      )}

      {/* Install PWA Prompt Banner */}
      {installPrompt && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between text-xs text-indigo-900 shadow-sm">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Install WorkPulse for full-screen offline mobile time clock.</span>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm text-xs"
          >
            Add to Home Screen
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'clock' && (
          <ClockInFlow onViewTimesheet={() => setActiveTab('mytimesheet')} />
        )}

        {activeTab === 'mytimesheet' && (
          <MyTimesheet onBackToClock={() => setActiveTab('clock')} />
        )}

        {activeTab === 'liveroster' && isManagerOrAbove && <LiveRoster />}

        {activeTab === 'timesheets' && isManagerOrAbove && <TimesheetsView />}

        {activeTab === 'jobs' && isManagerOrAbove && <JobManager />}

        {activeTab === 'team' && isManagerOrAbove && <EmployeeManager />}

        {activeTab === 'settings' && isManagerOrAbove && <OrgSettings />}
      </main>

      {/* Mobile Bottom Navigation Bar for quick thumb switching */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('clock')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            activeTab === 'clock' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Time Clock</span>
        </button>

        <button
          onClick={() => setActiveTab('mytimesheet')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
            activeTab === 'mytimesheet' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">My Hours</span>
        </button>

        {isManagerOrAbove && (
          <>
            <button
              onClick={() => setActiveTab('liveroster')}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
                activeTab === 'liveroster'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Radio className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Live Roster</span>
            </button>

            <button
              onClick={() => setActiveTab('timesheets')}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition ${
                activeTab === 'timesheets'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Admin</span>
            </button>
          </>
        )}
      </div>

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onAccept={async () => {
          await acceptConsent();
          setShowConsentModal(false);
        }}
        onDecline={() => setShowConsentModal(false)}
      />

      {/* Auth & Persona Switcher Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
