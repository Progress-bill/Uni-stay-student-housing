import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DeleteRequestModal({ 
  isOpen, 
  onClose, 
  room, 
  onRequestSubmitted 
}) {
  if (!isOpen || !room) return null;

  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for deleting this listing.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/listings/${room.id}/delete-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          agentId: user?.id || '',
          agentName: user?.name || 'House Agent',
          agentPhone: user?.phone || ''
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        if (onRequestSubmitted) {
          onRequestSubmitted(room.id, data.data);
        }
      } else {
        setError(data.message || 'Failed to submit deletion request.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-red-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Request Listing Deletion</h2>
              <p className="text-xs text-slate-500">Requires Main Admin Review & Approval</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Deletion Request Submitted!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your request to remove <strong>"{room.title}"</strong> has been sent to the <strong>Main Admin</strong> for verification. 
              The listing will remain marked until approved.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Notice */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Agent Direct Deletion Disabled</span>
              </div>
              <p className="text-[11px] text-amber-800">
                To prevent accidental removals, listings cannot be deleted directly by agents. Please provide the reason below for the Main Admin to verify.
              </p>
            </div>

            {/* Room Info */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              {room.images && room.images[0] && (
                <img 
                  src={room.images[0]} 
                  alt={room.title} 
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" 
                />
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">{room.title}</h4>
                <p className="text-[11px] text-slate-500 truncate">{room.address}</p>
                <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                  ₹{room.rentAmount?.toLocaleString()}/month
                </p>
              </div>
            </div>

            {/* Reason Text Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Deletion Request <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this listing should be removed (e.g., Landlord rented out room offline, duplicate listing, lease discontinued)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Request to Admin'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
