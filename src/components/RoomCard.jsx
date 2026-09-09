import React from 'react';
import { 
  MapPin, 
  Video, 
  Zap, 
  Wind, 
  Flame, 
  UserCheck, 
  UserX, 
  MessageCircle, 
  Trash2, 
  Tag, 
  Phone,
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoomCard({ 
  room, 
  onWatchVideo, 
  onSelectMapPin, 
  onDeleteListing,
  onUpdateStatus,
  isSelected 
}) {
  const { user, isAdmin, isAgent } = useAuth();
  const currentStatus = room.status || 'available';

  // Check if current user can manage this listing (Main Admin or owner Agent)
  const canManageListing = isAdmin || (isAgent && room.agentId === user?.id);

  const formatPrice = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  // WhatsApp Inquiry URL -> Direct to Main Admin WhatsApp +91 9041543868
  const getWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Hello Admin! I am a student interested in "${room.title}" (${currentStatus.toUpperCase()}) listed for ${formatPrice(room.rentAmount)}/mo (Electricity: ₹${room.electricityPerUnit}/unit). Could you please share visit details?`
    );
    return `https://wa.me/919041543868?text=${text}`;
  };

  // Direct WhatsApp to Landlord (Admin only)
  const getLandlordWhatsAppUrl = () => {
    if (!room.landlordPhone) return '#';
    const cleanDigits = room.landlordPhone.replace(/[^\d]/g, '');
    const text = encodeURIComponent(`Hello ${room.landlordName || 'Landlord'}, regarding your room listing "${room.title}" on UniStay:`);
    return `https://wa.me/${cleanDigits}?text=${text}`;
  };

  return (
    <div 
      className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
        isSelected 
          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xl' 
          : 'border-slate-200/90 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* Media / Video Preview Header */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {room.images && room.images.length > 0 ? (
          <img
            src={room.images[0]}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
            No Preview Image
          </div>
        )}

        {/* Video Tour Play Button */}
        {room.videoUrl && (
          <button
            onClick={() => onWatchVideo(room)}
            className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg backdrop-blur-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10"
            title="Watch Room Tour Video"
          >
            <Video className="w-6 h-6 ml-0.5" />
          </button>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          
          {/* Availability Status Badge */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-sm flex items-center gap-1.5 ${
            currentStatus === 'available'
              ? 'bg-emerald-600/95 text-white'
              : currentStatus === 'occupied'
              ? 'bg-rose-600/95 text-white'
              : 'bg-amber-600/95 text-white'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              currentStatus === 'available' ? 'bg-emerald-200 animate-pulse' : 'bg-white'
            }`} />
            {currentStatus === 'available' ? 'Available' : currentStatus === 'occupied' ? 'Booked' : 'Reserved'}
          </span>

          {room.videoUrl && (
            <span className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>Video Tour</span>
            </span>
          )}
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          
          {/* Rent & Electricity Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatPrice(room.rentAmount)}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ month</span>
              </div>
            </div>

            {/* Prominent Electricity Per Unit Badge */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-2.5 py-1 text-right">
              <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider flex items-center gap-0.5 justify-end">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                Electricity
              </div>
              <div className="text-xs font-extrabold text-amber-900">
                ₹{room.electricityPerUnit} <span className="font-medium text-[10px]">/ unit</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
            {room.title}
          </h3>

          {/* Location / Privacy Logic:
              - Admin sees exact address and GPS pin trigger.
              - Students/Guests see only general verified badge (NO address or GPS pin).
          */}
          {isAdmin ? (
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
              <span className="truncate flex items-center gap-1 font-mono text-[11px] text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                {room.address || 'Student Hub Location'}
              </span>
              <button
                onClick={() => onSelectMapPin(room)}
                className="text-blue-600 hover:text-blue-700 font-bold text-[11px] whitespace-nowrap ml-2 cursor-pointer flex items-center gap-0.5"
              >
                Pin on Map
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified Student PG Room</span>
            </div>
          )}

          {/* Agent info badge */}
          {room.agentName && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              <span>Listed by: <strong className="text-slate-600">{room.agentName}</strong></span>
            </div>
          )}

          {/* Description */}
          <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {room.description}
          </p>

          {/* Student Amenities Badges (Landlord Presence, Backup, AC, Geyser) */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              room.landlordAtPG
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {room.landlordAtPG ? (
                <>
                  <UserCheck className="w-3 h-3 text-amber-600" />
                  Landlord at PG
                </>
              ) : (
                <>
                  <UserX className="w-3 h-3 text-emerald-600" />
                  No Landlord (Freedom)
                </>
              )}
            </span>

            {room.electricityBackup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                Power Backup
              </span>
            )}

            {room.acRoom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Wind className="w-3 h-3 text-sky-600" />
                AC Room
              </span>
            )}

            {room.waterGeyser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <Flame className="w-3 h-3 text-rose-600" />
                Geyser
              </span>
            )}
          </div>

          {/* Custom Category Tags */}
          {room.customCategories && room.customCategories.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {room.customCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* MAIN ADMIN ONLY: Private Landlord Contact Card */}
          {isAdmin && (
            <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1.5 text-xs text-amber-950">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Landlord (Private):
                </span>
                <span className="font-semibold text-slate-700 text-[11px]">
                  {room.landlordName || 'Owner'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {room.landlordPhone || 'No phone set'}
                </span>
                {room.landlordPhone && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${room.landlordPhone}`}
                      className="p-1 px-2 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1"
                      title="Call Landlord"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    <a
                      href={getLandlordWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                      title="WhatsApp Landlord"
                    >
                      <MessageCircle className="w-3 h-3" /> WA
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Admin / Owner Agent Status Control Strip */}
          {canManageListing && onUpdateStatus && (
            <div className="mt-3 p-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                {isAdmin ? '👑 Admin Status:' : '🏠 Agent Status:'}
              </span>
              <select
                value={currentStatus}
                onChange={(e) => onUpdateStatus(room.id, e.target.value)}
                className={`text-[11px] font-bold rounded-lg px-2 py-1 border outline-none cursor-pointer ${
                  currentStatus === 'available'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : currentStatus === 'occupied'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <option value="available">🟢 Available</option>
                <option value="occupied">🔴 Booked</option>
                <option value="reserved">🟡 Reserved</option>
              </select>
            </div>
          )}

        </div>

        {/* Action Buttons Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          
          {/* Watch Video Button */}
          {room.videoUrl && (
            <button
              onClick={() => onWatchVideo(room)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Tour Video</span>
            </button>
          )}

          {/* WhatsApp Direct Connect to Admin (+91 9041543868) */}
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Agent</span>
          </a>

          {/* Delete Listing (Only Admin or listing owner) */}
          {canManageListing && (
            <button
              onClick={() => onDeleteListing(room.id)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Listing"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
