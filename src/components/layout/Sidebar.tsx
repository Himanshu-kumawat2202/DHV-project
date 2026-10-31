import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  MapPin,
  BarChart3,
  GitCompare,
  ScatterChart,
  Layers,
  Shuffle,
  AlertTriangle,
  Building2,
  Sparkles,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const MAIN_MENU: NavItem[] = [
  { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'ranking-trends', label: 'Ranking Trends', icon: TrendingUp },
  { id: 'geographical', label: 'Geographical Analysis', icon: MapPin },
  { id: 'score-distribution', label: 'Score Distribution', icon: BarChart3 },
  { id: 'comparison', label: 'Institution Comparison', icon: GitCompare },
  { id: 'correlation', label: 'Correlation Analysis', icon: ScatterChart },
  { id: 'multivariate', label: 'Multivariate Analysis', icon: Layers },
  { id: 'transitions', label: 'Ranking Transitions', icon: Shuffle },
  { id: 'outliers', label: 'Outlier Detection', icon: AlertTriangle },
];

const EXPLORE_MENU: NavItem[] = [
  { id: 'explore', label: 'Explore Institutions', icon: Building2 },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { currentPage, setCurrentPage, setIsAIPanelOpen } = useApp();

  const handleNavClick = (id: PageId) => {
    if (id === 'ai-assistant') {
      setIsAIPanelOpen(true);
      setIsMobileOpen(false);
      return;
    }
    setCurrentPage(id);
    setIsMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-sm select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <div
          onClick={() => setCurrentPage('overview')}
          className="flex items-center gap-3 cursor-pointer group overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                NIRF Insights
              </span>
              <span className="text-[11px] font-medium text-slate-500 truncate">
                Institutional Analytics
              </span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {/* Main Menu Section */}
        <div>
          {!isCollapsed && (
            <h3 className="px-3 text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-2">
              Main Menu
            </h3>
          )}
          <nav className="space-y-1">
            {MAIN_MENU.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Explore Section */}
        <div>
          {!isCollapsed && (
            <h3 className="px-3 text-[11px] font-semibold tracking-wider text-slate-600 uppercase mb-2">
              Explore
            </h3>
          )}
          <nav className="space-y-1">
            {EXPLORE_MENU.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-left flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Dataset Version Info Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        {!isCollapsed ? (
          <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200/80 text-[11px] text-slate-500">
            <div className="flex items-center justify-between font-medium text-slate-700 mb-0.5">
              <span>NIRF Framework</span>
              <span className="text-emerald-700 font-semibold">2017–2025</span>
            </div>
            <p className="text-[10px] text-slate-600">MHRD / MoE Official Metrics</p>
          </div>
        ) : (
          <div className="flex justify-center" title="NIRF 2017-2025 Data">
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
};
