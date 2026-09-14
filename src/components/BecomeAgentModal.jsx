import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Lock, 
  MessageCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import CountryPhoneInput from './CountryPhoneInput';

export default function BecomeAgentModal({ isOpen, onClose, onApplicationSubmitted }) {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [experience, setExperience] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

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
          phone: phone.trim(),
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
    setCopiedDraft(false);
    setFullName('');
    setPhone('');
    setArea('');
    setExperience('');
    setPassword('');
    setError('');
    onClose();
  };

  const draftMessageText = `Hello Admin! I have registered as a House Agent on UniStay and submitted my credentials.\n\nName: ${fullName}\nPhone: ${phone}\nOperating Area: ${area || 'Student PG Hub'}\nExperience: ${experience || 'PG Manager'}\n\nPlease review and approve my account credentials for faster confirmation.`;

  const getAdminWhatsAppFastTrack = () => {
    return `https://wa.me/919041543868?text=${encodeURIComponent(draftMessageText)}`;
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftMessageText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
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
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            
            <h3 className="text-lg font-extrabold text-slate-900">Application Submitted!</h3>
            
            {/* Prominent Required Waiting Message */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 flex items-center justify-center gap-2 text-amber-900 font-extrabold text-sm shadow-xs">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
              <span>Waiting for Admin approval maximum time 2hrs</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your credentials are under review. Once the Main Admin approves your account, an approval confirmation WhatsApp message will be sent to your phone.
            </p>

            {/* WhatsApp Draft Box for Faster Confirmation */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Fast-Track WhatsApp Request:
                </span>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Draft
                    </>
                  )}
                </button>
              </div>

              {/* Draft text display */}
              <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/80 font-mono text-[11px] text-slate-700 whitespace-pre-line select-all">
                {draftMessageText}
              </div>

              <p className="text-[11px] text-emerald-800 leading-snug">
                Send this request directly to the Main Admin on WhatsApp for instant verification:
              </p>

              <a
                href={getAdminWhatsAppFastTrack()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send WhatsApp Request to Admin (+91 9041543868)</span>
              </a>
            </div>

            <button
              onClick={resetAndClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Done & Return to Rooms
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
              <CountryPhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="98765 43210"
                required
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Choose a password for your agent login"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
