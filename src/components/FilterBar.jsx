import React from 'react';
import { 
  Zap, 
  Wind, 
  Flame, 
  UserX, 
  SlidersHorizontal, 
  IndianRupee, 
  RotateCcw,
  CheckCircle2,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';

export default function FilterBar({
  selectedBudget,
  setSelectedBudget,
  statusFilter,
  setStatusFilter,
  filters,
  setFilters,
  priceSearch,
  setPriceSearch,
  priceBoundaryMessage,
  minListingRent,
  maxListingRent,
  onResetFilters,
  activeFilterCount
}) {
  const budgetTiers = [
    { id: 'all', label: 'All Budgets', sub: 'Show all' },
    { id: 'standard', label: 'Standard PG', sub: '≤ ₹8,000/mo' },
    { id: 'premium', label: 'Comfort / AC', sub: '> ₹8,000/mo' }
  ];

  const handleCheckboxChange = (key) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        
        {/* Row 1: Budget Grouping Tiers & Availability Filter */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Budget:
            </span>
            {budgetTiers.map((tier) => {
              const isActive = selectedBudget === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedBudget(tier.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tier.label} <span className="opacity-75 font-normal text-[11px]">({tier.sub})</span>
                </button>
              );
            })}
          </div>

          {/* Availability Status Filter Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Available Only
            </button>
            <button
              onClick={() => setStatusFilter('occupied')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'occupied'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Booked / Occupied
            </button>
          </div>

          {/* Reset button */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters ({activeFilterCount})
            </button>
          )}

        </div>

        {/* Row 2: Required Student Checkboxes & Amenities */}
        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* 1. Landlord at PG Checkbox Filter */}
            <button
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  noLandlordOnly: !prev.noLandlordOnly
                }));
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filters.noLandlordOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <UserX className={`w-3.5 h-3.5 ${filters.noLandlordOnly ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>No Landlord at PG</span>
              {filters.noLandlordOnly && <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />}
            </button>

            {/* 2. Electricity Backup Checkbox */}
            <button
              onClick={() => handleCheckboxChange('electricityBackup')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filters.electricityBackup
                  ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${filters.electricityBackup ? 'text-amber-500 fill-amber-500' : 'text-slate-500'}`} />
              <span>Power Backup</span>
              {filters.electricityBackup && <CheckCircle2 className="w-3 h-3 text-amber-600 ml-0.5" />}
            </button>

            {/* 3. AC Room Checkbox */}
            <button
              onClick={() => handleCheckboxChange('acRoom')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filters.acRoom
                  ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Wind className={`w-3.5 h-3.5 ${filters.acRoom ? 'text-sky-600' : 'text-slate-500'}`} />
              <span>AC Room</span>
              {filters.acRoom && <CheckCircle2 className="w-3 h-3 text-sky-600 ml-0.5" />}
            </button>

            {/* 4. Water Geyser Checkbox */}
            <button
              onClick={() => handleCheckboxChange('waterGeyser')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filters.waterGeyser
                  ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${filters.waterGeyser ? 'text-rose-600' : 'text-slate-500'}`} />
              <span>Water Geyser</span>
              {filters.waterGeyser && <CheckCircle2 className="w-3 h-3 text-rose-600 ml-0.5" />}
            </button>

          </div>

          {/* Price Range Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 ml-auto w-full sm:w-auto">
            <div className="relative flex items-center w-full sm:w-auto">
              <span className="absolute left-2.5 text-slate-400 font-bold text-xs pointer-events-none flex items-center">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                placeholder="Search price range (e.g. 7000 or 5k-8k)"
                className="pl-7 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none w-full sm:w-64 transition-all shadow-2xs focus:ring-2 focus:ring-blue-500/20"
              />
              {priceSearch && (
                <button
                  type="button"
                  onClick={() => setPriceSearch('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer transition-colors"
                  title="Clear price filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {priceBoundaryMessage && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 inline-flex items-center gap-1 shadow-2xs animate-fadeIn whitespace-nowrap">
                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                {priceBoundaryMessage}
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
