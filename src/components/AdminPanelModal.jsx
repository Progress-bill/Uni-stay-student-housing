import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Users, 
  Home, 
  Check, 
  Clock, 
  Phone, 
  MapPin, 
  RefreshCw, 
  MessageCircle,
  Building2,
  Lock
} from 'lucide-react';

export default function AdminPanelModal({ 
  isOpen, 
  onClose, 
  listings, 
  onUpdateRoomStatus, 
  onRefreshListings 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'rooms'
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appError, setAppError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch applications
  const fetchApplications = async () => {
    setLoadingApps(true);
    setAppError('');
    try {
      const res = await fetch('/api/agent-applications');
      const data = await res.json();
      if (data.success) {
        setApplications(data.data || []);
      } else {
        setAppError('Failed to fetch applications.');
      }
    } catch (err) {
      setAppError('Server connection error.');
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
    }
  }, [isOpen]);

  // Handle Approve or Reject
  const handleApplicationAction = async (appId, action) => {
    setActionInProgress(appId);
    try {
      const res = await fetch(`/api/agent-applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setApplications(prev =>
          prev.map(app => (app.id === appId ? data.data : app))
        );
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      alert('Error updating application');
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const availableCount = listings.filter(l => l.status === 'available' || !l.status).length;
  const occupiedCount = listings.filter(l => l.status === 'occupied').length;
  const reservedCount = listings.filter(l => l.status === 'reserved').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Main Admin Control Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage Landlord contacts, agent requests & room statuses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Pending Agent Requests</span>
            <div className="text-lg font-black text-amber-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {pendingCount}
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Available Rooms</span>
            <div className="text-lg font-black text-emerald-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {availableCount}
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Booked / Occupied</span>
            <div className="text-lg font-black text-rose-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {occupiedCount}
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Reserved / Token Paid</span>
            <div className="text-lg font-black text-amber-600 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {reservedCount}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white gap-4">
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Agent Join Requests</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Room Status & Landlord Management</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {listings.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          
          {/* TAB 1: AGENT JOIN REQUESTS */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">
                  Review agent candidates. You must accept their application to activate their account.
                </p>
                <button
                  onClick={fetchApplications}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingApps ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingApps ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading agent applications...
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No agent applications received yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        app.status === 'pending'
                          ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                          : app.status === 'approved'
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{app.fullName}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              app.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : app.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {app.status === 'pending' ? 'Needs Your Approval' : app.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
                            <span className="flex items-center gap-1 font-bold text-slate-800">
                              <Phone className="w-3.5 h-3.5 text-slate-500" /> {app.phone}
                            </span>
                            {app.area && (
                              <span className="flex items-center gap-1 font-sans text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {app.area}
                              </span>
                            )}
                          </div>

                          {app.experience && (
                            <p className="text-xs text-slate-600 mt-1 italic bg-white/70 p-2 rounded-xl border border-slate-200/60">
                              "{app.experience}"
                            </p>
                          )}
                        </div>

                        {/* Action Buttons for Pending */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {app.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApplicationAction(app.id, 'approve')}
                                disabled={actionInProgress === app.id}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Accept Agent</span>
                              </button>
                              <button
                                onClick={() => handleApplicationAction(app.id, 'reject')}
                                disabled={actionInProgress === app.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : app.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                              <Check className="w-3.5 h-3.5" /> Account Activated
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-xl">
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROOM STATUS & LANDLORD MANAGEMENT */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Manage all rooms with their exact GPS addresses and <strong>private Landlord phone numbers</strong>. Update booking status with 1 click.
              </p>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {listings.map((room) => {
                  const currentStatus = room.status || 'available';
                  return (
                    <div key={room.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                      
                      {/* Left: Thumbnail & Room Info */}
                      <div className="flex items-start gap-3 flex-1">
                        {room.images && room.images[0] && (
                          <img
                            src={room.images[0]}
                            alt={room.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                              {room.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              currentStatus === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : currentStatus === 'occupied'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {currentStatus === 'available' ? 'Available' : currentStatus === 'occupied' ? 'Booked' : 'Reserved'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800">₹{room.rentAmount?.toLocaleString()}/mo</span>
                            <span>•</span>
                            <span>⚡ ₹{room.electricityPerUnit}/unit</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 font-mono text-slate-600">
                              <MapPin className="w-3 h-3 text-blue-500" /> {room.address}
                            </span>
                          </div>

                          {/* Private Landlord Contact Strip */}
                          <div className="pt-1 flex items-center gap-2 text-xs">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-medium">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Landlord: <strong>{room.landlordName || 'Owner'}</strong></span>
                              <span className="font-mono font-bold text-slate-900 ml-1">
                                {room.landlordPhone || 'No phone'}
                              </span>
                              {room.landlordPhone && (
                                <a
                                  href={`tel:${room.landlordPhone}`}
                                  className="ml-1 text-blue-600 hover:underline font-bold"
                                >
                                  Call
                                </a>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Right: Change Status Dropdown */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500">Live Status:</span>
                        <select
                          value={currentStatus}
                          onChange={(e) => onUpdateRoomStatus(room.id, e.target.value)}
                          className={`text-xs font-bold rounded-xl px-3 py-1.5 border outline-none cursor-pointer transition-all ${
                            currentStatus === 'available'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : currentStatus === 'occupied'
                              ? 'bg-rose-50 border-rose-300 text-rose-800'
                              : 'bg-amber-50 border-amber-300 text-amber-800'
                          }`}
                        >
                          <option value="available">🟢 Available</option>
                          <option value="occupied">🔴 Booked</option>
                          <option value="reserved">🟡 Reserved</option>
                        </select>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
