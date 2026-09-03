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
  Copy,
  Check,
  Send,
  Power,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { OrgUser, UserRole } from '../../types';
import { DEMO_USERS } from '../../lib/demoData';

export const EmployeeManager: React.FC = () => {
  const { jobs, addEmployee, updateEmployee, organization, orgUser: currentAuthUser, isOwner, isAdmin, teamMembers } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);

  // Invite Notice Modal state
  const [noticeUser, setNoticeUser] = useState<OrgUser | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [hourlyRate, setHourlyRate] = useState(30);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use dynamic team members from auth context, falling back to demo users
  const teamList = teamMembers && teamMembers.length > 0 ? teamMembers : DEMO_USERS;

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

  const handleToggleActive = async (user: OrgUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateEmployee(user.id, { isActive: !user.isActive });
      if (noticeUser && noticeUser.id === user.id) {
        setNoticeUser({ ...noticeUser, isActive: !user.isActive });
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
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
        setIsModalOpen(false);
      } else {
        await addEmployee({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          hourlyRate: Number(hourlyRate),
          assignedJobIds: selectedJobIds,
          isActive,
        });
        setIsModalOpen(false);

        // Show the Invite Notice & Access Credentials modal for the newly added worker!
        const createdUser: OrgUser = {
          id: `temp_${Date.now()}`,
          organizationId: organization?.id || 'org',
          role,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          createdAt: Date.now(),
          assignedJobIds: selectedJobIds,
          hourlyRate: Number(hourlyRate),
          isActive,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName.trim())}`,
        };
        setNoticeUser(createdUser);
      }
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

  const generateInviteText = (user: OrgUser) => {
    const orgTitle = organization?.name || 'Apex Field Services';
    const siteNames = user.assignedJobIds?.length
      ? user.assignedJobIds.map((jid) => jobs.find((j) => j.id === jid)?.name || jid).join(', ')
      : 'All company project sites';

    return `Hello ${user.fullName},

You have been invited to join ${orgTitle} on WorkPulse Field Time Clock.

Your Worker Account is ACTIVE and ready to use:
- Access Portal: ${window.location.origin}
- Login Role: Select "Employee Login"
- Email: ${user.email}
- Default Password / PIN: password123
- Hourly Rate: $${user.hourlyRate || 30}/hr
- Assigned Job Sites: ${siteNames}

When starting your shift, open the link on your mobile phone, choose your active job site, and tap "START SHIFT / CLOCK IN".`;
  };

  const handleCopyNotice = (user: OrgUser) => {
    const text = generateInviteText(user);
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
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
            Manage worker accounts, assign job permissions, send onboarding notices, and toggle active status
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

      {/* Guide Banner: Worker Invites & Instant Activation */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-indigo-900">How Worker Onboarding & Activation Works:</span>
            <p className="text-indigo-800 text-[11px] mt-0.5 leading-relaxed">
              Newly added workers are set to <span className="font-semibold text-emerald-700">Active</span> immediately. They can sign in on any device by switching to the <span className="font-semibold">Employee Login</span> tab with their email and PIN (<code className="bg-indigo-100/80 px-1 py-0.5 rounded text-indigo-900 font-mono text-[10px]">password123</code>). Click <strong>"Notice & Login Info"</strong> on any worker card to copy or email their personalized invite notice.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name or email (e.g. Vaughn Smith)..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            {teamList.filter((m) => m.isActive).length} Active
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            {teamList.length} Total in {organization?.name || 'Organization'}
          </span>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeam.map((member) => (
          <div
            key={member.id}
            className={`rounded-xl border p-5 transition shadow-sm space-y-4 ${
              member.isActive
                ? 'bg-white border-slate-200 hover:border-indigo-200'
                : 'bg-slate-50/80 border-slate-200 opacity-75'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={
                    member.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.fullName)}`
                  }
                  alt={member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{member.fullName}</h4>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span
                      className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
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

                    {/* Active Status Badge */}
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        member.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${member.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    title="Edit Worker Settings"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleToggleActive(member, e)}
                    className={`p-1.5 rounded-lg transition ${
                      member.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title={member.isActive ? 'Deactivate Worker' : 'Activate Worker'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
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

            {/* Quick Action: Share Notice & Login Info */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNoticeUser(member)}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Notice & Login Info</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* WORKER INVITATION & ACCESS NOTICE MODAL */}
      {/* ------------------------------------------------------------- */}
      {noticeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Worker Invite & Access Notice</h3>
                  <p className="text-xs text-slate-500">Credentials and onboarding details for {noticeUser.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setNoticeUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Active Status Callout */}
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              noticeUser.isActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${noticeUser.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <span className="font-bold">
                    Account Status: {noticeUser.isActive ? 'Active & Ready for Clock-In' : 'Inactive (Suspended)'}
                  </span>
                  <p className="text-[11px] text-slate-600">
                    {noticeUser.isActive
                      ? 'The worker can sign in on any device right now to select jobs and punch in.'
                      : 'This worker is temporarily paused from logging in or punching time.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleActive(noticeUser)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  noticeUser.isActive
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {noticeUser.isActive ? 'Active' : 'Activate Now'}
              </button>
            </div>

            {/* Formatted Invite Notice Box */}
            <div className="space-y-2 text-xs">
              <label className="block text-slate-700 font-bold">Personalized Onboarding Notice:</label>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed whitespace-pre-wrap border border-slate-800 select-all max-h-56 overflow-y-auto">
                {generateInviteText(noticeUser)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleCopyNotice(noticeUser)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs"
              >
                {copiedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedNotice ? 'Copied to Clipboard!' : 'Copy Invitation Notice'}</span>
              </button>

              <a
                href={`mailto:${noticeUser.email}?subject=${encodeURIComponent(`Welcome to ${organization?.name || 'Apex Field Services'} - WorkPulse Time Clock Access`)}&body=${encodeURIComponent(generateInviteText(noticeUser))}`}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs text-center"
              >
                <Send className="w-4 h-4" />
                <span>Send via Email</span>
              </a>

              <button
                type="button"
                onClick={() => setNoticeUser(null)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT MEMBER MODAL */}
      {/* ------------------------------------------------------------- */}
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
                    placeholder="e.g. Vaughn Smith"
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
                    placeholder="e.g. vaughn.smith@company.com"
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
                    placeholder="(415) 555-0100"
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
                  Active team member (can immediately sign in and punch time)
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
                  {saving ? 'Saving...' : editingUser ? 'Update Member' : 'Invite Member & View Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
