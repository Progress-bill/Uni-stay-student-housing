import React, { useState } from 'react';
import { X, Lock, ShieldAlert, KeyRound, Eye, EyeOff, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CountryPhoneInput from './CountryPhoneInput';

export default function AuthModal({ isOpen, onClose, onOpenBecomeAgent }) {
  if (!isOpen) return null;

  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      setError('Please enter your phone number and password.');
      return;
    }

    setLoading(true);
    setError('');
    setPendingApproval(false);

    const res = await login(phone, password);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      if (res.status === 'pending_approval' || res.message?.includes('Waiting for Admin approval')) {
        setPendingApproval(true);
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign In to UniStay</h2>
              <p className="text-xs text-slate-500">Main Admin & House Agent Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {pendingApproval ? (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="font-extrabold text-xs tracking-tight">
                    Waiting for Admin approval maximum time 2hrs
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    Your credentials are under review by the Main Admin. Once approved, you can sign in here to manage your listings.
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/919041543868?text=${encodeURIComponent(
                  `Hello Admin! I have submitted my application to become a House Agent on UniStay (Phone: ${phone}). Please review and approve my account credentials.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Admin to Fast-Track (+91 9041543868)</span>
              </a>
            </div>
          ) : error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <CountryPhoneInput
              value={phone}
              onChange={setPhone}
              placeholder="98765 43210"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Want to list rooms on UniStay?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBecomeAgent();
              }}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Apply to Become a House Agent
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
