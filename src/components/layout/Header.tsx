import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  ChevronDown,
  Bookmark,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  ExternalLink,
  Palette,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useChartTheme } from '../../context/ChartThemeContext';
import { INSTITUTIONS } from '../../data/nirfData';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isSidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  isSidebarCollapsed,
}) => {
  const {
    currentPage,
    setCurrentPage,
    user,
    setIsAuthModalOpen,
    setAuthModalMode,
    setIsProfileDrawerOpen,
    logout,
    filters,
    updateFilter,
    setInspectInstitutionId,
    setIsAIPanelOpen,
    notifications,
    markNotificationsAsRead,
    isNotificationsOpen,
    setIsNotificationsOpen,
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Search filtered institutions
  const searchResults = filters.searchQuery.trim().length > 1
    ? INSTITUTIONS.filter(
        (i) =>
          i.institution_name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          i.short_name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          i.state.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const getBreadcrumb = () => {
    const titles: Record<string, string> = {
      overview: 'Overview Dashboard',
      'ranking-trends': 'Ranking Trends',
      geographical: 'Geographical Analysis',
      'score-distribution': 'Score Distribution',
      comparison: 'Institution Comparison',
      correlation: 'Correlation Analysis',
      multivariate: 'Multivariate Analysis',
      transitions: 'Ranking Transitions',
      outliers: 'Outlier Detection',
      explore: 'Explore Institutions',
      'ai-assistant': 'NIRF AI Assistant',
    };
    return titles[currentPage] || 'Dashboard';
  };

  const { setIsThemeModalOpen, activeTheme } = useChartTheme();

  return (
    <header
      className={`sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300 px-4 sm:px-6 flex items-center justify-between gap-4`}
    >
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
          <button
            onClick={() => setCurrentPage('overview')}
            className="hover:text-blue-600 transition-colors"
          >
            NIRF Insights
          </button>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{getBreadcrumb()}</span>
        </nav>
      </div>

      {/* Middle: Universal Quick Search */}
      <div className="flex-1 max-w-md relative">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
            placeholder="Search an institution, state or ask a question..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
        </div>

        {/* Quick Search Dropdown Preview */}
        {searchFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/70 border-b border-slate-100">
              Matching Institutions ({searchResults.length})
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.institution_id}
                  onMouseDown={() => {
                    setInspectInstitutionId(item.institution_id);
                    updateFilter('searchQuery', '');
                  }}
                  className="px-3 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                      {item.short_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.city}, {item.state} • {item.category}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Theme Manager, AI Quick Button, Notifications, Auth/Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Chart Theme Manager Button */}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 shadow-2xs"
          title={`Chart Theme: ${activeTheme.name}`}
          aria-label="Open Chart Theme Manager"
        >
          <Palette className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Theme</span>
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: activeTheme.colors[0] }}
          />
        </button>

        {/* Quick AI Trigger button */}
        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all border border-indigo-200/60 shadow-2xs"
          title="Open NIRF AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Notifications Icon & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              markNotificationsAsRead();
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] text-blue-600 font-medium">All caught up</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 text-xs hover:bg-slate-100/80 transition-colors">
                    <p className="font-semibold text-slate-800 text-[11px]">{n.title}</p>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Auth / Profile Area */}
        {user ? (
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {user.name.charAt(0)}
              </div>
              <span className="hidden lg:inline max-w-[120px] truncate">{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                    {user.role}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileDrawerOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileDrawerOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                    Saved Comparisons ({user.savedComparisons.length})
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileDrawerOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    Saved Analyses ({user.savedAnalyses.length})
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={logout}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalMode('register');
                setIsAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
