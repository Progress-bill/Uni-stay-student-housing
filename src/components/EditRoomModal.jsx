import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  IndianRupee, 
  Phone, 
  User, 
  Zap, 
  Wind, 
  Flame, 
  Check, 
  Video, 
  ExternalLink,
  ShieldCheck,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EditRoomModal({ isOpen, onClose, room, onRoomUpdated }) {
  const { token } = useAuth();
  
  if (!isOpen || !room) return null;

  const [title, setTitle] = useState(room.title || '');
  const [rentAmount, setRentAmount] = useState(room.rentAmount || '');
  const [electricityPerUnit, setElectricityPerUnit] = useState(room.electricityPerUnit || 8);
  const [address, setAddress] = useState(room.address || '');
  const [latitude, setLatitude] = useState(room.latitude || 28.5355);
  const [longitude, setLongitude] = useState(room.longitude || 77.209);
  const [description, setDescription] = useState(room.description || '');
  const [landlordName, setLandlordName] = useState(room.landlordName || '');
  const [landlordPhone, setLandlordPhone] = useState(room.landlordPhone || '');
  const [landlordAtPG, setLandlordAtPG] = useState(Boolean(room.landlordAtPG));
  const [acRoom, setAcRoom] = useState(Boolean(room.acRoom));
  const [waterGeyser, setWaterGeyser] = useState(Boolean(room.waterGeyser));
  const [electricityBackup, setElectricityBackup] = useState(Boolean(room.electricityBackup));
  const [priceGroup, setPriceGroup] = useState(room.priceGroup || 'standard');
  const [customCategories, setCustomCategories] = useState(
    room.customCategories && room.customCategories.length > 0
      ? room.customCategories.join(', ')
      : 'Single Room, Attached Washroom'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Area Previews for fast one-click location setting
  const quickLocations = [
    { label: 'Law Gate (LPU)', address: 'Law Gate, Near LPU Campus, Phagwara, Punjab', lat: 31.2536, lng: 75.7037 },
    { label: 'Miherwa', address: 'Miherwa Road, Near LPU Gate, Phagwara, Punjab', lat: 31.2580, lng: 75.6980 },
    { label: 'Green Valley', address: 'Green Valley Enclave, Near University Ring Road', lat: 31.2510, lng: 75.7090 },
    { label: 'CT University', address: 'CT University Campus Vicinity, Jalandhar Road', lat: 31.2290, lng: 75.7650 },
    { label: 'Ramamandi', address: 'Ramamandi, Jalandhar Cantt, Punjab', lat: 31.3120, lng: 75.6150 }
  ];

  const handleApplyLocation = (loc) => {
    setAddress(loc.address);
    setLatitude(loc.lat);
    setLongitude(loc.lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim()) {
      setErrorMsg('Room Title is required.');
      return;
    }
    if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0) {
      setErrorMsg('Please enter a valid monthly rent amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedCategories = customCategories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        rentAmount: Number(rentAmount),
        electricityPerUnit: parseFloat(electricityPerUnit) || 8.0,
        priceGroup,
        address: address.trim(),
        latitude: parseFloat(latitude) || 28.5355,
        longitude: parseFloat(longitude) || 77.209,
        landlordName: landlordName.trim(),
        landlordPhone: landlordPhone.trim(),
        landlordAtPG,
        acRoom,
        waterGeyser,
        electricityBackup,
        customCategories: parsedCategories
      };

      const res = await fetch(`/api/listings/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Room details updated & synchronized to Cloudinary!');
        if (onRoomUpdated) {
          onRoomUpdated(data.data);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.message || 'Failed to update room details.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error connecting to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Edit Room Details & Labeling
              </h2>
              <p className="text-xs text-slate-500">
                ID: <span className="font-mono text-slate-700 font-semibold">{room.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 0: Media Previews (Read-only reference) */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-4 h-4 text-blue-600" />
              <span>Associated Cloudinary Media</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              {/* Cover Photo */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 mb-1">Cover Photo</span>
                {room.images && room.images[0] ? (
                  <img
                    src={room.images[0]}
                    alt="Cover"
                    className="w-full h-20 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-full h-20 rounded-xl bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                    No Image
                  </div>
                )}
              </div>

              {/* Video 1: Sleeping */}
              <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-700">🛌 Sleeping Room</span>
                <span className="text-[9px] text-slate-400 font-mono mb-2">Root Node</span>
                {room.videoTree?.root?.url ? (
                  <a
                    href={room.videoTree.root.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    <span>View Video</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">None</span>
                )}
              </div>

              {/* Video 2: Kitchen */}
              <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-700">🍳 Kitchen</span>
                <span className="text-[9px] text-slate-400 font-mono mb-2">Left Subtree</span>
                {room.videoTree?.left?.url ? (
                  <a
                    href={room.videoTree.left.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    <span>View Video</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">None</span>
                )}
              </div>

              {/* Video 3: Washing */}
              <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-700">🚿 Washing Room</span>
                <span className="text-[9px] text-slate-400 font-mono mb-2">Right Subtree</span>
                {room.videoTree?.right?.url ? (
                  <a
                    href={room.videoTree.right.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    <span>View Video</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Basic Room Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Title & Pricing Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Room Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Law Gate Comfort AC Studio"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Rent (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    placeholder="e.g. 6500"
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Electricity Rate (₹/unit)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={electricityPerUnit}
                  onChange={(e) => setElectricityPerUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Price Group
                </label>
                <select
                  value={priceGroup}
                  onChange={(e) => setPriceGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="budget">Budget (Under ₹4,000)</option>
                  <option value="standard">Standard (₹4,000 - ₹7,000)</option>
                  <option value="premium">Premium (Above ₹7,000)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about ventilation, study table, balcony, or quiet neighborhood..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Address & Location (LPU Campus / Area)</span>
              </h3>
            </div>

            {/* Quick area buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Set:</span>
              {quickLocations.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleApplyLocation(loc)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 transition-all cursor-pointer"
                >
                  {loc.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complete Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Street 4, Law Gate, Near LPU Gate 1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Landlord Contact Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Landlord Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landlord Name
                </label>
                <input
                  type="text"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  placeholder="e.g. Mr. Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landlord WhatsApp / Phone Number
                </label>
                <input
                  type="text"
                  value={landlordPhone}
                  onChange={(e) => setLandlordPhone(e.target.value)}
                  placeholder="e.g. +91 9041543868"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={landlordAtPG}
                onChange={(e) => setLandlordAtPG(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                Landlord stays on the same PG / premises
              </span>
            </label>
          </div>

          {/* Section 4: Student Amenities & Categories */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Amenities & Tags
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAcRoom(!acRoom)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  acRoom 
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Wind className={`w-4 h-4 ${acRoom ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>AC Room</span>
              </button>

              <button
                type="button"
                onClick={() => setWaterGeyser(!waterGeyser)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  waterGeyser 
                    ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Flame className={`w-4 h-4 ${waterGeyser ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Water Geyser</span>
              </button>

              <button
                type="button"
                onClick={() => setElectricityBackup(!electricityBackup)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  electricityBackup 
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Zap className={`w-4 h-4 ${electricityBackup ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Power Backup</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Tags / Filters (comma-separated)
              </label>
              <input
                type="text"
                value={customCategories}
                onChange={(e) => setCustomCategories(e.target.value)}
                placeholder="Single Room, Attached Washroom, Boys Only, Walking to Gate 1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Cloud...' : 'Save & Sync Details'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
