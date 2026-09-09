import React, { useState } from 'react';
import { X, UserPlus, Send, CheckCircle2, AlertCircle, ShieldCheck, MapPin, Phone, Lock, MessageCircle } from 'lucide-react';

export default function BecomeAgentModal({ isOpen, onClose, onApplicationSubmitted }) {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [experience, setExperience] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Please fill in your full name and phone number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/agent-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          area,
          experience,
          password: password || 'agent123'
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedSuccess(true);
        if (onApplicationSubmitted) onApplicationSubmitted();
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSubmittedSuccess(false);
    setFullName('');
    setPhone('');
    setArea('');
    setExperience('');
    setPassword('');
    setError('');
    onClose();
  };

  const getAdminWhatsAppFastTrack = () => {
    const text = encodeURIComponent(
      `Hello Admin! I have just applied to become a verified House Agent on UniStay.\n\nName: ${fullName}\nPhone: ${phone}\nArea: ${area || 'Student Hub'}\n\nPlease approve my agent account!`
    );
    return `https://wa.me/919041543868?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Become a House Agent</h2>
              <p className="text-xs text-slate-500">Apply to list & manage student PG rooms</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Application Submitted!</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Thank you for applying to become a verified House Agent. 
              Your request is currently in the <strong>Pending Queue</strong> awaiting <strong>Main Admin</strong> review.
            </p>

            {/* Fast Track WhatsApp message to Admin */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left text-xs text-emerald-900 space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Fast-Track Your Approval:
              </span>
              <p className="text-[11px] text-emerald-800">
                You can directly message the Main Admin on WhatsApp at <strong>+91 9041543868</strong> with your application details:
              </p>
              <a
                href={getAdminWhatsAppFastTrack()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message Admin on WhatsApp (+91 9041543868)</span>
              </a>
            </div>

            <button
              onClick={resetAndClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 leading-relaxed">
              💡 <strong>Join the UniStay Agent Network:</strong> Upload room walkthrough videos, drop private GPS pins, and connect directly with verified students looking for budget rooms.
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Phone / WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone / WhatsApp Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9811223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Operating Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Operating Area / Target Colleges
              </label>
              <input
                type="text"
                placeholder="e.g. North Campus, Engineering Hub, South Extension"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Desired Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Create Account Password
              </label>
              <input
                type="password"
                placeholder="Choose a password for your agent login"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Experience / Why Join */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Brief Bio / Student PG Experience
              </label>
              <textarea
                rows={2}
                placeholder="How many rooms or PG locations do you manage?"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting Application...' : 'Submit Agent Application'}</span>
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
