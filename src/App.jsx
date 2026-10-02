import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import RoomCard from './components/RoomCard';
import MapView from './components/MapView';
import AddRoomModal from './components/AddRoomModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import FloatingAgentWidget from './components/FloatingAgentWidget';
import AuthModal from './components/AuthModal';
import BecomeAgentModal from './components/BecomeAgentModal';
import AdminPanelModal from './components/AdminPanelModal';
import DeleteRequestModal from './components/DeleteRequestModal';
import EditRoomModal from './components/EditRoomModal';
import { useAuth } from './context/AuthContext';
import { 
  Home, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  ShieldAlert, 
  MessageCircle,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow
} from 'lucide-react';

export default function App() {
  const { user, isAdmin, isAgent, revocationNotice, clearRevocationNotice } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'occupied'
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSearch, setPriceSearch] = useState('');
  const [sortBy, setSortBy] = useState('price-asc'); // 'price-asc' (Price: Low to High) | 'price-desc' | 'default'

  // Function for arranging rooms in ascending order of prices
  const sortRoomsByPriceAsc = (roomsList) => {
    return [...roomsList].sort((a, b) => {
      const rentA = Number(a.rentAmount) || 0;
      const rentB = Number(b.rentAmount) || 0;
      return rentA - rentB;
    });
  };

  // Function for arranging rooms in descending order of prices
  const sortRoomsByPriceDesc = (roomsList) => {
    return [...roomsList].sort((a, b) => {
      const rentA = Number(a.rentAmount) || 0;
      const rentB = Number(b.rentAmount) || 0;
      return rentB - rentA;
    });
  };

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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBecomeAgentOpen, setIsBecomeAgentOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [roomToDeleteRequest, setRoomToDeleteRequest] = useState(null);
  const [roomToEdit, setRoomToEdit] = useState(null);

  // Handle room update from Edit modal
  const handleRoomUpdated = (updatedRoom) => {
    setListings(prev => prev.map(l => l.id === updatedRoom.id ? updatedRoom : l));
  };

  // Pending agent applications & deletion requests count for Admin badge
  const [pendingAppsCount, setPendingAppsCount] = useState(0);

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

  // Fetch pending applications & deletion requests count if Admin
  const fetchPendingCount = async () => {
    try {
      const [appsRes, delRes] = await Promise.all([
        fetch('/api/agent-applications'),
        fetch('/api/delete-requests')
      ]);
      const [appsData, delData] = await Promise.all([
        appsRes.json(),
        delRes.json()
      ]);
      let total = 0;
      if (appsData.success && Array.isArray(appsData.data)) {
        total += appsData.data.filter(a => a.status === 'pending').length;
      }
      if (delData.success && Array.isArray(delData.data)) {
        total += delData.data.filter(r => r.status === 'pending').length;
      }
      setPendingAppsCount(total);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingCount();
    }
  }, [isAdmin, isAdminPanelOpen]);

  // Compute minimum and maximum listing rent
  const { minListingRent, maxListingRent } = useMemo(() => {
    if (!listings || listings.length === 0) {
      return { minListingRent: 0, maxListingRent: 0 };
    }
    const validRents = listings
      .map(l => Number(l.rentAmount))
      .filter(r => !isNaN(r) && r > 0);
    if (validRents.length === 0) {
      return { minListingRent: 0, maxListingRent: 0 };
    }
    return {
      minListingRent: Math.min(...validRents),
      maxListingRent: Math.max(...validRents)
    };
  }, [listings]);

  // Parse price search input (supports exact numbers, "k" suffix, ranges like 5000-8000)
  const parsedPriceRange = useMemo(() => {
    const raw = (priceSearch || '').trim();
    if (!raw) return null;

    let clean = raw.toLowerCase().replace(/₹/g, '').replace(/,/g, '').trim();
    clean = clean.replace(/(\d+(?:\.\d+)?)k\b/g, (match, p1) => String(parseFloat(p1) * 1000));

    // Range: "5000-8000" or "5000 to 8000"
    const rangeMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:-|to|\.\.)\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const v1 = parseFloat(rangeMatch[1]);
      const v2 = parseFloat(rangeMatch[2]);
      return {
        type: 'range',
        min: Math.min(v1, v2),
        max: Math.max(v1, v2)
      };
    }

    // Single number with optional words: "<=8000", "8000", "under 8000"
    const singleMatch = clean.match(/^(?:<=?|<|under|max|around|approx)?\s*(\d+(?:\.\d+)?)$/);
    if (singleMatch) {
      return {
        type: 'single',
        value: parseFloat(singleMatch[1])
      };
    }

    const nums = clean.match(/\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const v1 = parseFloat(nums[0]);
      const v2 = parseFloat(nums[1]);
      return {
        type: 'range',
        min: Math.min(v1, v2),
        max: Math.max(v1, v2)
      };
    } else if (nums && nums.length === 1) {
      return {
        type: 'single',
        value: parseFloat(nums[0])
      };
    }

    return null;
  }, [priceSearch]);

  // Dynamic boundary message calculation
  const boundaryMessage = useMemo(() => {
    if (!parsedPriceRange || listings.length === 0 || maxListingRent === 0) return '';
    if (parsedPriceRange.type === 'single') {
      if (parsedPriceRange.value > maxListingRent) {
        return 'max range of house is current listing shown';
      }
      if (parsedPriceRange.value < minListingRent) {
        return 'the minimum range of listing is current housing shown';
      }
    } else if (parsedPriceRange.type === 'range') {
      if (parsedPriceRange.min > maxListingRent || parsedPriceRange.max > maxListingRent) {
        return 'max range of house is current listing shown';
      }
      if (parsedPriceRange.max < minListingRent || parsedPriceRange.min < minListingRent) {
        return 'the minimum range of listing is current housing shown';
      }
    }
    return '';
  }, [parsedPriceRange, minListingRent, maxListingRent, listings.length]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBudget !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (filters.noLandlordOnly) count++;
    if (filters.electricityBackup) count++;
    if (filters.acRoom) count++;
    if (filters.waterGeyser) count++;
    if (searchQuery.trim()) count++;
    if (priceSearch.trim()) count++;
    return count;
  }, [selectedBudget, statusFilter, filters, searchQuery, priceSearch]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedBudget('all');
    setStatusFilter('all');
    setSearchQuery('');
    setPriceSearch('');
    setSortBy('price-asc');
    setFilters({
      noLandlordOnly: false,
      electricityBackup: false,
      acRoom: false,
      waterGeyser: false
    });
  };

  // Filtered and sorted listings
  const filteredListings = useMemo(() => {
    const filtered = listings.filter(room => {
      const roomRent = Number(room.rentAmount) || 0;

      // 1. Price Range Search filtering & boundary handling
      if (parsedPriceRange) {
        if (boundaryMessage === 'max range of house is current listing shown') {
          // User entered price greater than max listing -> show max rent house instead
          if (roomRent !== maxListingRent) return false;
        } else if (boundaryMessage === 'the minimum range of listing is current housing shown') {
          // User entered price below least budget range -> show least housing
          if (roomRent !== minListingRent) return false;
        } else if (parsedPriceRange.type === 'single') {
          if (roomRent > parsedPriceRange.value) return false;
        } else if (parsedPriceRange.type === 'range') {
          if (roomRent < parsedPriceRange.min || roomRent > parsedPriceRange.max) return false;
        }
      }

      // 2. Budget tier: Standard (<= 8000), Comfort / AC (> 8000)
      if (selectedBudget === 'standard') {
        if (roomRent > 8000) return false;
      } else if (selectedBudget === 'premium') {
        if (roomRent <= 8000) return false;
      }

      // 3. Status filter
      const roomStatus = room.status || 'available';
      if (statusFilter === 'available' && roomStatus !== 'available') {
        return false;
      }
      if (statusFilter === 'occupied' && roomStatus !== 'occupied' && roomStatus !== 'reserved') {
        return false;
      }

      // 4. Specific student checkboxes
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

      // 5. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = room.title?.toLowerCase().includes(query);
        const matchesDesc = room.description?.toLowerCase().includes(query);
        const matchesAddress = room.address?.toLowerCase().includes(query);
        const matchesAgent = room.agentName?.toLowerCase().includes(query);
        const matchesCategory = room.customCategories?.some(cat => 
          cat.toLowerCase().includes(query)
        );

        if (!matchesTitle && !matchesDesc && !matchesAddress && !matchesCategory && !matchesAgent) {
          return false;
        }
      }

      return true;
    });

    // Apply ascending/descending order of price function
    if (sortBy === 'price-asc') {
      return sortRoomsByPriceAsc(filtered);
    }
    if (sortBy === 'price-desc') {
      return sortRoomsByPriceDesc(filtered);
    }
    return filtered;
  }, [
    listings,
    parsedPriceRange,
    boundaryMessage,
    maxListingRent,
    minListingRent,
    selectedBudget,
    statusFilter,
    filters,
    searchQuery,
    sortBy
  ]);

  // Handler when new room is added
  const handleRoomAdded = (newRoom) => {
    setListings(prev => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
  };

  // Handler to update room status (Available / Occupied / Reserved)
  const handleUpdateRoomStatus = async (roomId, newStatus) => {
    try {
      const res = await fetch(`/api/listings/${roomId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setListings(prev =>
          prev.map(item => (item.id === roomId ? { ...item, status: newStatus } : item))
        );
        if (selectedRoom?.id === roomId) {
          setSelectedRoom(prev => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        alert(data.message || 'Error updating status');
      }
    } catch (err) {
      console.error(err);
      alert('Could not connect to server to update status');
    }
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

  // Agent Deletion Request Handlers
  const handleOpenDeleteRequest = (room) => {
    setRoomToDeleteRequest(room);
  };

  const handleDeleteRequestSubmitted = (roomId, newRequest) => {
    setListings(prev =>
      prev.map(item => item.id === roomId ? { ...item, hasPendingDeleteRequest: true } : item)
    );
    if (isAdmin) {
      fetchPendingCount();
    }
  };

  // Handle pin select on map (Admin & House Agent)
  const handleSelectMapPin = (room) => {
    if (!isAdmin && !isAgent) return;
    setSelectedRoom(room);
    if (viewMode === 'grid') {
      setViewMode('split');
    }
  };

  // Main Admin & House Agent have access to interactive map view modes
  const canAccessMap = isAdmin || isAgent;
  const effectiveViewMode = canAccessMap ? viewMode : 'grid';

  return (
    <div className={`min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900 pb-20 transition-colors duration-500 ${
      isAgent ? 'bg-sky-50/80 text-slate-900' : 'bg-slate-50'
    }`}>
      
      {/* Top Navbar with Auth & Admin Controls */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenBecomeAgent={() => setIsBecomeAgentOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        pendingApplicationsCount={pendingAppsCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalListings={listings.length}
      />

      {/* Agent Active Workspace Banner with Glowing Agent Name */}
      {isAgent && (
        <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 text-white text-xs px-4 py-2 border-b border-sky-300/40 shadow-xs animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_8px_#ffffff]"></span>
              </span>
              <span className="font-bold">
                Logged in as House Agent:{' '}
                <span className="font-black text-white px-2 py-0.5 rounded-md bg-white/20 border border-white/30 drop-shadow-[0_0_10px_rgba(255,255,255,0.95)] animate-pulse">
                  {user?.name}
                </span>
              </span>
              <span className="hidden md:inline text-sky-200">•</span>
              <span className="hidden md:inline text-sky-100 font-medium">
                Light Blue Agent Workspace active. You have permissions to add video room tours & manage room availability.
              </span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1 bg-white hover:bg-sky-50 text-blue-900 font-black rounded-lg text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Add Room Tour</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Amenities Control Bar */}
      <FilterBar
        selectedBudget={selectedBudget}
        setSelectedBudget={setSelectedBudget}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        filters={filters}
        setFilters={setFilters}
        priceSearch={priceSearch}
        setPriceSearch={setPriceSearch}
        priceBoundaryMessage={boundaryMessage}
        minListingRent={minListingRent}
        maxListingRent={maxListingRent}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Dynamic Boundary Notice when price search exceeds max or min listing */}
        {boundaryMessage && (
          <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-950 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold capitalize text-amber-900">
                  {boundaryMessage}
                </p>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                  Available listing prices range from ₹{minListingRent.toLocaleString()} to ₹{maxListingRent.toLocaleString()} / month.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPriceSearch('')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl shrink-0 transition-colors cursor-pointer"
            >
              Reset Price
            </button>
          </div>
        )}
        
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
              Try broadening your budget, clearing status filters, or unchecking some amenities.
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
        {!loading && !error && filteredListings.length > 0 && effectiveViewMode === 'grid' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-800">{filteredListings.length}</strong> verified rooms
                {statusFilter !== 'all' && (
                  <span className="ml-1 text-blue-600 font-bold">({statusFilter.toUpperCase()})</span>
                )}
              </p>

              {/* Price Sort Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1.5 flex items-center gap-1">
                  Sort:
                </span>
                <button
                  onClick={() => setSortBy('price-asc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    sortBy === 'price-asc'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Arrange rooms in ascending order of price (Low to High)"
                >
                  <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                  <span>Price: Low to High</span>
                </button>
                <button
                  onClick={() => setSortBy('price-desc')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    sortBy === 'price-desc'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Arrange rooms in descending order of price (High to Low)"
                >
                  <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                  <span>Price: High to Low</span>
                </button>
              </div>
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
                  onRequestDeleteListing={handleOpenDeleteRequest}
                  onUpdateStatus={handleUpdateRoomStatus}
                  onEditRoom={(r) => setRoomToEdit(r)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Listings Display: SPLIT VIEW (List + Interactive Map) - Admin & House Agent */}
        {!loading && !error && filteredListings.length > 0 && effectiveViewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Scrollable Room Cards (Left) */}
            <div className="lg:col-span-6 overflow-y-auto pr-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <strong className="text-slate-800">{filteredListings.length}</strong> rooms with GPS pins
                </p>
                <button
                  onClick={() => setSortBy(prev => prev === 'price-asc' ? 'price-desc' : 'price-asc')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Toggle price order"
                >
                  <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  <span>{sortBy === 'price-asc' ? 'Price: Low → High' : 'Price: High → Low'}</span>
                </button>
              </div>
              {filteredListings.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  onWatchVideo={(r) => setActiveVideoRoom(r)}
                  onSelectMapPin={(r) => setSelectedRoom(r)}
                  onDeleteListing={handleDeleteListing}
                  onRequestDeleteListing={handleOpenDeleteRequest}
                  onUpdateStatus={handleUpdateRoomStatus}
                  onEditRoom={(r) => setRoomToEdit(r)}
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

        {/* Listings Display: FULL MAP VIEW - Admin & House Agent */}
        {!loading && !error && effectiveViewMode === 'map' && (
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
                    className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs shadow-md cursor-pointer"
                  >
                    ×
                  </button>
                  <RoomCard
                    room={selectedRoom}
                    isSelected={true}
                    onWatchVideo={(r) => setActiveVideoRoom(r)}
                    onSelectMapPin={() => {}}
                    onDeleteListing={handleDeleteListing}
                    onUpdateStatus={handleUpdateRoomStatus}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Widgets (WhatsApp, View Mode Switcher, Calculator) */}
      <FloatingAgentWidget
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => {
          if (!user) setIsAuthModalOpen(true);
          else setIsAddModalOpen(true);
        }}
      />

      {/* Add Room Tour Modal (Agent / Admin Upload) */}
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

      {/* Auth Modal (Sign in as Admin or Agent) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenBecomeAgent={() => setIsBecomeAgentOpen(true)}
      />

      {/* Become a House Agent Modal (Public Application) */}
      <BecomeAgentModal
        isOpen={isBecomeAgentOpen}
        onClose={() => setIsBecomeAgentOpen(false)}
        onApplicationSubmitted={() => {
          if (isAdmin) fetchPendingCount();
        }}
      />

      {/* Main Admin Management Panel */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        listings={listings}
        onUpdateRoomStatus={handleUpdateRoomStatus}
        onRefreshListings={fetchListings}
      />

      {/* Delete Request Modal (Agent Deletion Approval Workflow) */}
      <DeleteRequestModal
        isOpen={!!roomToDeleteRequest}
        onClose={() => setRoomToDeleteRequest(null)}
        room={roomToDeleteRequest}
        onRequestSubmitted={handleDeleteRequestSubmitted}
      />

      {/* Edit Room Details Modal */}
      {roomToEdit && (
        <EditRoomModal
          isOpen={Boolean(roomToEdit)}
          room={roomToEdit}
          onClose={() => setRoomToEdit(null)}
          onRoomUpdated={handleRoomUpdated}
        />
      )}

      {/* Instant Session Revocation & Auto-Logout Modal */}
      {revocationNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse text-red-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {revocationNotice.code === 'ACCOUNT_SUSPENDED' 
                  ? 'Agent Account Suspended' 
                  : revocationNotice.code === 'ACCOUNT_REMOVED'
                  ? 'Agent Account Removed'
                  : 'Session Terminated'}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {revocationNotice.message}
              </p>
            </div>

            {revocationNotice.reason && (
              <div className="p-3.5 bg-red-50/80 rounded-2xl border border-red-200/60 text-left text-xs text-red-900 space-y-1">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-red-700">Reason for Action:</span>
                <p className="italic font-medium">"{revocationNotice.reason}"</p>
              </div>
            )}

            {revocationNotice.suspendedUntil && (
              <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 py-2 px-3 rounded-xl border border-amber-200/80">
                ⏳ Suspended until: <strong className="text-amber-950">{new Date(revocationNotice.suspendedUntil).toLocaleString()}</strong>
              </p>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <a
                href="https://wa.me/919041543868?text=Hello%20Admin,%20my%20agent%20session%20was%20revoked.%20I%20would%20like%20to%20inquire%20regarding%20my%20account."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Main Admin (+91 9041543868)</span>
              </a>

              <button
                onClick={() => {
                  clearRevocationNotice();
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
