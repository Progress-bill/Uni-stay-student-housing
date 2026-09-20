import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Video, 
  MapPin, 
  IndianRupee, 
  Zap, 
  Wind, 
  Flame, 
  UserCheck, 
  Plus, 
  Check, 
  LocateFixed, 
  AlertCircle,
  Loader2,
  Bed,
  UtensilsCrossed,
  Bath,
  Scissors,
  GitFork,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import MapView from './MapView';
import { useAuth } from '../context/AuthContext';

export default function AddRoomModal({ isOpen, onClose, onRoomAdded }) {
  if (!isOpen) return null;

  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [electricityPerUnit, setElectricityPerUnit] = useState('8.0');
  const [priceGroup, setPriceGroup] = useState('auto');
  const [status, setStatus] = useState('available');
  
  // Specific checkboxes
  const [landlordAtPG, setLandlordAtPG] = useState(false);
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [electricityBackup, setElectricityBackup] = useState(true);
  const [acRoom, setAcRoom] = useState(false);
  const [waterGeyser, setWaterGeyser] = useState(true);

  // GPS pin
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(28.5355);
  const [longitude, setLongitude] = useState(77.2090);
  const [fetchingAddress, setFetchingAddress] = useState(false);

  // Custom tags
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(['Single Room', 'Attached Washroom']);

  // Tree-structured Video Media (Root: Sleeping Room, Left: Kitchen, Right: Washing Room)
  const [videoSleepingFile, setVideoSleepingFile] = useState(null);
  const [videoSleepingUrl, setVideoSleepingUrl] = useState('');

  const [videoKitchenFile, setVideoKitchenFile] = useState(null);
  const [videoKitchenUrl, setVideoKitchenUrl] = useState('');

  const [videoWashingFile, setVideoWashingFile] = useState(null);
  const [videoWashingUrl, setVideoWashingUrl] = useState('');

  // Cover photo
  const [imageFile, setImageFile] = useState(null);
  const [imageUrlFallback, setImageUrlFallback] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reverse geocoding helper via OpenStreetMap Nominatim
  const fetchAddressForCoords = async (lat, lng) => {
    setFetchingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Format a clean, human-readable address
          const road = data.address?.road || data.address?.pedestrian || data.address?.footway || data.address?.neighbourhood || '';
          const suburb = data.address?.suburb || data.address?.city_district || data.address?.residential || '';
          const city = data.address?.city || data.address?.town || data.address?.county || '';
          const cleanAddr = [road, suburb, city].filter(Boolean).join(', ');

          setAddress(cleanAddr || data.display_name);
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setFetchingAddress(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Geolocation
  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setFetchingAddress(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          fetchAddressForCoords(lat, lng);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setFetchingAddress(false);
          alert('Could not access current location. Please click on the map to place the GPS pin.');
        }
      );
    }
  };

  // Handle map click in modal
  const handleLocationSelect = (lat, lng) => {
    const rLat = parseFloat(lat.toFixed(5));
    const rLng = parseFloat(lng.toFixed(5));
    setLatitude(rLat);
    setLongitude(rLng);
    fetchAddressForCoords(rLat, rLng);
  };

  // Submit listing
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !rentAmount) {
      setErrorMsg('Please enter both room title and monthly rent.');
      return;
    }

    // Enforce mandatory 3-part video tree validation
    const hasSleeping = Boolean(videoSleepingFile || (videoSleepingUrl && videoSleepingUrl.trim()));
    const hasKitchen = Boolean(videoKitchenFile || (videoKitchenUrl && videoKitchenUrl.trim()));
    const hasWashing = Boolean(videoWashingFile || (videoWashingUrl && videoWashingUrl.trim()));

    if (!hasSleeping || !hasKitchen || !hasWashing) {
      const missing = [];
      if (!hasSleeping) missing.push('Sleeping Room (Root Node)');
      if (!hasKitchen) missing.push('Kitchen (Left Subtree)');
      if (!hasWashing) missing.push('Washing Room (Right Subtree)');
      setErrorMsg(`All 3 video tour sections are mandatory. Missing: ${missing.join(', ')}. If you only have one video, please trim it into 3 separate clips.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('rentAmount', rentAmount);
      formData.append('electricityPerUnit', electricityPerUnit);
      if (priceGroup !== 'auto') formData.append('priceGroup', priceGroup);
      formData.append('landlordAtPG', landlordAtPG);
      formData.append('landlordName', landlordName);
      formData.append('landlordPhone', landlordPhone);
      formData.append('electricityBackup', electricityBackup);
      formData.append('acRoom', acRoom);
      formData.append('waterGeyser', waterGeyser);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address', address);
      formData.append('customCategories', tags.join(','));
      formData.append('status', status);
      formData.append('agentId', user?.id || 'user-admin-1');
      formData.append('agentName', user?.name || 'UniStay Housing Desk');

      // Append 3-part video tree files or URLs
      if (videoSleepingFile) {
        formData.append('video_sleeping', videoSleepingFile);
      } else if (videoSleepingUrl.trim()) {
        formData.append('videoUrl_sleeping', videoSleepingUrl.trim());
      }

      if (videoKitchenFile) {
        formData.append('video_kitchen', videoKitchenFile);
      } else if (videoKitchenUrl.trim()) {
        formData.append('videoUrl_kitchen', videoKitchenUrl.trim());
      }

      if (videoWashingFile) {
        formData.append('video_washing', videoWashingFile);
      } else if (videoWashingUrl.trim()) {
        formData.append('videoUrl_washing', videoWashingUrl.trim());
      }

      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imageUrlFallback) {
        formData.append('imageUrl', imageUrlFallback);
      }

      const res = await fetch('/api/listings', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        onRoomAdded(data.data);
        onClose();
      } else {
        setErrorMsg(data.message || 'Failed to add room.');
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add New Student Room Tour</h2>
            <p className="text-xs text-slate-500">Upload video tour, set GPS pin, rent & student amenities</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Room / PG Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunrise Single Occupancy PG near Metro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-blue-600" /> Monthly Rent (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 4500"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Electricity Rate (₹ / unit)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 8.0"
                  value={electricityPerUnit}
                  onChange={(e) => setElectricityPerUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pricing Tier Group
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'budget', label: '< ₹4k' },
                    { id: 'standard', label: '₹4k-7k' },
                    { id: 'premium', label: '> ₹7k' }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setPriceGroup(tier.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        priceGroup === tier.id 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-2 ring-blue-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Room Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                >
                  <option value="available">🟢 Available for Rent</option>
                  <option value="occupied">🔴 Booked / Occupied</option>
                  <option value="reserved">🟡 Reserved / Token Paid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Details about ventilation, study table, room rules, nearby landmarks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Section 2: Required Student Amenities Checkboxes */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Key Student Amenities (Check all that apply)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Landlord stays at PG */}
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={landlordAtPG}
                  onChange={(e) => setLandlordAtPG(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-600" /> Landlord stays at PG
                  </span>
                  <p className="text-[11px] text-slate-500">Uncheck if students have independent entry</p>
                </div>
              </label>

              {/* Electricity Backup */}
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={electricityBackup}
                  onChange={(e) => setElectricityBackup(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Electricity Backup available
                  </span>
                  <p className="text-[11px] text-slate-500">Inverter or generator for power cuts</p>
                </div>
              </label>

              {/* AC Room */}
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={acRoom}
                  onChange={(e) => setAcRoom(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-sky-600" /> AC Room
                  </span>
                  <p className="text-[11px] text-slate-500">Equipped with air conditioner</p>
                </div>
              </label>

              {/* Water Geyser */}
              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={waterGeyser}
                  onChange={(e) => setWaterGeyser(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" /> Water Geyser
                  </span>
                  <p className="text-[11px] text-slate-500">Hot water geyser in bathroom</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2B: Landlord Contact (Private - Admin Only) */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" /> Landlord / Property Owner (Private)
                </h3>
                <p className="text-[11px] text-amber-700">
                  🔒 Strictly confidential for Main Admin. Students will never see these contact details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landlord Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Gupta"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landlord Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98101 23456"
                  value={landlordPhone}
                  onChange={(e) => setLandlordPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Custom Categories & Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Categories / Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Boys Only, Walking distance to Metro, Attached Balcony"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Section 4: Tree Structure Video Tour Upload (Max 3, All Mandatory) */}
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200/60">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-blue-600 rotate-180" />
                  <span>3-Part Room Tour Tree Structure</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Binary tree video tour: Sleeping Room (Root), Kitchen (Left), Washing Room (Right).
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full w-fit">
                Max 500MB / Video
              </span>
            </div>

            {/* Single Continuous Video Guidance Banner */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
                <Scissors className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-950">Have only one continuous video?</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Tip</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Use your phone's built-in video editor or trimmer to split your single walkthrough into <strong>3 separate clips</strong>:
                  <strong className="text-amber-950"> 1) Sleeping Room</strong>, 
                  <strong className="text-amber-950"> 2) Kitchen</strong>, and 
                  <strong className="text-amber-950"> 3) Washing Room</strong>. 
                  All three sections are required so students can navigate the room interactively.
                </p>
              </div>
            </div>

            {/* Tree Completion Status Tracker */}
            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Tour Tree Readiness:
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (videoSleepingFile || videoSleepingUrl.trim()) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                }`}>
                  🛏️ Root: {(videoSleepingFile || videoSleepingUrl.trim()) ? 'Ready' : 'Pending'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (videoKitchenFile || videoKitchenUrl.trim()) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                }`}>
                  🍳 Left: {(videoKitchenFile || videoKitchenUrl.trim()) ? 'Ready' : 'Pending'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (videoWashingFile || videoWashingUrl.trim()) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                }`}>
                  🚿 Right: {(videoWashingFile || videoWashingUrl.trim()) ? 'Ready' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Visual Binary Tree Container */}
            <div className="space-y-3">
              
              {/* 1. ROOT NODE: Sleeping Room */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Bed className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                        Root Node: Sleeping Room
                      </span>
                      <span className="text-[10px] text-blue-800">
                        Main bedroom / living area (Required)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoSleepingFile(e.target.files[0] || null)}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    />
                    {videoSleepingFile && (
                      <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
                        <span>✓ {videoSleepingFile.name} ({(videoSleepingFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        <button
                          type="button"
                          onClick={() => setVideoSleepingFile(null)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="url"
                      placeholder="Or paste sleeping room video URL"
                      value={videoSleepingUrl}
                      onChange={(e) => setVideoSleepingUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tree Branch Visual Connector */}
              <div className="flex flex-col items-center justify-center my-1">
                <div className="w-0.5 h-4 bg-slate-300" />
                <div className="w-2/3 h-0.5 bg-slate-300" />
                <div className="flex justify-between w-2/3">
                  <div className="w-0.5 h-3 bg-slate-300" />
                  <div className="w-0.5 h-3 bg-slate-300" />
                </div>
              </div>

              {/* Subtree Nodes Grid (Kitchen Left, Washing Room Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 2. LEFT SUBTREE: Kitchen */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wider block">
                          Left Subtree: Kitchen
                        </span>
                        <span className="text-[10px] text-amber-800">
                          Cooking area / kitchenette (Required)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoKitchenFile(e.target.files[0] || null)}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 file:cursor-pointer"
                    />
                    {videoKitchenFile && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium">
                        <span>✓ {videoKitchenFile.name} ({(videoKitchenFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        <button
                          type="button"
                          onClick={() => setVideoKitchenFile(null)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <input
                      type="url"
                      placeholder="Or paste kitchen video URL"
                      value={videoKitchenUrl}
                      onChange={(e) => setVideoKitchenUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                  </div>
                </div>

                {/* 3. RIGHT SUBTREE: Washing Room */}
                <div className="p-4 bg-teal-50/70 rounded-2xl border-2 border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                        <Bath className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-teal-950 uppercase tracking-wider block">
                          Right Subtree: Washing Room
                        </span>
                        <span className="text-[10px] text-teal-800">
                          Washroom / bathroom (Required)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoWashingFile(e.target.files[0] || null)}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 file:cursor-pointer"
                    />
                    {videoWashingFile && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium">
                        <span>✓ {videoWashingFile.name} ({(videoWashingFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        <button
                          type="button"
                          onClick={() => setVideoWashingFile(null)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <input
                      type="url"
                      placeholder="Or paste washing room video URL"
                      value={videoWashingUrl}
                      onChange={(e) => setVideoWashingUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 outline-none"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Cover Photo Upload (Card Thumbnail) */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 pt-3">
              <label className="block text-xs font-bold text-slate-800">
                Cover Photo (Card Thumbnail)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-900 file:cursor-pointer"
                  />
                  {imageFile && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                      ✓ Photo selected: {imageFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="url"
                    placeholder="Or paste cover photo URL"
                    value={imageUrlFallback}
                    onChange={(e) => setImageUrlFallback(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: GPS Location Pin on Map */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> House GPS Pin Location
                </h3>
                <p className="text-[11px] text-slate-500">Click anywhere on the map below to place the pin</p>
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>My Location</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">
                  House Address / Landmark
                </label>
                {fetchingAddress && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching street name...
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. House #14, Lane 2, Near Engineering Campus Gate"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>

            {/* Interactive Pin Picker Map */}
            <div className="h-56 w-full rounded-xl overflow-hidden border border-slate-200">
              <MapView
                pickerMode={true}
                pickerLocation={{ lat: latitude, lng: longitude }}
                onLocationSelect={handleLocationSelect}
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
              <span>Latitude: <strong>{latitude}</strong></span>
              <span>Longitude: <strong>{longitude}</strong></span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading & Saving...' : 'Publish Room Listing'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
