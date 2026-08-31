import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Building,
  Navigation,
  Compass,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Job } from '../../types';

export const JobManager: React.FC = () => {
  const { jobs, createJob, updateJob, organization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(37.7909);
  const [longitude, setLongitude] = useState(-122.3988);
  const [geofenceRadius, setGeofenceRadius] = useState(250);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingJob(null);
    setName('');
    setClientName('');
    setAddress('');
    setLatitude(37.7909);
    setLongitude(-122.3988);
    setGeofenceRadius(250);
    setNotes('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setName(job.name);
    setClientName(job.clientName || '');
    setAddress(job.address);
    setLatitude(job.latitude);
    setLongitude(job.longitude);
    setGeofenceRadius(job.geofenceRadiusMeters || 250);
    setNotes(job.notes || '');
    setIsActive(job.isActive);
    setIsModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingJob) {
        await updateJob(editingJob.id, {
          name: name.trim(),
          clientName: clientName.trim() || undefined,
          address: address.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          geofenceRadiusMeters: Number(geofenceRadius),
          notes: notes.trim() || undefined,
          isActive,
        });
      } else {
        await createJob({
          name: name.trim(),
          clientName: clientName.trim() || undefined,
          address: address.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
          geofenceRadiusMeters: Number(geofenceRadius),
          notes: notes.trim() || undefined,
          isActive,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.clientName && j.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <MapPin className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Job Sites & Geofences
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage project locations, site addresses, and GPS coordinate boundaries for {organization?.name}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Job Site</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job site or client..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredJobs.length} of {jobs.length} locations
        </span>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className={`rounded-xl border p-5 transition shadow-sm space-y-4 relative ${
              job.isActive
                ? 'bg-white border-slate-200 hover:border-indigo-300'
                : 'bg-slate-50 border-slate-200 opacity-75'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      job.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <h4 className="text-sm font-bold text-slate-900 truncate">{job.name}</h4>
                </div>
                {job.clientName && (
                  <p className="text-[11px] text-indigo-600 font-medium truncate flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span>{job.clientName}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => handleOpenEdit(job)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 ml-2"
                title="Edit Job Site"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Address & Coordinates */}
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-start space-x-2 text-slate-500">
                <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed truncate">{job.address || 'Address not specified'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {job.latitude.toFixed(4)}, {job.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Geofence Radius:</span>
                  <span className="font-bold text-indigo-600">
                    {job.geofenceRadiusMeters || 250} meters
                  </span>
                </div>
              </div>

              {job.notes && (
                <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                  "{job.notes}"
                </p>
              )}
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
              <span
                className={`px-2 py-0.5 rounded font-semibold ${
                  job.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {job.isActive ? 'Active for Clock-in' : 'Archived / Inactive'}
              </span>

              <button
                onClick={() => updateJob(job.id, { isActive: !job.isActive })}
                className="text-slate-500 hover:text-slate-800 font-medium transition"
              >
                {job.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingJob ? 'Edit Job Location' : 'Create New Job Site'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Job / Site Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Downtown Commercial Plaza (Phase 2)"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Client / Project Owner
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Skyline Urban Development"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 450 Mission St, San Francisco, CA 94105"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Coordinates & Quick Presets */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">GPS Coordinates</span>
                  {/* Presets */}
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'sf') {
                        setLatitude(37.7909);
                        setLongitude(-122.3988);
                      } else if (val === 'mv') {
                        setLatitude(37.422);
                        setLongitude(-122.0841);
                      } else if (val === 'oakland') {
                        setLatitude(37.8105);
                        setLongitude(-122.3025);
                      } else if (val === 'sj') {
                        setLatitude(37.3382);
                        setLongitude(-121.8863);
                      }
                    }}
                    className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-700"
                  >
                    <option value="">Quick Location Presets...</option>
                    <option value="sf">San Francisco (37.7909, -122.3988)</option>
                    <option value="mv">Mountain View (37.4220, -122.0841)</option>
                    <option value="oakland">Oakland (37.8105, -122.3025)</option>
                    <option value="sj">San Jose (37.3382, -121.8863)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] mb-0.5">
                    Geofence Radius (meters) — stored for verification review
                  </label>
                  <input
                    type="number"
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(parseInt(e.target.value) || 250)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Site Notes / Safety Requirements
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. PPE hard hat required. Access via south loading dock."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveToggle" className="text-slate-700 font-medium cursor-pointer">
                  Active job site (available on worker timeclocks)
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
                  {saving ? 'Saving...' : editingJob ? 'Update Site' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
