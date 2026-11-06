/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ChartThemeProvider } from './context/ChartThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalFilterBar } from './components/layout/GlobalFilterBar';
import { AIAssistantPanel } from './components/ai/AIAssistantPanel';
import { InstitutionProfileModal } from './components/common/InstitutionProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileDrawer } from './components/auth/ProfileDrawer';
import { ChartThemeModal } from './components/charts/ChartThemeModal';

// Analytical Pages
import { OverviewDashboard } from './pages/OverviewDashboard';
import { RankingTrends } from './pages/RankingTrends';
import { GeographicalAnalysis } from './pages/GeographicalAnalysis';
import { ScoreDistribution } from './pages/ScoreDistribution';
import { InstitutionComparison } from './pages/InstitutionComparison';
import { CorrelationAnalysis } from './pages/CorrelationAnalysis';
import { MultivariateAnalysis } from './pages/MultivariateAnalysis';
import { DistributionStats } from './pages/DistributionStats';
import { RankingTransitions } from './pages/RankingTransitions';
import { OutlierDetection } from './pages/OutlierDetection';
import { ExploreInstitutions } from './pages/ExploreInstitutions';
import { DynamicFeatures } from './pages/DynamicFeatures';

const MainLayout: React.FC = () => {
  const { currentPage } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const renderActivePage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewDashboard />;
      case 'ranking-trends':
        return <RankingTrends />;
      case 'geographical':
        return <GeographicalAnalysis />;
      case 'score-distribution':
        return <ScoreDistribution />;
      case 'comparison':
        return <InstitutionComparison />;
      case 'correlation':
        return <CorrelationAnalysis />;
      case 'multivariate':
        return <MultivariateAnalysis />;
      case 'dist-stats':
        return <DistributionStats />;
      case 'transitions':
        return <RankingTransitions />;
      case 'outliers':
        return <OutlierDetection />;
      case 'explore':
        return <ExploreInstitutions />;
      case 'dynamic-features':
        return <DynamicFeatures />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#17233B] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
          }`}
      >
        {/* Top Header */}
        <Header
          onToggleMobileMenu={() => setIsMobileOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Global Filter Bar - exclusively on Overview Dashboard */}
        {currentPage === 'overview' && <GlobalFilterBar />}

        {/* Main Routed Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>

        {/* Platform Footer */}
        <footer className="px-6 py-4 border-t border-slate-200/80 bg-white/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            NIRF Insights • Academic Institutional Analytics Platform (2017–2025 Data Series)
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>MHRD / MoE NIRF Methodology</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">Active Prototype</span>
          </div>
        </footer>
      </div>

      {/* Modals & Overlays */}
      <AIAssistantPanel />
      <InstitutionProfileModal />
      <AuthModal />
      <ProfileDrawer />
      <ChartThemeModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ChartThemeProvider>
        <MainLayout />
      </ChartThemeProvider>
    </AppProvider>
  );
}
