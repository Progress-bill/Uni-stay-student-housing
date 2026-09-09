import React from 'react';
import { 
  Home, 
  PlusCircle, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  UserPlus, 
  LogIn, 
  LogOut, 
  Settings, 
  User, 
  Crown,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  onOpenAddModal, 
  onOpenAuthModal, 
  onOpenBecomeAgent, 
  onOpenAdminPanel,
  pendingApplicationsCount = 0,
  searchQuery, 
  setSearchQuery, 
  totalListings 
}) {
  const { user, logout, isAdmin, isAgent, isAuthenticated } = useAuth();

  const handleAddRoomClick = () => {
    if (!isAuthenticated) {
      onOpenAuthModal();
    } else {
      onOpenAddModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Agent Branding */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  UniStay
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                  Verified Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Student Housing & PG Video Tours</p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Search by college, metro, room type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-full transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Actions & Role Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* 1. Main Admin Controls */}
            {isAdmin && (
              <button
                onClick={onOpenAdminPanel}
                className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-sm shadow-amber-500/30 transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>Admin Dashboard</span>
                {pendingApplicationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce">
                    {pendingApplicationsCount}
                  </span>
                )}
              </button>
            )}

            {/* 2. Public "Become a House Agent" Button */}
            {!isAdmin && (
              <button
                onClick={onOpenBecomeAgent}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Become an Agent</span>
              </button>
            )}

            {/* 3. Add Room Tour Button (Allowed for Admin or Agent) */}
            <button
              onClick={handleAddRoomClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Room Tour</span>
            </button>

            {/* 4. Auth State / Login & Logout */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 pl-1">
                <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                  isAdmin 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  {isAdmin ? <Crown className="w-3 h-3 text-amber-600" /> : <Briefcase className="w-3 h-3 text-blue-600" />}
                  <span className="hidden lg:inline">{user.name}</span>
                  <span className="lg:hidden">{isAdmin ? 'Admin' : 'Agent'}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </button>
            )}

          </div>

        </div>

        {/* Mobile Search & Become Agent Bar */}
        <div className="pb-3 md:hidden flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search college, metro, PG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-full focus:bg-white outline-none"
            />
          </div>
          {!isAdmin && (
            <button
              onClick={onOpenBecomeAgent}
              className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold whitespace-nowrap"
            >
              + Agent
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
