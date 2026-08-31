import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Building,
  Clock,
  ShieldCheck,
  RefreshCw,
  Save,
  CheckCircle2,
  Database,
  Globe,
  FileCode,
} from 'lucide-react';

export const OrgSettings: React.FC = () => {
  const { organization, updateOrgSettings, seedDemoDatabase } = useAuth();

  const [name, setName] = useState(organization?.name || 'Apex Field Services & Construction');
  const [timezone, setTimezone] = useState(organization?.timezone || 'America/Los_Angeles');
  const [dailyHours, setDailyHours] = useState(organization?.overtimeRules?.dailyHours || 8);
  const [weeklyHours, setWeeklyHours] = useState(organization?.overtimeRules?.weeklyHours || 40);
  const [rateMultiplier, setRateMultiplier] = useState(organization?.overtimeRules?.rateMultiplier || 1.5);
  const [requirePhoto, setRequirePhoto] = useState(organization?.requirePhoto ?? true);
  const [requireLocation, setRequireLocation] = useState(organization?.requireLocation ?? true);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrgSettings({
        name: name.trim(),
        timezone,
        overtimeRules: {
          dailyHours: Number(dailyHours),
          weeklyHours: Number(weeklyHours),
          rateMultiplier: Number(rateMultiplier),
        },
        requirePhoto,
        requireLocation,
      });
      setFeedback('Organization settings saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      setFeedback(e?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    const res = await seedDemoDatabase();
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-2.5">
          <Settings className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Company Settings & Overtime Policy
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure pay period rules, overtime calculation thresholds, and photo/GPS verification rules
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Company Profile */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Company Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Operating Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Anchorage">Alaska</option>
                <option value="Pacific/Honolulu">Hawaii</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overtime Policy Rules */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Overtime & Payroll Rules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Daily Overtime Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value) || 8)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
                  hours/day
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Hours worked over this in a day trigger 1.5x</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Weekly Overtime Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 40)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
                  hours/week
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Cumulative weekly threshold</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Overtime Pay Multiplier
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={rateMultiplier}
                  onChange={(e) => setRateMultiplier(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
                  x rate
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Standard is 1.5x regular wage</p>
            </div>
          </div>
        </div>

        {/* Verification Settings */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Clock-In Verification Requirements</span>
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={requirePhoto}
                onChange={(e) => setRequirePhoto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-900">Require Selfie Photo Snapshot</span>
                <p className="text-[11px] text-slate-500">
                  Workers must snap a photo when clocking in or changing break status
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={requireLocation}
                onChange={(e) => setRequireLocation(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-900">Require GPS Coordinates</span>
                <p className="text-[11px] text-slate-500">
                  Worker location is recorded at the punch instant to calculate distance from job site
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>Reset Demo Seed Data</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Firebase Architecture & Deployment Info Box */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 text-xs text-slate-700 shadow-sm">
        <h4 className="font-bold text-slate-900 flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-indigo-600" />
          <span>Firebase Deployment & Architecture Configuration</span>
        </h4>
        <div className="space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
          <p>
            • <strong>Firestore Database:</strong> Collections structured as multi-tenant trees under <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">organizations/&#123;orgId&#125;</code> (subcollections: <code className="text-indigo-600">users</code>, <code className="text-indigo-600">jobs</code>, <code className="text-indigo-600">punches</code>).
          </p>
          <p>
            • <strong>Firestore Security Rules:</strong> Deployed and active! Enforces tenant isolation so users can only access their authenticated organization, and employees can only read/write their own punch records.
          </p>
          <p>
            • <strong>Cloud Storage:</strong> Verification selfie photos uploaded to <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">organizations/&#123;orgId&#125;/punches/&#123;userId&#125;/*.jpg</code>.
          </p>
          <p>
            • <strong>Offline PWA Engine:</strong> Full service worker caching with IndexedDB punch queueing ensuring field workers never lose shifts in low-connectivity areas.
          </p>
        </div>
      </div>
    </div>
  );
};
