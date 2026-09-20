import React, { useRef, useState } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  MessageCircle, 
  Zap, 
  MapPin, 
  Building2,
  Lock,
  Bed,
  UtensilsCrossed,
  Bath,
  GitFork,
  ArrowRight,
  ArrowLeft,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VideoPlayerModal({ room, onClose }) {
  if (!room || (!room.videoUrl && !room.videoTree)) return null;

  const { isAdmin, isAgent, user } = useAuth();
  const [isPip, setIsPip] = useState(false);
  const videoRef = useRef(null);

  // Derive tree structure (with backward compatibility)
  const videoTree = room.videoTree || {
    root: room.videoUrl ? { id: 'sleeping_room', title: 'Sleeping Room', role: 'root', url: room.videoUrl } : null,
    left: null,
    right: null
  };

  const [activeNodeKey, setActiveNodeKey] = useState(() => {
    if (videoTree.root?.url) return 'root';
    if (videoTree.left?.url) return 'left';
    if (videoTree.right?.url) return 'right';
    return 'root';
  });

  const activeNode = videoTree[activeNodeKey] || videoTree.root || { title: 'Sleeping Room', url: room.videoUrl };
  const currentVideoUrl = activeNode?.url || room.videoUrl;

  const handleSwitchNode = (nodeKey) => {
    setActiveNodeKey(nodeKey);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const formatPrice = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const getWhatsAppUrl = () => {
    let msg = '';
    const sectionName = activeNode?.title || 'Sleeping Room';
    if (isAgent) {
      const agentIdentifier = user?.name ? `Agent ${user.name} (${user.phone})` : (user?.phone ? `Agent (${user.phone})` : 'an active House Agent');
      msg = `Hello Admin! I am ${agentIdentifier}. I reviewed the 3-part room tour (currently viewing: ${sectionName}) for "${room.title}" (Rent: ${formatPrice(room.rentAmount)}/mo). I have a client who wants this room and I am inquiring about the current room status — is it still vacant and available for my client to book?`;
    } else {
      msg = `Hello Admin! I am watching the ${sectionName} video tour of "${room.title}" (Rent: ${formatPrice(room.rentAmount)}/mo, Electricity: ₹${room.electricityPerUnit}/unit). I want to schedule a visit!`;
    }
    return `https://wa.me/919041543868?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isPip
          ? 'bottom-6 right-6 w-96 max-w-[90vw] shadow-2xl rounded-2xl overflow-hidden border border-slate-700/50'
          : 'inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6'
      }`}
    >
      <div 
        className={`bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isPip ? 'w-full' : 'w-full max-w-4xl max-h-[90vh]'
        }`}
      >
        {/* Video Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold truncate text-slate-200">
              Video Tour: {room.title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600/25 text-blue-300 border border-blue-500/30">
              <GitFork className="w-2.5 h-2.5 rotate-180" />
              {activeNode?.title || 'Room Tour'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPip(!isPip)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isPip ? 'Expand' : 'Picture-in-Picture Mini View'}
            >
              {isPip ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Video"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tree Navigation Selector Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 w-full justify-center">
            {/* Left Child: Kitchen */}
            <button
              type="button"
              onClick={() => videoTree.left?.url && handleSwitchNode('left')}
              disabled={!videoTree.left?.url}
              className={`flex-1 max-w-[200px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeNodeKey === 'left'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-1 ring-amber-400'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">Kitchen (Left)</span>
            </button>

            {/* Root Node: Sleeping Room */}
            <button
              type="button"
              onClick={() => videoTree.root?.url && handleSwitchNode('root')}
              disabled={!videoTree.root?.url}
              className={`flex-1 max-w-[240px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeNodeKey === 'root'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Bed className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">Sleeping Room (Root)</span>
            </button>

            {/* Right Child: Washing Room */}
            <button
              type="button"
              onClick={() => videoTree.right?.url && handleSwitchNode('right')}
              disabled={!videoTree.right?.url}
              className={`flex-1 max-w-[200px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeNodeKey === 'right'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-1 ring-teal-400'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Bath className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate">Washing Room (Right)</span>
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            key={currentVideoUrl}
            src={currentVideoUrl}
            controls
            autoPlay
            muted
            defaultMuted
            playsInline
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>

          {/* Muted Tour Badge Indicator */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-slate-200 border border-white/10 shadow-sm">
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Muted Walkthrough</span>
            </span>
          </div>

          {/* In-Video Tree Quick Branch Navigators (Floating overlay buttons) */}
          <div className="absolute bottom-14 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
            {activeNodeKey === 'root' ? (
              <>
                {videoTree.left?.url ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchNode('left')}
                    className="pointer-events-auto flex items-center gap-1.5 bg-black/75 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-3 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>View Kitchen (Left)</span>
                  </button>
                ) : <span />}

                {videoTree.right?.url && (
                  <button
                    type="button"
                    onClick={() => handleSwitchNode('right')}
                    className="pointer-events-auto flex items-center gap-1.5 bg-black/75 hover:bg-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-lg cursor-pointer"
                  >
                    <span>View Washing Room (Right)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </>
            ) : (
              <div className="w-full flex justify-center pointer-events-auto">
                {videoTree.root?.url && (
                  <button
                    type="button"
                    onClick={() => handleSwitchNode('root')}
                    className="flex items-center gap-1.5 bg-black/75 hover:bg-blue-600 text-white text-xs font-bold py-1.5 px-3.5 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-lg cursor-pointer"
                  >
                    <Bed className="w-3 h-3 text-blue-400" />
                    <span>Return to Sleeping Room (Root)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Video Details Bar */}
        {!isPip && (
          <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    {formatPrice(room.rentAmount)}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                    <Zap className="w-3 h-3 fill-amber-400" />
                    ₹{room.electricityPerUnit} / unit
                  </span>
                </div>

                {/* Location: Shown to Admin, Hidden from Students */}
                {isAdmin ? (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {room.address}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Student Room Tour
                  </p>
                )}
              </div>

              {/* Action Button to WhatsApp Admin (+91 9041543868) */}
              <div className="flex items-center gap-2">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  title={isAgent ? "Inquire room status with Admin for your client" : "Book Visit on WhatsApp (+91 9041543868)"}
                >
                  <MessageCircle className="w-4 h-4" />
                  {isAgent ? 'Inquire Room Status for Client' : 'Book Visit on WhatsApp (+91 9041543868)'}
                </a>
              </div>
            </div>

            {/* Amenity Badges in Player */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Features:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                room.landlordAtPG ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {room.landlordAtPG ? 'Landlord at PG' : 'No Landlord (Freedom)'}
              </span>
              {room.electricityBackup && (
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                  ⚡ Power Backup
                </span>
              )}
              {room.acRoom && (
                <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[11px]">
                  ❄️ AC Room
                </span>
              )}
              {room.waterGeyser && (
                <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[11px]">
                  🚿 Water Geyser
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
