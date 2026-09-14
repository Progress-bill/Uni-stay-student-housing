import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  Circle, 
  useMap, 
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Video, 
  MessageCircle, 
  MapPin, 
  Navigation, 
  LocateFixed, 
  Route, 
  ExternalLink, 
  Search, 
  X, 
  Loader2, 
  Compass, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Fly map to new center point
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Auto fit map bounds when a route is generated
function RouteFitBounds({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [coordinates, map]);
  return null;
}

// Click listener for location pinning
function MapClickHandler({ active, onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (active && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Custom Room Price Badge Pin
const createPriceIcon = (rent, priceGroup, isSelected) => {
  const groupClass = priceGroup === 'budget' ? 'budget' : priceGroup === 'premium' ? 'premium' : '';
  const activeClass = isSelected ? 'active' : '';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="custom-price-pin ${groupClass} ${activeClass}">
        <span>₹${(rent / 1000).toFixed(1)}k</span>
      </div>
    `,
    iconSize: [60, 26],
    iconAnchor: [30, 13]
  });
};

// Custom User Live GPS Radar Dot
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-gps-icon',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 18px; height: 18px; border-radius: 9999px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 9999px; background-color: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Custom Pinned Marker Icon
const createCustomPinIcon = () => {
  return L.divIcon({
    className: 'custom-pin-drop-icon',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 6px; border-radius: 9999px; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          <span style="font-size: 14px;">📍</span>
        </div>
        <div style="width: 4px; height: 6px; background-color: #dc2626; border-radius: 2px;"></div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38]
  });
};

// Calculate geodesic distance fallback in km
const calculateGeodesicDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function MapView({ 
  rooms = [], 
  selectedRoom, 
  onSelectRoom, 
  onWatchVideo,
  pickerMode = false,
  pickerLocation = null,
  onLocationSelect = null 
}) {
  // Live User GPS state
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState('');

  // Custom Dropped Pin state
  const [pinModeActive, setPinModeActive] = useState(pickerMode);
  const [droppedPin, setDroppedPin] = useState(pickerLocation || null);
  const [pinAddress, setPinAddress] = useState('');
  const [fetchingAddress, setFetchingAddress] = useState(false);

  // Search Address / Landmark state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Navigation Route state (OSRM API)
  const [activeRoute, setActiveRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Default coordinate center (Campus Zone)
  const defaultCenter = [28.5385, 77.2080];
  const [mapCenter, setMapCenter] = useState(
    selectedRoom && selectedRoom.latitude 
      ? [selectedRoom.latitude, selectedRoom.longitude]
      : pickerLocation 
      ? [pickerLocation.lat, pickerLocation.lng]
      : rooms.length > 0 && rooms[0].latitude
      ? [rooms[0].latitude, rooms[0].longitude]
      : defaultCenter
  );

  useEffect(() => {
    if (selectedRoom && selectedRoom.latitude) {
      setMapCenter([selectedRoom.latitude, selectedRoom.longitude]);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (pickerLocation) {
      setDroppedPin(pickerLocation);
    }
  }, [pickerLocation]);

  // Connect to Live GPS Location
  const handleConnectGPS = () => {
    if (!('geolocation' in navigator)) {
      alert('GPS Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    setGpsStatusMsg('Acquiring live GPS satellite position...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: parseFloat(pos.coords.latitude.toFixed(5)),
          lng: parseFloat(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy)
        };
        setUserLocation(coords);
        setMapCenter([coords.lat, coords.lng]);
        setLocatingUser(false);
        setGpsStatusMsg(`Live GPS Connected (±${coords.accuracy}m)`);
        setTimeout(() => setGpsStatusMsg(''), 4000);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setLocatingUser(false);
        setGpsStatusMsg('GPS permission denied or unavailable');
        setTimeout(() => setGpsStatusMsg(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  // Reverse Geocode a pinned location
  const reverseGeocode = async (lat, lng) => {
    setFetchingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      const addr = data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : `${lat}, ${lng}`;
      setPinAddress(addr);
      if (onLocationSelect) {
        onLocationSelect(lat, lng, addr);
      }
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setPinAddress(fallback);
      if (onLocationSelect) {
        onLocationSelect(lat, lng, fallback);
      }
    } finally {
      setFetchingAddress(false);
    }
  };

  // Handle map click to pin
  const handleMapPin = (lat, lng) => {
    const newCoords = {
      lat: parseFloat(lat.toFixed(5)),
      lng: parseFloat(lng.toFixed(5))
    };
    setDroppedPin(newCoords);
    reverseGeocode(newCoords.lat, newCoords.lng);
  };

  // Search Address / Place API (Nominatim)
  const handleSearchPlace = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchingPlace(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(parseFloat(item.lat).toFixed(5));
        const lng = parseFloat(parseFloat(item.lon).toFixed(5));
        setMapCenter([lat, lng]);
        handleMapPin(lat, lng);
      } else {
        alert('No location found matching your search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Error connecting to map search API.');
    } finally {
      setSearchingPlace(false);
    }
  };

  // Get Turn-by-turn Navigation & Driving Directions (OSRM API)
  const handleGetDirections = async (destLat, destLng, destTitle = 'Pinned Location') => {
    setLoadingRoute(true);
    setRouteError('');

    // Ensure we have user's GPS origin
    let origin = userLocation;
    if (!origin) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        origin = {
          lat: parseFloat(pos.coords.latitude.toFixed(5)),
          lng: parseFloat(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy)
        };
        setUserLocation(origin);
      } catch (err) {
        setLoadingRoute(false);
        // Direct fallback: launch Google Maps directions URL with destination
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
        return;
      }
    }

    try {
      // Connect to Open Source Routing Machine (OSRM) API
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const latLngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);

        setActiveRoute({
          coordinates: latLngs,
          distanceKm,
          durationMin,
          destinationName: destTitle,
          destLat,
          destLng,
          userLat: origin.lat,
          userLng: origin.lng
        });
      } else {
        // Fallback to straight line connection
        const dist = calculateGeodesicDistance(origin.lat, origin.lng, destLat, destLng);
        setActiveRoute({
          coordinates: [[origin.lat, origin.lng], [destLat, destLng]],
          distanceKm: dist.toFixed(1),
          durationMin: Math.round(dist * 2),
          destinationName: destTitle,
          destLat,
          destLng,
          userLat: origin.lat,
          userLng: origin.lng
        });
      }
    } catch (err) {
      console.warn('Routing error, falling back to geodesic path:', err);
      const dist = calculateGeodesicDistance(origin.lat, origin.lng, destLat, destLng);
      setActiveRoute({
        coordinates: [[origin.lat, origin.lng], [destLat, destLng]],
        distanceKm: dist.toFixed(1),
        durationMin: Math.round(dist * 2),
        destinationName: destTitle,
        destLat,
        destLng,
        userLat: origin.lat,
        userLng: origin.lng
      });
    } finally {
      setLoadingRoute(false);
    }
  };

  const getGoogleMapsDirectionsUrl = (destLat, destLng, userLat, userLng) => {
    if (userLat && userLng) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  };

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-lg bg-slate-100 flex flex-col">
      
      {/* Top Map Action Bar (Search, GPS Connect, Pin Mode) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Place Search Bar */}
        <form 
          onSubmit={handleSearchPlace}
          className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/90 px-3 py-1.5 w-full sm:max-w-xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search place, college or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 text-xs mr-1 cursor-pointer"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            disabled={searchingPlace}
            className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {searchingPlace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
          </button>
        </form>

        {/* Right: GPS Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 self-end sm:self-auto">
          
          {/* Connect GPS Button */}
          <button
            type="button"
            onClick={handleConnectGPS}
            disabled={locatingUser}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer ${
              userLocation 
                ? 'bg-blue-600 text-white shadow-blue-500/30 ring-2 ring-blue-400' 
                : 'bg-white/95 hover:bg-white text-slate-800 border border-slate-200/90'
            }`}
            title="Connect Live GPS Position"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-blue-400' : userLocation ? 'text-white' : 'text-blue-600'}`} />
            <span>{locatingUser ? 'Connecting...' : userLocation ? 'GPS Live' : 'Connect GPS'}</span>
          </button>

          {/* Toggle Pin Location Mode (if not already in pickerMode) */}
          {!pickerMode && (
            <button
              type="button"
              onClick={() => setPinModeActive(!pinModeActive)}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                pinModeActive 
                  ? 'bg-red-600 text-white shadow-red-500/30' 
                  : 'bg-white/95 hover:bg-white text-slate-700 border border-slate-200/90'
              }`}
              title="Click on the map to pin any location"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{pinModeActive ? 'Pinning Active' : 'Pin Location'}</span>
            </button>
          )}

        </div>
      </div>

      {/* GPS Status Message Badge */}
      {gpsStatusMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-slate-700 animate-in fade-in">
          {gpsStatusMsg}
        </div>
      )}

      {/* Turn-by-Turn Route Navigation HUD Bar (when route active) */}
      {activeRoute && (
        <div className="absolute bottom-4 inset-x-4 z-[1000] bg-slate-950/95 text-white p-3 sm:p-4 rounded-3xl shadow-2xl border border-blue-500/50 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-blue-500/40">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white tracking-tight">
                    {activeRoute.distanceKm} km
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/30 text-blue-300 border border-blue-400/40">
                    ⏱️ ~{activeRoute.durationMin} mins drive
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-400">
                    (~{Math.round(activeRoute.distanceKm * 12)} mins walk)
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate max-w-sm sm:max-w-md mt-0.5">
                  Destination: <strong className="text-white">{activeRoute.destinationName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <a
                href={getGoogleMapsDirectionsUrl(activeRoute.destLat, activeRoute.destLng, activeRoute.userLat, activeRoute.userLng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                title="Launch Google Maps Live Navigation"
              >
                <Compass className="w-4 h-4" />
                <span>Start Turn-by-Turn GPS</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <button
                type="button"
                onClick={() => setActiveRoute(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Clear route"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Interactive Leaflet Map */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full flex-1"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView center={mapCenter} zoom={selectedRoom ? 15 : 13} />
        {activeRoute && <RouteFitBounds coordinates={activeRoute.coordinates} />}

        {/* Map Click Handler for Pinning */}
        <MapClickHandler 
          active={pickerMode || pinModeActive} 
          onLocationSelect={handleMapPin} 
        />

        {/* 1. Live User GPS Position Marker & Accuracy Circle */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy || 40}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#60a5fa',
                fillOpacity: 0.18,
                weight: 1.5
              }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={createUserLocationIcon()}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1">
                  <div className="font-extrabold text-blue-700 flex items-center gap-1">
                    <LocateFixed className="w-3.5 h-3.5" /> Your Current GPS Position
                  </div>
                  <div className="font-mono text-[11px] text-slate-600">
                    {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Satellite Accuracy: ±{userLocation.accuracy || 20}m
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 2. Custom Dropped Pin Marker */}
        {droppedPin && (
          <Marker
            position={[droppedPin.lat, droppedPin.lng]}
            icon={createCustomPinIcon()}
          >
            <Popup>
              <div className="p-1.5 space-y-2 text-xs min-w-[200px]">
                <div className="font-bold text-red-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Pinned Location
                </div>

                <p className="text-slate-800 text-[11px] font-medium leading-snug">
                  {fetchingAddress ? 'Looking up street address...' : (pinAddress || 'GPS Location Pin')}
                </p>

                <div className="font-mono text-[10px] text-slate-500 bg-slate-50 p-1 rounded border border-slate-200">
                  {droppedPin.lat.toFixed(5)}, {droppedPin.lng.toFixed(5)}
                </div>

                <div className="pt-1 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGetDirections(droppedPin.lat, droppedPin.lng, pinAddress || 'Pinned Location')}
                    disabled={loadingRoute}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Route className="w-3 h-3" />
                    <span>{loadingRoute ? 'Routing...' : 'Get Directions'}</span>
                  </button>

                  <a
                    href={getGoogleMapsDirectionsUrl(droppedPin.lat, droppedPin.lng, userLocation?.lat, userLocation?.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. Navigation Route Polyline */}
        {activeRoute && (
          <Polyline
            positions={activeRoute.coordinates}
            pathOptions={{
              color: '#2563eb',
              weight: 5.5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* 4. Room Listing Pins */}
        {!pickerMode && rooms.map((room) => {
          if (!room.latitude || !room.longitude) return null;
          const isSelected = selectedRoom?.id === room.id;

          return (
            <Marker
              key={room.id}
              position={[room.latitude, room.longitude]}
              icon={createPriceIcon(room.rentAmount, room.priceGroup, isSelected)}
              eventHandlers={{
                click: () => onSelectRoom && onSelectRoom(room)
              }}
            >
              <Popup className="custom-popup">
                <div className="w-60 p-1">
                  {room.images && room.images[0] && (
                    <img 
                      src={room.images[0]} 
                      alt={room.title}
                      className="w-full h-24 object-cover rounded-lg mb-2" 
                    />
                  )}
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-0.5">
                    {room.title}
                  </h4>
                  {room.address && (
                    <p className="text-[10px] text-slate-500 truncate mb-1.5 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" /> {room.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs mb-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                    <span className="font-extrabold text-blue-600">
                      ₹{room.rentAmount.toLocaleString()}/mo
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-1 py-0.5 rounded">
                      ⚡ ₹{room.electricityPerUnit}/unit
                    </span>
                  </div>

                  {/* Directions & Navigation Action Button */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => handleGetDirections(room.latitude, room.longitude, room.title)}
                      disabled={loadingRoute}
                      className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Route className="w-3.5 h-3.5" />
                      <span>{loadingRoute ? 'Calculating Route...' : 'Get Directions from My GPS'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {room.videoUrl && (
                      <button
                        onClick={() => onWatchVideo && onWatchVideo(room)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Video className="w-3 h-3" /> Tour Video
                      </button>
                    )}
                    <a
                      href={getGoogleMapsDirectionsUrl(room.latitude, room.longitude, userLocation?.lat, userLocation?.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-3 h-3" /> Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>

      {/* Floating Bottom Status Pill */}
      {!pickerMode && (
        <div className="absolute bottom-3 left-3 z-[900] bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-2 text-[11px] text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{rooms.length} Verified Houses Pinned</span>
          {pinModeActive && (
            <span className="text-red-600 font-bold border-l pl-2 border-slate-300">
              Click map to drop pin
            </span>
          )}
        </div>
      )}

    </div>
  );
}

