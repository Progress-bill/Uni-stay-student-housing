import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Video, Zap, MessageCircle, MapPin } from 'lucide-react';

// Component to handle map center updates
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Click listener for GPS picker mode
function LocationMarker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Helper to generate price badge icon
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

export default function MapView({ 
  rooms = [], 
  selectedRoom, 
  onSelectRoom, 
  onWatchVideo,
  pickerMode = false,
  pickerLocation = null,
  onLocationSelect = null 
}) {
  // Determine center point
  const defaultCenter = [28.5385, 77.2080]; // Default student campus zone
  const activeCenter = selectedRoom && selectedRoom.latitude 
    ? [selectedRoom.latitude, selectedRoom.longitude] 
    : pickerLocation 
    ? [pickerLocation.lat, pickerLocation.lng]
    : rooms.length > 0 && rooms[0].latitude
    ? [rooms[0].latitude, rooms[0].longitude]
    : defaultCenter;

  return (
    <div className="w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-md">
      <MapContainer
        center={activeCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView center={activeCenter} zoom={selectedRoom ? 15 : 13} />

        {/* If in picker mode, handle map clicks */}
        {pickerMode && <LocationMarker onLocationSelect={onLocationSelect} />}

        {/* Picker Pin */}
        {pickerMode && pickerLocation && (
          <Marker 
            position={[pickerLocation.lat, pickerLocation.lng]}
            icon={L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })}
          >
            <Popup>
              <div className="text-xs font-semibold p-1">
                📍 Selected GPS Pin: <br />
                {pickerLocation.lat.toFixed(5)}, {pickerLocation.lng.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Listing Pins */}
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
                <div className="w-56 p-1">
                  {room.images && room.images[0] && (
                    <img 
                      src={room.images[0]} 
                      alt={room.title}
                      className="w-full h-24 object-cover rounded-lg mb-2" 
                    />
                  )}
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-1">
                    {room.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-extrabold text-blue-600">
                      ₹{room.rentAmount.toLocaleString()}/mo
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      ⚡ ₹{room.electricityPerUnit}/unit
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {room.videoUrl && (
                      <button
                        onClick={() => onWatchVideo(room)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Video className="w-3 h-3" /> Video
                      </button>
                    )}
                    <a
                      href={`https://wa.me/919876543210?text=${encodeURIComponent('Inquiring about ' + room.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3" /> Chat
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Info Overlay */}
      {!pickerMode && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">
            {rooms.length} GPS Pinned Houses
          </span>
        </div>
      )}
    </div>
  );
}
