import React from 'react';
import { Punch, Job } from '../../types';
import {
  X,
  MapPin,
  Camera,
  Compass,
  Clock,
  User,
  Shield,
  WifiOff,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { formatDistance } from '../../lib/geoUtils';
import { formatDateTime, formatTimeOnly } from '../../lib/timeUtils';

interface PunchDetailModalProps {
  punch: Punch | null;
  job?: Job | null;
  onClose: () => void;
}

export const PunchDetailModal: React.FC<PunchDetailModalProps> = ({ punch, job, onClose }) => {
  if (!punch) return null;

  const lat = punch.latitude;
  const lon = punch.longitude;
  const hasGps = lat !== undefined && lon !== undefined && lat !== null && lon !== null;

  // OpenStreetMap embed URL
  const mapEmbedUrl = hasGps
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.005}%2C${lat - 0.003}%2C${lon + 0.005}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lon}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 text-slate-900 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {punch.type.replace('_', ' ')} Audit Record
              </h3>
              <p className="text-xs text-slate-400">Punch ID: {punch.id.substring(0, 16)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Worker & Job Metadata */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Worker</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{punch.userName}</span>
            <span className="text-slate-500 text-[10px]">{punch.userEmail}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Job Location</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block truncate">{punch.jobName}</span>
            <span className="text-slate-500 text-[10px] truncate block">
              {job?.address || 'Site Coordinates on file'}
            </span>
          </div>
        </div>

        {/* Verification Photo & Embedded GPS Map Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Photo Column */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Selfie Verification</span>
            </span>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative">
              {punch.photoUrl ? (
                <img
                  src={punch.photoUrl}
                  alt="Punch Verification"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3 text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span className="text-[11px]">No photo attached</span>
                </div>
              )}
            </div>
          </div>

          {/* Map Column */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>GPS Coordinate Pin</span>
            </span>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative">
              {mapEmbedUrl ? (
                <iframe
                  title="GPS Pin Map"
                  src={mapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="text-center p-3 text-slate-400">
                  <MapPin className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span className="text-[11px]">No GPS recorded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Audit Properties */}
        <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Exact Timestamp:</span>
            </span>
            <span className="font-semibold text-slate-900">
              {new Date(punch.timestamp).toLocaleString()}
            </span>
          </div>

          {punch.distanceFromJobMeters !== undefined && (
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>Proximity to Site:</span>
              </span>
              <span
                className={`font-bold ${
                  punch.distanceFromJobMeters > 300 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {punch.distanceFromJobMeters} meters
                {punch.distanceFromJobMeters > 300 && ' (Off-site flag)'}
              </span>
            </div>
          )}

          {punch.gpsAccuracyMeters && (
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">GPS Accuracy:</span>
              <span className="font-medium text-slate-800">±{punch.gpsAccuracyMeters} m</span>
            </div>
          )}

          {punch.createdOffline && (
            <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
              <span className="flex items-center space-x-1">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Creation:</span>
              </span>
              <span className="font-semibold">Captured locally & synced</span>
            </div>
          )}

          {punch.notes && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
              <strong className="text-slate-900 block mb-0.5">Worker Note:</strong>
              {punch.notes}
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
