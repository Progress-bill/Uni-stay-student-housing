import React, { useRef, useState } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  MessageCircle, 
  Zap, 
  MapPin, 
  Building2,
  Lock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VideoPlayerModal({ room, onClose }) {
  if (!room || !room.videoUrl) return null;

  const { isAdmin, isAgent, user } = useAuth();
  const [isPip, setIsPip] = useState(false);
  const videoRef = useRef(null);

  const formatPrice = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const getWhatsAppUrl = () => {
    let msg = '';
    if (isAgent) {
      const agentIdentifier = user?.name ? `Agent ${user.name} (${user.phone})` : (user?.phone ? `Agent (${user.phone})` : 'an active House Agent');
      msg = `Hello Admin! I am ${agentIdentifier}. I just reviewed the video tour for room "${room.title}" (Rent: ${formatPrice(room.rentAmount)}/mo). I have a client who wants this room and I am inquiring about the current room status — is it still vacant and available for my client to book?`;
    } else {
      msg = `Hello Admin! I just watched the video tour of "${room.title}" (Rent: ${formatPrice(room.rentAmount)}/mo, Electricity: ₹${room.electricityPerUnit}/unit). I want to schedule a visit!`;
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

        {/* Video Player */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={room.videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
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
