import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import RoomCard from './components/RoomCard';
import MapView from './components/MapView';
import AddRoomModal from './components/AddRoomModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import FloatingAgentWidget from './components/FloatingAgentWidget';
import { Home, AlertCircle, RefreshCw, Sparkles, Filter } from 'lucide-react';

export default function App() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRent, setMaxRent] = useState(12000);
  const [filters, setFilters] = useState({
    noLandlordOnly: false,
    electricityBackup: false,
    acRoom: false,
    waterGeyser: false
  });

  // UI / View State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'split' | 'map'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeVideoRoom, setActiveVideoRoom] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch listings from API
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/listings');
      const data = await res.json();
      if (data.success) {
        setListings(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch rooms');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Compute maximum available rent for the slider
  const maxAvailableRent = useMemo(() => {
    if (listings.length === 0) return 15000;
    const maxVal = Math.max(...listings.map(l => l.rentAmount || 0));
    return Math.ceil(maxVal / 1000) * 1000;
  }, [listings]);

  // Adjust maxRent when maxAvailableRent changes
  useEffect(() => {
    if (maxAvailableRent > 0 && maxRent < maxAvailableRent) {
      setMaxRent(maxAvailableRent);
    }
  }, [maxAvailableRent]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBudget !== 'all') count++;
    if (filters.noLandlordOnly) count++;
    if (filters.electricityBackup) count++;
    if (filters.acRoom) count++;
    if (filters.waterGeyser) count++;
    if (searchQuery.trim()) count++;
    if (maxRent < maxAvailableRent) count++;
    return count;
  }, [selectedBudget, filters, searchQuery, maxRent, maxAvailableRent]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedBudget('all');
    setSearchQuery('');
    setMaxRent(maxAvailableRent);
    setFilters({
      noLandlordOnly: false,
      electricityBackup: false,
      acRoom: false,
      waterGeyser: false
    });
  };

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter(room => {
      // 1. Budget tier
      if (selectedBudget !== 'all' && room.priceGroup !== selectedBudget) {
        return false;
      }

      // 2. Max Rent slider
      if (room.rentAmount > maxRent) {
        return false;
      }

      // 3. Specific student checkboxes
      // If student asked for "No Landlord at PG", room.landlordAtPG must be false
      if (filters.noLandlordOnly && room.landlordAtPG === true) {
        return false;
      }
      if (filters.electricityBackup && !room.electricityBackup) {
        return false;
      }
      if (filters.acRoom && !room.acRoom) {
        return false;
      }
      if (filters.waterGeyser && !room.waterGeyser) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = room.title?.toLowerCase().includes(query);
        const matchesDesc = room.description?.toLowerCase().includes(query);
        const matchesAddress = room.address?.toLowerCase().includes(query);
        const matchesCategory = room.customCategories?.some(cat => 
          cat.toLowerCase().includes(query)
        );

        if (!matchesTitle && !matchesDesc && !matchesAddress && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [listings, selectedBudget, filters, maxRent, searchQuery]);

  // Handler when new room is added
  const handleRoomAdded = (newRoom) => {
    setListings(prev => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
  };

  // Handler for deleting a listing
  const handleDeleteListing = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room listing?')) {
      return;
    }

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setListings(prev => prev.filter(item => item.id !== id));
        if (selectedRoom?.id === id) {
          setSelectedRoom(null);
        }
      } else {
        alert(data.message || 'Error deleting listing');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server');
    }
  };

  // Handle pin select on map
  const handleSelectMapPin = (room) => {
    setSelectedRoom(room);
    if (viewMode === 'grid') {
      setViewMode('split');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900 pb-20">
      
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalListings={listings.length}
        activeFilterCount={activeFilterCount}
      />

      {/* Filter and Amenities Control Bar */}
      <FilterBar
        selectedBudget={selectedBudget}
        setSelectedBudget={setSelectedBudget}
        filters={filters}
        setFilters={setFilters}
        maxRent={maxRent}
        setMaxRent={setMaxRent}
        maxAvailableRent={maxAvailableRent}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold">Loading student rooms & map pins...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl max-w-lg mx-auto text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="font-bold text-red-900">Unable to load rooms</h3>
            <p className="text-xs text-red-700">{error}</p>
            <button
              onClick={fetchListings}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No rooms match your filters</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try broadening your budget or unchecking some amenities.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Listings Display: GRID VIEW */}
        {!loading && !error && filteredListings.length > 0 && viewMode === 'grid' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-800">{filteredListings.length}</strong> student verified rooms
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  onWatchVideo={(r) => setActiveVideoRoom(r)}
                  onSelectMapPin={handleSelectMapPin}
                  onDeleteListing={handleDeleteListing}
                />
              ))}
            </div>
          </div>
        )}

        {/* Listings Display: SPLIT VIEW (List + Interactive Map) */}
        {!loading && !error && filteredListings.length > 0 && viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Scrollable Room Cards (Left) */}
            <div className="lg:col-span-6 overflow-y-auto pr-2 space-y-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Showing <strong className="text-slate-800">{filteredListings.length}</strong> rooms with GPS pins
              </p>
              {filteredListings.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  onWatchVideo={(r) => setActiveVideoRoom(r)}
                  onSelectMapPin={(r) => setSelectedRoom(r)}
                  onDeleteListing={handleDeleteListing}
                />
              ))}
            </div>

            {/* Sticky Interactive Map (Right) */}
            <div className="lg:col-span-6 h-full sticky top-24">
              <MapView
                rooms={filteredListings}
                selectedRoom={selectedRoom}
                onSelectRoom={(r) => setSelectedRoom(r)}
                onWatchVideo={(r) => setActiveVideoRoom(r)}
              />
            </div>
          </div>
        )}

        {/* Listings Display: FULL MAP VIEW */}
        {!loading && !error && viewMode === 'map' && (
          <div className="h-[calc(100vh-220px)] min-h-[550px] relative">
            <MapView
              rooms={filteredListings}
              selectedRoom={selectedRoom}
              onSelectRoom={(r) => setSelectedRoom(r)}
              onWatchVideo={(r) => setActiveVideoRoom(r)}
            />

            {/* Floating selected room card at bottom of map */}
            {selectedRoom && (
              <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:max-w-md z-[1000] animate-in fade-in slide-in-from-bottom-3">
                <div className="relative">
                  <button
                    onClick={() => setSelectedRoom(null)}
                    className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs shadow-md"
                  >
                    ×
                  </button>
                  <RoomCard
                    room={selectedRoom}
                    isSelected={true}
                    onWatchVideo={(r) => setActiveVideoRoom(r)}
                    onSelectMapPin={() => {}}
                    onDeleteListing={handleDeleteListing}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Agent Widgets (WhatsApp, View Mode Switcher, Calculator) */}
      <FloatingAgentWidget
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Add Room Tour Modal (Agent Upload) */}
      <AddRoomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRoomAdded={handleRoomAdded}
      />

      {/* Video Tour Walkthrough Modal */}
      {activeVideoRoom && (
        <VideoPlayerModal
          room={activeVideoRoom}
          onClose={() => setActiveVideoRoom(null)}
        />
      )}

    </div>
  );
}
