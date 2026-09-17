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
  Lock,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  Search,
  CheckCircle2,
  Cloud,
  HardDrive,
  ExternalLink,
  BarChart3,
  Database
} from 'lucide-react';

export default function AdminPanelModal({ 
  isOpen, 
  onClose, 
  listings, 
  onUpdateRoomStatus, 
  onRefreshListings 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'manage_agents' | 'del_requests' | 'rooms'
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appError, setAppError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  // Listing Deletion Requests state
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [loadingDelRequests, setLoadingDelRequests] = useState(false);
  const [delReqActionInProgress, setDelReqActionInProgress] = useState(null);

  // Registered Agents Management state
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [suspendModalAgent, setSuspendModalAgent] = useState(null);
  const [suspendDuration, setSuspendDuration] = useState('24'); // '12' | '24' | '72' | '168' | '720' | 'custom'
  const [customSuspendHours, setCustomSuspendHours] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [agentActionLoading, setAgentActionLoading] = useState(null);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState(null);

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

  // Fetch registered agents
  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Fetch deletion requests
  const fetchDeleteRequests = async () => {
    setLoadingDelRequests(true);
    try {
      const res = await fetch('/api/delete-requests');
      const data = await res.json();
      if (data.success) {
        setDeleteRequests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching deletion requests:', err);
    } finally {
      setLoadingDelRequests(false);
    }
  };

  // Cloudinary Storage Usage state
  const [cloudinaryUsage, setCloudinaryUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState('');

  // Fetch Cloudinary storage usage
  const fetchCloudinaryUsage = async () => {
    setLoadingUsage(true);
    setUsageError('');
    try {
      const res = await fetch('/api/admin/cloudinary/usage');
      const data = await res.json();
      if (data.success) {
        setCloudinaryUsage(data.data);
      } else {
        setUsageError(data.message || 'Failed to fetch cloud storage metrics');
      }
    } catch (err) {
      setUsageError('Could not connect to Cloudinary monitoring service');
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchApplications();
      fetchDeleteRequests();
      fetchAgents();
      fetchCloudinaryUsage();
    }
  }, [isOpen]);

  // Handle Approve or Reject for Agent Application
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
        if (action === 'approve') {
          fetchAgents();
        }
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      alert('Error updating application');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Approve or Reject for Listing Deletion Request
  const handleDeleteRequestAction = async (reqId, action) => {
    setDelReqActionInProgress(reqId);
    try {
      const res = await fetch(`/api/delete-requests/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteRequests(prev =>
          prev.map(r => (r.id === reqId ? data.data : r))
        );
        if (action === 'approve' && onRefreshListings) {
          onRefreshListings();
        }
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      alert('Error updating deletion request');
    } finally {
      setDelReqActionInProgress(null);
    }
  };

  // Handle Suspend Agent
  const handleSuspendAgent = async (e) => {
    e.preventDefault();
    if (!suspendModalAgent) return;

    const hours = parseFloat(suspendDuration === 'custom' ? customSuspendHours : suspendDuration);
    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid number of hours for suspension.');
      return;
    }

    setAgentActionLoading(suspendModalAgent.id);
    try {
      const res = await fetch(`/api/admin/agents/${suspendModalAgent.id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationHours: hours,
          reason: suspendReason.trim() || 'Misconduct or violation of housing guidelines'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAgents(prev => prev.map(a => a.id === suspendModalAgent.id ? data.data : a));
        setSuspendModalAgent(null);
        setSuspendReason('');
        setCustomSuspendHours('');
      } else {
        alert(data.message || 'Failed to suspend agent');
      }
    } catch (err) {
      alert('Error suspending agent');
    } finally {
      setAgentActionLoading(null);
    }
  };

  // Handle Lift Suspension (Unsuspend)
  const handleUnsuspendAgent = async (agentId) => {
    setAgentActionLoading(agentId);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/unsuspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(prev => prev.map(a => a.id === agentId ? data.data : a));
      } else {
        alert(data.message || 'Failed to unsuspend agent');
      }
    } catch (err) {
      alert('Error lifting suspension');
    } finally {
      setAgentActionLoading(null);
    }
  };

  // Handle Delete Agent Account
  const handleDeleteAgent = async (agentId) => {
    setAgentActionLoading(agentId);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setAgents(prev => prev.filter(a => a.id !== agentId));
        setDeleteConfirmAgent(null);
        fetchApplications();
      } else {
        alert(data.message || 'Failed to delete agent');
      }
    } catch (err) {
      alert('Error deleting agent');
    } finally {
      setAgentActionLoading(null);
    }
  };

  // Format WhatsApp message to send to Agent upon approval
  const getAgentApprovalWhatsAppUrl = (app) => {
    if (!app?.phone) return '#';
    const cleanDigits = app.phone.replace(/[^\d]/g, '');
    const message = encodeURIComponent(
      `Hello ${app.fullName}! 🎉\n\nYour House Agent application for UniStay has been APPROVED by the Main Admin. Your account credentials are now active.\n\nYou can now sign in at the portal with your phone number (${app.phone}) to list student PG rooms and manage walkthrough video tours.`
    );
    return `https://wa.me/${cleanDigits}?text=${message}`;
  };

  // Format WhatsApp message for managing agent (suspension notice / general)
  const getAgentWhatsAppUrl = (agent, actionType = 'general') => {
    if (!agent?.phone) return '#';
    const cleanDigits = agent.phone.replace(/[^\d]/g, '');
    let msg = '';
    if (actionType === 'suspend') {
      msg = `Hello ${agent.name}. Notice: Your UniStay House Agent account has been temporarily suspended until ${agent.suspendedUntil ? new Date(agent.suspendedUntil).toLocaleString() : ''} for: "${agent.suspensionReason || 'Violation of portal guidelines'}". Please contact Main Admin (+91 9041543868) if you wish to appeal.`;
    } else {
      msg = `Hello ${agent.name}, this is the Main Admin from UniStay regarding your House Agent account.`;
    }
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(msg)}`;
  };

  const pendingAppsCount = applications.filter(a => a.status === 'pending').length;
  const activeAgentsCount = agents.filter(a => a.status !== 'suspended').length;
  const suspendedAgentsCount = agents.filter(a => a.status === 'suspended').length;
  const pendingDelReqCount = deleteRequests.filter(r => r.status === 'pending').length;
  const availableCount = listings.filter(l => l.status === 'available' || !l.status).length;
  const occupiedCount = listings.filter(l => l.status === 'occupied').length;

  const filteredAgents = agents.filter(agent => {
    const q = agentSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      agent.name?.toLowerCase().includes(q) ||
      agent.phone?.includes(q) ||
      agent.area?.toLowerCase().includes(q);
    const matchesFilter = agentFilter === 'all' || 
      (agentFilter === 'active' && agent.status !== 'suspended') ||
      (agentFilter === 'suspended' && agent.status === 'suspended');
    return matchesSearch && matchesFilter;
  });

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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Pending Join Requests</span>
            <div className="text-lg font-black text-amber-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {pendingAppsCount}
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Registered Agents</span>
            <div className="text-lg font-black text-indigo-600 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> {agents.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {activeAgentsCount} active • {suspendedAgentsCount} suspended
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Pending Delete Req.</span>
            <div className="text-lg font-black text-rose-600 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> {pendingDelReqCount}
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
            <div className="text-lg font-black text-slate-700 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> {occupiedCount}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white gap-3 sm:gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Agent Join Requests</span>
            {pendingAppsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                {pendingAppsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('manage_agents')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'manage_agents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Manage Agents</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {agents.length}
            </span>
            {suspendedAgentsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white" title={`${suspendedAgentsCount} suspended`}>
                {suspendedAgentsCount} suspended
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('del_requests')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'del_requests'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Listing Deletion Requests</span>
            {pendingDelReqCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                {pendingDelReqCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
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

          <button
            onClick={() => setActiveTab('cloudinary')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'cloudinary'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Cloud Storage</span>
            {cloudinaryUsage ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                {cloudinaryUsage.credits.usage} / {cloudinaryUsage.credits.limit} Credits
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Cloudinary
              </span>
            )}
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
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                                <Check className="w-3.5 h-3.5" /> Account Activated
                              </span>
                              <a
                                href={getAgentApprovalWhatsAppUrl(app)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                                title="Send approval WhatsApp notification to agent"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Send Approval WhatsApp</span>
                              </a>
                            </div>
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

          {/* TAB 2: MANAGE REGISTERED AGENTS */}
          {activeTab === 'manage_agents' && (
            <div className="space-y-4">
              
              {/* Header info & filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Agent Management & Wrong-Doing Control</span>
                  </h3>
                  <p className="text-xs text-indigo-700/80 mt-0.5">
                    Suspend agents for misconduct for a specified time or permanently delete their account.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search agent..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 w-36 sm:w-44"
                    />
                  </div>
                  
                  <select
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All ({agents.length})</option>
                    <option value="active">Active ({activeAgentsCount})</option>
                    <option value="suspended">Suspended ({suspendedAgentsCount})</option>
                  </select>

                  <button
                    onClick={fetchAgents}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer hover:bg-white transition-colors"
                    title="Refresh agents"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAgents ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Agent Cards List */}
              {loadingAgents ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading registered agents...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  {agentSearch ? 'No agents match your search query.' : 'No registered house agents found.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAgents.map((agent) => {
                    const isSuspended = agent.status === 'suspended';
                    const suspendedDate = agent.suspendedUntil ? new Date(agent.suspendedUntil) : null;
                    const isActionBusy = agentActionLoading === agent.id;

                    return (
                      <div
                        key={agent.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSuspended 
                            ? 'bg-rose-50/40 border-rose-300 shadow-xs' 
                            : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          
                          {/* Left: Agent Info */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{agent.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                House Agent
                              </span>
                              {isSuspended ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  <Clock className="w-3 h-3 text-rose-600" />
                                  Suspended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {agent.phone}
                              </span>
                              {agent.area && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {agent.area}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold">
                                <Building2 className="w-3 h-3 text-blue-500" />
                                {agent.roomCount || 0} Room{agent.roomCount === 1 ? '' : 's'} Listed
                              </span>
                            </div>

                            {/* Suspended Details Card if Suspended */}
                            {isSuspended && (
                              <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1.5 text-xs text-rose-950 shadow-inner">
                                <div className="flex items-center justify-between text-rose-800 font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    Suspended until: {suspendedDate ? suspendedDate.toLocaleString() : 'Indefinite'}
                                  </span>
                                </div>
                                {agent.suspensionReason && (
                                  <p className="text-[11px] text-rose-900 bg-rose-50/80 p-2 rounded-lg font-mono">
                                    <strong>Wrong-doing / Reason:</strong> {agent.suspensionReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                            
                            {/* WhatsApp Direct */}
                            <a
                              href={getAgentWhatsAppUrl(agent, isSuspended ? 'suspend' : 'general')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                              title="Chat with agent on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>

                            {/* Suspend or Lift Suspension */}
                            {isSuspended ? (
                              <button
                                onClick={() => handleUnsuspendAgent(agent.id)}
                                disabled={isActionBusy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Lift Suspension</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSuspendModalAgent(agent);
                                  setSuspendDuration('24');
                                  setCustomSuspendHours('');
                                  setSuspendReason('');
                                }}
                                disabled={isActionBusy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Suspend Agent</span>
                              </button>
                            )}

                            {/* Permanent Deletion Button */}
                            <button
                              onClick={() => setDeleteConfirmAgent(agent)}
                              disabled={isActionBusy}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                              title="Permanently remove agent account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>

                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: LISTING DELETION REQUESTS */}
          {activeTab === 'del_requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">
                  Review deletion requests from house agents. Agents cannot delete listings directly without your approval.
                </p>
                <button
                  onClick={fetchDeleteRequests}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDelRequests ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingDelRequests ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading deletion requests...
                </div>
              ) : deleteRequests.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No listing deletion requests received yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {deleteRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        req.status === 'pending'
                          ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                          : req.status === 'approved'
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-start gap-3 flex-1">
                          {req.listingImage ? (
                            <img
                              src={req.listingImage}
                              alt={req.listingTitle}
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] shrink-0 font-bold">
                              No Image
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{req.listingTitle}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                req.status === 'pending'
                                  ? 'bg-rose-100 text-rose-800'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {req.status === 'pending' ? 'Needs Your Approval' : req.status === 'approved' ? 'Approved & Deleted' : 'Rejected'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {req.listingRent && <span className="font-bold text-slate-800">₹{req.listingRent?.toLocaleString()}/mo</span>}
                              {req.listingAddress && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5 text-slate-600">
                                    <MapPin className="w-3 h-3 text-blue-500" /> {req.listingAddress}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>Agent: <strong className="text-slate-700">{req.agentName}</strong> {req.agentPhone && `(${req.agentPhone})`}</span>
                            </div>

                            {/* Required Reason Text Box Content */}
                            <div className="mt-2 p-2.5 bg-white/90 rounded-xl border border-rose-200/70 text-xs">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1 mb-0.5">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Agent's Reason for Deletion:
                              </div>
                              <p className="text-slate-800 font-medium italic">
                                "{req.reason}"
                              </p>
                            </div>

                            <p className="text-[10px] text-slate-400 font-mono mt-1">
                              Requested on: {new Date(req.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleDeleteRequestAction(req.id, 'approve')}
                                disabled={delReqActionInProgress === req.id}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Approve & Delete</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRequestAction(req.id, 'reject')}
                                disabled={delReqActionInProgress === req.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                              >
                                <span>Reject</span>
                              </button>
                            </>
                          ) : req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                              <Check className="w-3.5 h-3.5" /> Listing Deleted
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

          {/* TAB 4: ROOM STATUS & LANDLORD MANAGEMENT */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">
                  Direct Landlord contact directory and live room availability management.
                </p>
                <span className="text-xs font-bold text-slate-500">
                  {listings.length} Listed Properties
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                {listings.map((room) => {
                  const currentStatus = room.status || 'available';
                  return (
                    <div
                      key={room.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Left: Room & Landlord Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {room.images && room.images[0] ? (
                            <img
                              src={room.images[0]}
                              alt={room.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400">
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {room.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {room.address || 'Address Hidden (Admin Only)'}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-600">
                            <span className="font-extrabold text-blue-700">
                              ₹{room.rentAmount} <span className="font-normal text-slate-400">/mo</span>
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-1 font-semibold text-slate-800">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Landlord: {room.landlordName || 'N/A'} ({room.landlordPhone || 'No Phone'})</span>
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

          {/* TAB 5: CLOUDINARY CLOUD STORAGE MONITORING */}
          {activeTab === 'cloudinary' && (
            <div className="space-y-6">
              {/* Header Strip with Refresh & Console Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 text-white rounded-3xl shadow-md border border-sky-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shadow-inner">
                    <Cloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white">Cloudinary Media Storage</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Live Connected
                      </span>
                    </div>
                    <p className="text-xs text-sky-200">
                      Cloud Name: <span className="font-mono font-bold text-white">{cloudinaryUsage?.cloudName || 'v1iyctik'}</span> • Plan: <span className="font-bold text-amber-300">{cloudinaryUsage?.plan || 'Free'} (25 Credits / 25 GB)</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={fetchCloudinaryUsage}
                    disabled={loadingUsage}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Fetch latest usage metrics from Cloudinary"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsage ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <a
                    href="https://console.cloudinary.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Open Cloudinary</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Loading State */}
              {loadingUsage && !cloudinaryUsage && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <RefreshCw className="w-7 h-7 animate-spin text-sky-600" />
                  <p className="text-xs font-semibold">Connecting to Cloudinary API...</p>
                </div>
              )}

              {/* Error State */}
              {usageError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{usageError}</span>
                  </div>
                  <button
                    onClick={fetchCloudinaryUsage}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Metric KPI Cards */}
              {cloudinaryUsage && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Credits / Quota */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Total Monthly Credits</span>
                        <BarChart3 className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">
                          {cloudinaryUsage.credits.usage.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          / {cloudinaryUsage.credits.limit} Credits
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cloudinaryUsage.credits.usedPercent > 80
                              ? 'bg-red-500'
                              : cloudinaryUsage.credits.usedPercent > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(cloudinaryUsage.credits.usedPercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                        <span>Used: <strong>{cloudinaryUsage.credits.usedPercent}%</strong></span>
                        <span className="text-emerald-700 font-bold">{(cloudinaryUsage.credits.limit - cloudinaryUsage.credits.usage).toFixed(2)} Credits free</span>
                      </p>
                    </div>

                    {/* Card 2: Cloud Storage Used */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Storage Occupied</span>
                        <HardDrive className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-blue-700">
                          {(cloudinaryUsage.storage.bytes / (1024 * 1024)).toFixed(1)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">MB</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Permanent cloud storage holding room video walkthroughs and cover photos.
                      </p>
                    </div>

                    {/* Card 3: Bandwidth Delivered */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Monthly Bandwidth</span>
                        <Cloud className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-indigo-700">
                          {(cloudinaryUsage.bandwidth.bytes / (1024 * 1024)).toFixed(1)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">MB Streamed</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Data streamed to students watching room video tours this billing cycle.
                      </p>
                    </div>

                    {/* Card 4: Total Stored Assets */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Total Media Assets</span>
                        <Database className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-emerald-700">
                          {cloudinaryUsage.resources}
                        </span>
                        <span className="text-xs font-bold text-slate-500">files</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Total videos and images active in your Cloudinary repository.
                      </p>
                    </div>
                  </div>

                  {/* Auto-Optimization & Limits Info Box */}
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-emerald-950">Automatic Cloud Storage Cleanup Active</h4>
                        <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                          When you or an authorized agent deletes a room listing, the backend automatically calls the Cloudinary API to permanently purge the video tour and photos, freeing up your free tier quota immediately.
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right sm:text-right pl-11 sm:pl-0">
                      <span className="font-mono text-[10px] text-emerald-700 block">
                        API Rate Limit: {cloudinaryUsage.rateLimitRemaining} / {cloudinaryUsage.rateLimitAllowed} calls left
                      </span>
                      <span className="text-[10px] text-emerald-600">
                        Updated: {cloudinaryUsage.lastUpdated || 'Today'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Suspend Agent Modal */}
      {suspendModalAgent && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-amber-600 font-extrabold text-sm">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Suspend Agent for Wrong-Doing</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {suspendModalAgent.name} ({suspendModalAgent.phone})
                </p>
              </div>
              <button
                onClick={() => setSuspendModalAgent(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSuspendAgent} className="pt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Suspension Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '12', label: '12 Hours' },
                    { id: '24', label: '24 Hours (1 Day)' },
                    { id: '72', label: '3 Days' },
                    { id: '168', label: '7 Days' },
                    { id: '720', label: '30 Days' },
                    { id: 'custom', label: 'Custom' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSuspendDuration(opt.id)}
                      className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        suspendDuration === opt.id
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {suspendDuration === 'custom' && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter hours (e.g. 48)"
                      value={customSuspendHours}
                      onChange={(e) => setCustomSuspendHours(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500 text-xs font-semibold"
                      required
                    />
                    <span className="text-slate-500 font-semibold">Hours</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Wrong-Doing / Suspension Note
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify wrong-doing (e.g., misrepresenting room prices, posting false photographs, unverified landlord contact, student misconduct)..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500 text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note will be shown directly to the agent if they attempt to sign in during their suspension.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSuspendModalAgent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agentActionLoading === suspendModalAgent.id}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {agentActionLoading === suspendModalAgent.id ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAgent && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-extrabold text-slate-900">
              Permanently Delete Agent?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete agent <strong>{deleteConfirmAgent.name}</strong> ({deleteConfirmAgent.phone})?
            </p>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 text-left leading-tight font-medium">
              ⚠️ This will permanently remove their credentials and access from UniStay. They will no longer be able to log in or manage listings.
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgent(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAgent(deleteConfirmAgent.id)}
                disabled={agentActionLoading === deleteConfirmAgent.id}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                {agentActionLoading === deleteConfirmAgent.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
