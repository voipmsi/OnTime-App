import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Briefcase,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Phone,
  Search,
} from 'lucide-react';
import { OrgUser, UserRole } from '../../types';
import { DEMO_USERS } from '../../lib/demoData';

export const EmployeeManager: React.FC = () => {
  const { jobs, addEmployee, updateEmployee, organization, orgUser: currentAuthUser, isOwner, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [hourlyRate, setHourlyRate] = useState(30);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const teamList = DEMO_USERS;

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setRole('employee');
    setHourlyRate(30);
    setSelectedJobIds(jobs.map((j) => j.id)); // Assign to all jobs by default
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: OrgUser) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone || '');
    setRole(user.role);
    setHourlyRate(user.hourlyRate || 30);
    setSelectedJobIds(user.assignedJobIds || []);
    setIsActive(user.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setSaving(true);
    try {
      if (editingUser) {
        await updateEmployee(editingUser.id, {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          hourlyRate: Number(hourlyRate),
          assignedJobIds: selectedJobIds,
          isActive,
        });
      } else {
        await addEmployee({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          hourlyRate: Number(hourlyRate),
          assignedJobIds: selectedJobIds,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    if (selectedJobIds.includes(jobId)) {
      setSelectedJobIds(selectedJobIds.filter((id) => id !== jobId));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  const filteredTeam = teamList.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Team & Role Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage worker accounts, assign job permissions, hourly wages, and view safety consent status
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add / Invite Worker</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name or email..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredTeam.length} members in {organization?.name}
        </span>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeam.map((member) => (
          <div
            key={member.id}
            className={`rounded-xl border p-5 transition shadow-sm space-y-4 ${
              member.isActive
                ? 'bg-white border-slate-200 hover:border-indigo-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={
                    member.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.fullName}`
                  }
                  alt={member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{member.fullName}</h4>
                  <span
                    className={`inline-block mt-0.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      member.role === 'owner'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : member.role === 'admin'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : member.role === 'manager'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => handleOpenEdit(member)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 ml-2"
                  title="Edit Worker"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2 text-slate-500 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{member.email}</span>
              </div>

              {member.phone && (
                <div className="flex items-center space-x-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>{member.phone}</span>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Hourly Rate:</span>
                  <span className="font-bold text-emerald-600 font-mono">${member.hourlyRate || 25}/hr</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Jobs:</span>
                  <span className="font-bold text-indigo-600">
                    {member.assignedJobIds?.length || 0} job site(s)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">GPS & Photo Consent:</span>
                  {member.consentAcceptedAt ? (
                    <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Accepted</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">Pending First Clock-in</span>
                  )}
                </div>
              </div>
            </div>

            {/* Assigned Job Tags */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Assigned Sites
              </span>
              <div className="flex flex-wrap gap-1">
                {(!member.assignedJobIds || member.assignedJobIds.length === 0) ? (
                  <span className="text-[10px] text-slate-400 italic">All company sites accessible</span>
                ) : (
                  member.assignedJobIds.map((jid) => {
                    const job = jobs.find((j) => j.id === jid);
                    return (
                      <span
                        key={jid}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[180px]"
                      >
                        {job?.name || jid}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? `Edit ${editingUser.fullName}` : 'Add New Team Member'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Taylor"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jordan.taylor@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    {isOwner && <option value="owner">Owner</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hourly Wage ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Job Assignment Checkboxes */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">
                  Assigned Job Sites ({selectedJobIds.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  {jobs.map((job) => (
                    <label
                      key={job.id}
                      className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={() => toggleJobSelection(job.id)}
                        className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-800 truncate">{job.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Workers can only select and clock into jobs checked above.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="userActiveToggle" className="text-slate-700 font-medium cursor-pointer">
                  Active team member (can sign in and punch time)
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update Member' : 'Invite Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
