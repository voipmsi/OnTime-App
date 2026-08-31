import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Camera, MapPin, HardDrive, Check, Lock } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose }) => {
  const { orgUser, organization, acceptConsent } = useAuth();
  const [agreedPhoto, setAgreedPhoto] = useState(true);
  const [agreedGps, setAgreedGps] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || orgUser?.consentAcceptedAt) return null;

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await acceptConsent();
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-8 text-slate-900 shadow-2xl space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Field Worker Notice & Consent
          </h2>
          <p className="text-xs text-slate-500">
            {organization?.name || 'Company'} Time Clock Policy
          </p>
        </div>

        {/* Detailed Explanation */}
        <div className="space-y-3.5 text-xs text-slate-700">
          <p className="leading-relaxed">
            Welcome, <strong className="text-slate-900">{orgUser?.fullName}</strong>. To ensure workplace safety, precise payroll accuracy, and job-site compliance, this time clock application collects verification data when you punch in or out:
          </p>

          <div className="space-y-2.5">
            {/* Item 1: Camera */}
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Camera className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900">Photo Verification</h4>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  A photo is captured at the moment you clock in, clock out, or take breaks to confirm identity and prevent payroll discrepancies.
                </p>
              </div>
            </div>

            {/* Item 2: GPS Location */}
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900">Point-in-Time GPS Coordinates</h4>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Your device's location is recorded only at the precise second you submit a punch to calculate proximity to your assigned job site. <strong className="text-slate-900">No continuous background tracking</strong> occurs.
                </p>
              </div>
            </div>

            {/* Item 3: Privacy & Offline */}
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <HardDrive className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900">Offline Queuing & Encryption</h4>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  If you work in areas without cell service, your punches and photos are encrypted in your local device queue and uploaded automatically once connected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox Acknowledgment */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedPhoto && agreedGps}
              onChange={(e) => {
                setAgreedPhoto(e.target.checked);
                setAgreedGps(e.target.checked);
              }}
              className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium">I acknowledge and accept the time clock verification policy.</span>
          </label>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleAccept}
            disabled={!agreedPhoto || !agreedGps || submitting}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Saving consent...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Accept Notice & Continue</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
