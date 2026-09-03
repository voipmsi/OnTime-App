import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Building,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  Shield,
  Clock,
  MapPin,
  Users,
  Briefcase,
  Layers,
} from 'lucide-react';
import { DEMO_USERS } from '../lib/demoData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithOrg, loginAsDemoUser, orgUser, teamMembers } = useAuth();

  // Top portal toggle: 'admin' vs 'employee'
  const [activePortal, setActivePortal] = useState<'admin' | 'employee'>('admin');

  // Sub-mode inside the chosen portal
  const [adminMode, setAdminMode] = useState<'quick' | 'signin' | 'register'>('quick');
  const [employeeMode, setEmployeeMode] = useState<'quick' | 'signin'>('quick');

  // Form states
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (adminMode === 'register') {
        if (!orgName.trim() || !fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error('Please fill in all fields to create your company organization');
        }
        await signUpWithOrg(orgName, fullName, email, password);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter admin email and password');
        }
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter worker email and password/PIN');
      }
      // Check if matches a registered or demo worker email
      const allWorkers = teamMembers.length > 0 ? teamMembers : DEMO_USERS;
      const matchedWorker = allWorkers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matchedWorker) {
        if (!matchedWorker.isActive) {
          throw new Error('This employee account is currently set to inactive. Please ask an Admin to activate your access.');
        }
        loginAsDemoUser(matchedWorker.id);
        onClose();
        return;
      }

      await signInWithEmail(email, password);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Worker sign in failed. Please check your email or PIN.');
    } finally {
      setLoading(false);
    }
  };

  const currentMembers = teamMembers.length > 0 ? teamMembers : DEMO_USERS;
  const adminPersonas = currentMembers.filter((u) => (u.role === 'owner' || u.role === 'admin' || u.role === 'manager') && u.isActive !== false);
  const employeePersonas = currentMembers.filter((u) => u.role === 'employee' && u.isActive !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              W
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">WorkPulse Portal Sign-In</h3>
              <p className="text-xs text-slate-500">Select your access role to continue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Role Selector: Admin Portal vs Employee Portal */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActivePortal('admin');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg font-bold text-xs transition ${
              activePortal === 'admin'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Admin / Manager Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePortal('employee');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg font-bold text-xs transition ${
              activePortal === 'employee'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Employee Login</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ADMIN / MANAGER PORTAL */}
        {/* ------------------------------------------------------------- */}
        {activePortal === 'admin' && (
          <div className="space-y-4">
            {/* Info Banner for Admin Role */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Admin Portal Privileges:</span>
                <p className="text-indigo-800 text-[11px] mt-0.5">
                  Create and manage job sites in the database, set geofences, invite employees, assign job permissions, and review timecards.
                </p>
              </div>
            </div>

            {/* Admin Sub-Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setAdminMode('quick')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                  adminMode === 'quick' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1-Click Admin Access
              </button>
              <button
                type="button"
                onClick={() => setAdminMode('signin')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                  adminMode === 'signin' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Admin Sign-In
              </button>
              <button
                type="button"
                onClick={() => setAdminMode('register')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                  adminMode === 'register' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register Business
              </button>
            </div>

            {/* Quick 1-Click Admin Personas */}
            {adminMode === 'quick' && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 font-medium">
                  Select an Administrator account below to manage jobs and team settings:
                </p>

                <div className="space-y-2">
                  {adminPersonas.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAsDemoUser(u.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${
                        orgUser?.id === u.id
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={u.avatarUrl}
                          alt={u.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{u.fullName}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {u.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center text-xs text-indigo-600 font-bold ml-2">
                        <span>Enter Admin Portal</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real Firebase / Custom Admin Sign In */}
            {adminMode === 'signin' && (
              <form onSubmit={handleAdminSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Admin Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('sarah.chen@apexfield.com');
                      setPassword('password123');
                    }}
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    Auto-fill Admin Demo Credentials
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating Admin...' : 'Sign In to Admin Portal'}
                </button>
              </form>
            )}

            {/* Register New Organization */}
            {adminMode === 'register' && (
              <form onSubmit={handleAdminSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company / Organization Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Apex Field Services"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Owner / Admin Full Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Chen"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Admin Email Address *</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@company.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Setting up Company...' : 'Create Business & Admin Account'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* EMPLOYEE PORTAL */}
        {/* ------------------------------------------------------------- */}
        {activePortal === 'employee' && (
          <div className="space-y-4">
            {/* Info Banner for Employee Role */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex items-start space-x-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Employee Time Clock Access:</span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Log in to your worker profile, select from the job sites added by your Admin, clock in/out with GPS + photo verification, and view your hours.
                </p>
              </div>
            </div>

            {/* Employee Sub-Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setEmployeeMode('quick')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                  employeeMode === 'quick' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1-Click Worker Access
              </button>
              <button
                type="button"
                onClick={() => setEmployeeMode('signin')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition ${
                  employeeMode === 'signin' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Worker Email / PIN Login
              </button>
            </div>

            {/* Quick 1-Click Employee Personas */}
            {employeeMode === 'quick' && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 font-medium">
                  Select a field employee below to open the job time clock:
                </p>

                <div className="space-y-2">
                  {employeePersonas.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAsDemoUser(u.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${
                        orgUser?.id === u.id
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={u.avatarUrl}
                          alt={u.fullName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{u.fullName}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Worker • ${u.hourlyRate}/hr
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center text-xs text-emerald-700 font-bold ml-2">
                        <span>Clock In to Jobs</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Email / PIN Sign In */}
            {employeeMode === 'signin' && (
              <form onSubmit={handleEmployeeSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Worker Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivera@company.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password or 4-Digit PIN</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('alex.rivera@apexfield.com');
                      setPassword('password123');
                    }}
                    className="text-emerald-700 hover:underline font-semibold"
                  >
                    Auto-fill Worker Demo Credentials
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Logging into Time Clock...' : 'Log In & View Assigned Jobs'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
