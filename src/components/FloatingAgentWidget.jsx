import React, { useState } from 'react';
import { 
  MessageCircle, 
  Map, 
  LayoutGrid, 
  Columns2, 
  Calculator, 
  X, 
  Zap, 
  Crown 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FloatingAgentWidget({ 
  viewMode, 
  setViewMode, 
  onOpenAddModal 
}) {
  const { isAdmin } = useAuth();
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcRent, setCalcRent] = useState(4500);
  const [calcUnits, setCalcUnits] = useState(60);
  const [calcUnitRate, setCalcUnitRate] = useState(8);

  const totalEstimatedCost = Number(calcRent) + (Number(calcUnits) * Number(calcUnitRate));

  return (
    <>
      {/* Floating View Switcher Bar (Only visible to Main Admin!) */}
      {isAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-1.5 animate-in fade-in">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 pl-1 pr-1 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Map:
          </span>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Rooms</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'split' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split Map</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'map' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
        </div>
      )}

      {/* Floating Agent Action & Student Budget Calculator (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        
        {/* Student Budget Calculator Popup */}
        {showCalculator && (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 w-80 text-slate-800 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Calculator className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Student Budget Calculator
                </h4>
              </div>
              <button
                onClick={() => setShowCalculator(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Estimated Room Rent (₹/mo):
                </label>
                <input
                  type="number"
                  value={calcRent}
                  onChange={(e) => setCalcRent(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Monthly Units:
                  </label>
                  <input
                    type="number"
                    value={calcUnits}
                    onChange={(e) => setCalcUnits(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ₹ / Unit:
                  </label>
                  <input
                    type="number"
                    value={calcUnitRate}
                    onChange={(e) => setCalcUnitRate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-[11px] text-blue-700 font-medium flex items-center justify-between">
                  <span>Electricity Bill:</span>
                  <span className="font-bold">₹{calcUnits * calcUnitRate}</span>
                </div>
                <div className="text-sm font-extrabold text-blue-950 flex items-center justify-between mt-1 pt-1 border-t border-blue-200/60">
                  <span>Total Budget:</span>
                  <span className="text-base text-blue-600">₹{totalEstimatedCost.toLocaleString()}/mo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Group */}
        <div className="flex items-center gap-2">
          {/* Toggle Budget Calculator */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="h-12 w-12 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Open Student Budget Calculator"
          >
            <Calculator className="w-5 h-5 text-blue-600" />
          </button>

          {/* Quick WhatsApp Connect -> +91 9041543868 */}
          <a
            href="https://wa.me/919041543868?text=Hello%20Admin!%20I%20am%20a%20student%20looking%20for%20an%20affordable%20PG%20room."
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="WhatsApp Admin (+91 9041543868)"
          >
            <MessageCircle className="w-6 h-6" />
          </a>
        </div>

      </div>
    </>
  );
}
