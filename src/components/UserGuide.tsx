import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Download,
  FileText,
  Shield,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Camera,
  WifiOff,
  Sparkles,
  Layers,
  ArrowRight,
  DollarSign,
  Coffee,
  HelpCircle,
  Briefcase,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { generateAdminGuidePDF, generateEmployeeGuidePDF } from '../lib/pdfGenerator';

export const UserGuide: React.FC = () => {
  const { organization, isAdmin, isManager, orgUser } = useAuth();
  const [activeManual, setActiveManual] = useState<'admin' | 'employee'>(
    isAdmin || isManager ? 'admin' : 'employee'
  );
  const [downloading, setDownloading] = useState<string | null>(null);

  const orgName = organization?.name || 'Apex Field Services';

  const handleDownloadAdminPDF = () => {
    setDownloading('admin');
    try {
      const doc = generateAdminGuidePDF(orgName);
      doc.save(`${orgName.replace(/\s+/g, '_')}_Admin_Operations_Guide.pdf`);
    } catch (err) {
      console.error('Failed to generate admin PDF:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadEmployeePDF = () => {
    setDownloading('employee');
    try {
      const doc = generateEmployeeGuidePDF(orgName);
      doc.save(`${orgName.replace(/\s+/g, '_')}_Employee_Field_Guide.pdf`);
    } catch (err) {
      console.error('Failed to generate employee PDF:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              WorkPulse Operations & User Guides
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Official step-by-step documentation for company administrators, managers, and field employees.
          </p>
        </div>

        {/* Action Buttons: Download PDFs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadAdminPDF}
            disabled={downloading === 'admin'}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'admin' ? 'Generating...' : 'Download Admin PDF'}</span>
          </button>

          <button
            onClick={handleDownloadEmployeePDF}
            disabled={downloading === 'employee'}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'employee' ? 'Generating...' : 'Download Employee PDF'}</span>
          </button>
        </div>
      </div>

      {/* Manual Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveManual('admin')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeManual === 'admin'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin & Manager Operations Manual</span>
        </button>

        <button
          onClick={() => setActiveManual('employee')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeManual === 'employee'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Employee & Field Worker User Guide</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. ADMIN & MANAGER GUIDE CONTENT */}
      {/* ------------------------------------------------------------- */}
      {activeManual === 'admin' && (
        <div className="space-y-6">
          {/* Quick Setup Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Company Setup Checklist (4 Essential Steps)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Setup In 5 Minutes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Configure Company Settings</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Go to <strong>Company Settings</strong> to verify your legal company name, time zone, daily overtime threshold (e.g. 8 hours), and weekly overtime threshold (e.g. 40 hours).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Add Project Job Sites</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Go to <strong>Jobs & Sites</strong> to add customer job addresses. WorkPulse auto-geocodes GPS coordinates and sets a geofence radius (50m - 500m) to prevent out-of-bounds clock-ins.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Add Employees & Hourly Rates</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Go to <strong>Team</strong> to add workers. Set their base hourly rate and check which job sites they are authorized to clock into.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Send Access Notices</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Click <strong>"Notice & Login Info"</strong> on any worker card to copy or email their customized invitation notice with default PIN (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">password123</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Module Deep Dives */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Job Geofencing */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <MapPin className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Job Geofencing & Safety</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                WorkPulse compares worker GPS coordinates at the moment of clock-in against your job site’s geofence radius.
              </p>
              <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Within Geofence:</strong> Marked in green on the Live Roster.</li>
                <li><strong>Out of Geofence:</strong> Flagged in amber with exact distance off-site.</li>
                <li><strong>Site Hazard Alerts:</strong> Workers see mandatory safety reminders before punching.</li>
              </ul>
            </div>

            {/* Live Roster & Verification */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Camera className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Photo & GPS Audit Trail</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eliminate buddy punching and time theft with tamper-proof selfie and location verification.
              </p>
              <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Live Roster:</strong> Real-time shift counters and active break indicators.</li>
                <li><strong>Audit Modal:</strong> Click any punch in Timesheets to view high-res selfie and GPS map pin.</li>
                <li><strong>Manual Overrides:</strong> Admins can adjust timestamps with logged audit notes.</li>
              </ul>
            </div>

            {/* Timesheets & Payroll */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600">
                <DollarSign className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Overtime & Payroll Export</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated wage calculation with one-click export for payroll processors.
              </p>
              <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Daily / Weekly Overtime:</strong> Automatic 1.5x pay multiplier splits.</li>
                <li><strong>Gross Pay Summary:</strong> Total wages calculated per job and per worker.</li>
                <li><strong>CSV Export:</strong> Formatted for QuickBooks, Gusto, ADP, and Paychex.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EMPLOYEE & FIELD WORKER GUIDE CONTENT */}
      {/* ------------------------------------------------------------- */}
      {activeManual === 'employee' && (
        <div className="space-y-6">
          {/* Quick Flow Visual */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Worker Shift Flow (Daily Routine)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                Easy Mobile Access
              </span>
            </div>

            {/* 4 Step Visual Chain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">1. Clock In</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Select your assigned job site from the dropdown, review safety hazard alerts, and tap <strong>START SHIFT</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">2. Selfie Verification</span>
                  <Camera className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Look into the camera frame and tap <strong>Capture & Punch</strong>. Your live timer begins counting immediately.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">3. Rest & Lunch Breaks</span>
                  <Coffee className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tap <strong>START BREAK</strong> when stepping away for rest or lunch. Tap <strong>END BREAK</strong> when resuming work.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">4. Clock Out</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tap <strong>CLOCK OUT</strong> at the end of the shift. Add optional job notes and see your daily hours summary.
                </p>
              </div>
            </div>
          </div>

          {/* Key Field Worker Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offline Mode */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-700">
                <WifiOff className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Working Offline in Dead Zones</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you are working in basements, rural fields, or remote sites with no cell service, WorkPulse continues working seamlessly:
              </p>
              <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
                <li>You can clock in, take breaks, and clock out without internet connectivity.</li>
                <li>Your punch is encrypted and queued locally on your phone.</li>
                <li>As soon as your phone connects to cell service or WiFi, your punches auto-sync.</li>
              </ul>
            </div>

            {/* My Timesheet */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-emerald-700">
                <FileText className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900">Reviewing "My Timesheet"</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Always have transparent visibility into your hours worked and estimated earnings:
              </p>
              <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-4">
                <li>Tap <strong>My Timesheet</strong> on your phone at any time.</li>
                <li>See total shift hours, regular hours, and overtime hours worked this pay period.</li>
                <li>View estimated gross earnings calculated directly against your hourly rate.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
