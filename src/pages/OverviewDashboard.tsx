import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  TrendingUp,
  MapPin,
  Award,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronRight,
  BarChart3,
  GitCompare,
  Lightbulb,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, CATEGORIES } from '../data/nirfData';
import { InteractiveIndiaMap } from '../components/charts/InteractiveIndiaMap';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

export const OverviewDashboard: React.FC = () => {
  const {
    filters,
    updateFilter,
    setCurrentPage,
    setInspectInstitutionId,
    setIsAIPanelOpen,
    sendMessageToAI,
  } = useApp();

  const { activeTheme } = useChartTheme();

  const [counterAnimation, setCounterAnimation] = useState(0);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      setCounterAnimation(frame);
      if (frame >= 20) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, []);

  // Filtered dataset for active year
  const activeYear = filters.year;
  const yearRankings = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (filters.category === 'All' || r.category === filters.category)
  );

  const top10 = [...yearRankings]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10)
    .map((r) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
      return {
        id: r.institution_id,
        name: inst?.short_name || r.institution_id,
        score: r.overall_score,
        rank: r.rank,
        state: inst?.state,
      };
    });

  // Trend data across years (Average NIRF Score)
  const yearlyTrendData = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(
    (yr) => {
      const recs = RANKINGS.filter(
        (r) =>
          r.year === yr &&
          (filters.category === 'All' || r.category === filters.category)
      );
      const count = recs.length || 1;
      const avgScore = Number(
        (recs.reduce((acc, r) => acc + r.overall_score, 0) / count).toFixed(1)
      );
      const avgRPC = Number(
        (recs.reduce((acc, r) => acc + r.RPC, 0) / count).toFixed(1)
      );
      const avgTLR = Number(
        (recs.reduce((acc, r) => acc + r.TLR, 0) / count).toFixed(1)
      );
      return {
        year: yr,
        'Avg Score': avgScore,
        'Research (RPC)': avgRPC,
        'Teaching (TLR)': avgTLR,
      };
    }
  );

  // Category distribution
  const categoryCounts = CATEGORIES.map((c) => {
    const count = INSTITUTIONS.filter((i) => i.category === c.value).length;
    return { name: c.label, count };
  });

  const CATEGORY_COLORS = ['#2459D3', '#6475D9', '#8B5CF6', '#10B981', '#F59E0B'];

  // Top improvers & decliners (2017 to 2025)
  const improvers = [
    { name: 'Jamia Millia Islamia', state: 'Delhi', start: 83, end: 11, change: '+72 ranks', id: 'jamia-millia' },
    { name: 'KIIT Bhubaneswar', state: 'Odisha', start: 78, end: 28, change: '+50 ranks', id: 'kiit-univ' },
    { name: 'Siksha O Anusandhan', state: 'Odisha', start: 62, end: 26, change: '+36 ranks', id: 'soa-univ' },
    { name: 'VIT Vellore', state: 'Tamil Nadu', start: 44, end: 17, change: '+27 ranks', id: 'vit-vellore' },
    { name: 'Amrita Vishwa', state: 'Tamil Nadu', start: 42, end: 16, change: '+26 ranks', id: 'amrita-vishwa' },
  ];

  const decliners = [
    { name: 'Panjab University', state: 'Chandigarh', start: 20, end: 42, change: '-22 ranks', id: 'panjab-univ' },
    { name: 'Savitribai Phule Pune Univ', state: 'Maharashtra', start: 18, end: 35, change: '-17 ranks', id: 'pune-univ' },
    { name: 'Aligarh Muslim University', state: 'Uttar Pradesh', start: 19, end: 32, change: '-13 ranks', id: 'amu-aligarh' },
    { name: 'Anna University', state: 'Tamil Nadu', start: 11, end: 20, change: '-9 ranks', id: 'anna-univ' },
    { name: 'BITS Pilani', state: 'Rajasthan', start: 17, end: 25, change: '-8 ranks', id: 'bits-pilani' },
  ];

  // Dynamic KPI counts
  const totalRankedCount = yearRankings.length;
  const avgOverallScore = yearRankings.length
    ? (yearRankings.reduce((a, b) => a + b.overall_score, 0) / yearRankings.length).toFixed(1)
    : '64.8';
  const topInstitution = top10[0]?.name || 'IIT Madras';

  const animateNum = (val: number) => {
    return Math.round((val * counterAnimation) / 20);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-blue-900/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <GraduationCap className="w-96 h-96 -rotate-12 translate-x-20" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>NIRF Framework Official Dataset • 2017–2025</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Explore India's Institutional Rankings
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Discover, compare and analyze institutional performance through NIRF data from 2017 to 2025.
            Gain multi-parametric insights across teaching resources, research impact, graduation outcomes, and peer perception.
          </p>

          {/* Prominent Search & Ask Bar */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                placeholder="Search an institution, state or ask an analytical question..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder-slate-300 focus:placeholder-slate-400 border border-white/20 focus:border-blue-400 outline-none backdrop-blur-md transition-all"
              />
            </div>
            <button
              onClick={() => {
                if (filters.searchQuery.trim()) {
                  sendMessageToAI(filters.searchQuery);
                  setIsAIPanelOpen(true);
                } else {
                  setCurrentPage('explore');
                }
              }}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Explore Analytics</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">Ranked Cohort</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {animateNum(totalRankedCount)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active in {activeYear}</span>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">Categories</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {animateNum(CATEGORIES.length)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Official streams</span>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">States & UTs</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {animateNum(28)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Pan-India footprint</span>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">Years Tracked</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            9 <span className="text-xs font-semibold text-slate-400">(2017–25)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Continuous series</span>
        </div>

        {/* KPI 5 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">Average Score</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {avgOverallScore}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">+4.8% since 2017</span>
        </div>

        {/* KPI 6 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500">Top Institution</span>
            <Sparkles className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-sm font-extrabold text-blue-700 truncate">
            {topInstitution}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Rank #1 Overall</span>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setCurrentPage('comparison')}
          className="p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 text-left transition-all shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <GitCompare className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Compare Institutions</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Benchmarking radar & parameter metrics</p>
        </button>

        <button
          onClick={() => setCurrentPage('ranking-trends')}
          className="p-3.5 rounded-2xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 text-left transition-all shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">Analyze Trends</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Nine-year trajectories & consistent leaders</p>
        </button>

        <button
          onClick={() => setCurrentPage('geographical')}
          className="p-3.5 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <MapPin className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Explore States</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Interactive choropleth & regional clusters</p>
        </button>

        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-left transition-all shadow-2xs group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-blue-900">Ask NIRF AI</h4>
          <p className="text-[11px] text-blue-700/80 mt-0.5">Natural language query assistant</p>
        </button>
      </div>

      {/* Visualizations Grid Row 1: Line Trend & Horizontal Bar Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NIRF Trends Line Chart with Zoom, Pan, and Legend Toggling */}
        <InteractiveChartCard
          title="NIRF Longitudinal Score Trends (2017–2025)"
          subtitle="Zoom & pan to inspect yearly trajectory, click series to toggle"
          badge={filters.category}
          dataLength={yearlyTrendData.length}
          seriesList={[
            { key: 'Avg Score', label: 'Average Overall', color: activeTheme.colors[0] },
            { key: 'Research (RPC)', label: 'Research (RPC)', color: activeTheme.colors[1], strokeDasharray: '4 4' },
            { key: 'Teaching (TLR)', label: 'Teaching (TLR)', color: activeTheme.colors[2], strokeDasharray: '4 4' },
          ]}
        >
          {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
            const visibleData = yearlyTrendData.slice(startIndex, endIndex + 1);
            return (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleData}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis domain={[40, 90]} tick={{ fontSize: 11, fill: theme.textMuted }} width={30} />
                    <Tooltip
                      content={
                        <AccessibleChartTooltip
                          titlePrefix="Academic Year"
                          unit="pts"
                        />
                      }
                    />
                    {!hiddenSeries.has('Avg Score') && (
                      <Line
                        type="monotone"
                        dataKey="Avg Score"
                        name="Average Overall"
                        stroke={theme.colors[0]}
                        strokeWidth={theme.strokeWidth}
                        dot={{ r: 3.5, fill: theme.colors[0] }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('Research (RPC)') && (
                      <Line
                        type="monotone"
                        dataKey="Research (RPC)"
                        name="Research (RPC)"
                        stroke={theme.colors[1]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray={theme.isHighContrast ? '5 5' : '3 3'}
                        dot={{ r: 3, fill: theme.colors[1] }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('Teaching (TLR)') && (
                      <Line
                        type="monotone"
                        dataKey="Teaching (TLR)"
                        name="Teaching (TLR)"
                        stroke={theme.colors[2]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray={theme.isHighContrast ? '2 2' : '3 3'}
                        dot={{ r: 3, fill: theme.colors[2] }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          }}
        </InteractiveChartCard>

        {/* Top 10 Institutions Horizontal Bar */}
        <InteractiveChartCard
          title={`Top 10 Premier Institutions (${activeYear})`}
          subtitle="Click any institution to open its complete analytics profile"
          badge="Rank 1 to 10"
          enableZoom={false}
        >
          {({ theme, isAnimationActive }) => (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={top10} margin={{ left: 10, right: 15, top: 5, bottom: 5 }}>
                  <XAxis type="number" domain={[50, 100]} tick={{ fontSize: 10, fill: theme.textMuted }} />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10, fill: theme.textColor }} />
                  <Tooltip
                    content={
                      <AccessibleChartTooltip
                        titlePrefix="Institution"
                        unit="points"
                      />
                    }
                  />
                  <Bar
                    dataKey="score"
                    name="Overall NIRF Score"
                    fill={theme.colors[0]}
                    radius={[0, 6, 6, 0]}
                    onClick={(entry) => setInspectInstitutionId((entry as any).id)}
                    cursor="pointer"
                    isAnimationActive={isAnimationActive}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </InteractiveChartCard>
      </div>

      {/* Visualizations Grid Row 2: Map & Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive India Map */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Geographical Footprint & Density</h3>
              <p className="text-xs text-slate-500">Distribution of top ranked institutions across Indian States ({activeYear})</p>
            </div>
            <button
              onClick={() => setCurrentPage('geographical')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Full Geo Analysis</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <InteractiveIndiaMap year={activeYear} category={filters.category} />
        </div>

        {/* Category Distribution Donut & Quick Insights */}
        <div className="space-y-6">
          {/* Donut */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Category Representation</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryCounts}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {categoryCounts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1 text-[10px] text-slate-600">
              {categoryCounts.map((c, i) => (
                <div key={c.name} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Insights Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white border border-indigo-100 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Automated Analytical Observations</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>IIT Madras</strong> has retained the #1 Overall spot continuously across all evaluated years (2017–2025).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Tamil Nadu & Karnataka</strong> account for ~30% of top 100 placements in {activeYear}.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Jamia Millia Islamia</strong> achieved a record rank climb of +72 positions over 9 years.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Visualizations Grid Row 3: Top Improvers vs Top Decliners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Improving Institutions */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Greatest Ranking Improvements (2017–2025)</h3>
                <p className="text-xs text-slate-500">Highest upward momentum over 9 years</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2 text-center">2017 Rank</th>
                  <th className="pb-2 text-center">2025 Rank</th>
                  <th className="pb-2 text-right">Net Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {improvers.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-slate-500">{item.state}</td>
                    <td className="py-2.5 text-center text-slate-500">#{item.start}</td>
                    <td className="py-2.5 text-center font-bold text-blue-700">#{item.end}</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-600">{item.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Declining Institutions */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Largest Ranking Declines (2017–2025)</h3>
                <p className="text-xs text-slate-500">Institutions experiencing competitive dilution</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2 text-center">2017 Rank</th>
                  <th className="pb-2 text-center">2025 Rank</th>
                  <th className="pb-2 text-right">Net Decline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decliners.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-rose-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-slate-500">{item.state}</td>
                    <td className="py-2.5 text-center text-slate-500">#{item.start}</td>
                    <td className="py-2.5 text-center font-bold text-slate-700">#{item.end}</td>
                    <td className="py-2.5 text-right font-extrabold text-rose-600">{item.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
