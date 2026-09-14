import React from 'react';
import { 
  MessageCircle, 
  Map, 
  LayoutGrid, 
  Columns2, 
  Crown 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FloatingAgentWidget({ 
  viewMode, 
  setViewMode 
}) {
  const { isAdmin, isAgent } = useAuth();
  const canAccessMap = isAdmin || isAgent;

  return (
    <>
      {/* Floating View Switcher Bar (Visible to Admin and House Agent) */}
      {canAccessMap && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-1.5 animate-in fade-in">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 pl-1 pr-1 flex items-center gap-1">
            {isAdmin ? <Crown className="w-3 h-3" /> : <Map className="w-3 h-3 text-sky-400" />} {isAdmin ? 'Admin Map:' : 'Agent Map:'}
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

      {/* Floating WhatsApp Action Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40">
        <a
          href="https://wa.me/919041543868?text=Hello%20Admin!%20I%20am%20a%20student%20looking%20for%20an%20affordable%20PG%20room."
          target="_blank"
          rel="noopener noreferrer"
          className="h-13 w-13 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/35 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          title="WhatsApp Admin (+91 9041543868)"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      </div>
    </>
  );
}
