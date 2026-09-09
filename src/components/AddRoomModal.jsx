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
  AlertCircle 
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
  const [electricityBackup, setElectricityBackup] = useState(true);
  const [acRoom, setAcRoom] = useState(false);
  const [waterGeyser, setWaterGeyser] = useState(true);

  // GPS pin
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(28.5355);
  const [longitude, setLongitude] = useState(77.2090);

  // Custom tags
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(['Single Room', 'Attached Washroom']);

  // Media files
  const [videoFile, setVideoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoUrlFallback, setVideoUrlFallback] = useState('');
  const [imageUrlFallback, setImageUrlFallback] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(parseFloat(pos.coords.latitude.toFixed(5)));
          setLongitude(parseFloat(pos.coords.longitude.toFixed(5)));
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Could not access current location. Please click on the map to place the GPS pin.');
        }
      );
    }
  };

  // Handle map click in modal
  const handleLocationSelect = (lat, lng) => {
    setLatitude(parseFloat(lat.toFixed(5)));
    setLongitude(parseFloat(lng.toFixed(5)));
  };

  // Submit listing
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !rentAmount) {
      setErrorMsg('Please enter both room title and monthly rent.');
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

      if (videoFile) {
        formData.append('video', videoFile);
      } else if (videoUrlFallback) {
        formData.append('videoUrl', videoUrlFallback);
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

          {/* Section 4: Video & Image Upload */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-4 h-4 text-blue-600" /> Upload Room Video Tour
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Video upload input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Video File (.mp4, .webm, .mov)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0] || null)}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
                {videoFile && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                    ✓ Video selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                )}
              </div>

              {/* Or Video URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Or Paste Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://.../room-tour.mp4"
                  value={videoUrlFallback}
                  onChange={(e) => setVideoUrlFallback(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cover Photo File (.jpg, .png)
                </label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Or Cover Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://.../room.jpg"
                  value={imageUrlFallback}
                  onChange={(e) => setImageUrlFallback(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                House Address / Landmark
              </label>
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
