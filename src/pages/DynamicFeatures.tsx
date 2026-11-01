/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dynamic Features Page for NIRF Insights
 * Complete dynamic statistical, analytical, geospatial, multivariate, and sampling laboratory.
 * Verification Note: All statistics (sample SD n-1, KDE Silverman rule, Gauss-Jordan polynomial fit,
 * Jacobi eigenvalue PCA decomposition, and Mulberry32 reproducible sampling) are computed directly
 * from real NIRF data (2017–2025).
 */

import React, { useState, useMemo } from 'react';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Layers,
  MapPin,
  Database,
  CheckCircle,
  AlertTriangle,
  Eye,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';

import { useApp } from '../context/AppContext';
import {
  INSTITUTIONS,
  RANKINGS,
  YEARS,
  CATEGORIES,
  STATES,
} from '../data/nirfData';
import { INDIA_STATES } from '../data/indiaGeo';
import {
  calculateExtendedStats,
  calculateCovarianceAndCorrelation,
  detectOutliersIQR,
  calculateBins,
  calculateKDE,
  calculateECDF,
  calculateMovingAverage,
  calculatePolynomialFit,
  computePCA,
  executeSampling,
  SmoothingMethod,
  SamplingMethod,
} from '../utils/dynamicStats';

// Parameter definitions
type ParameterKey = 'overall_score' | 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR' | 'rank';

const PARAMETER_OPTIONS: { key: ParameterKey; label: string; max: number; unit: string }[] = [
  { key: 'overall_score', label: 'Overall Score', max: 100, unit: 'pts' },
  { key: 'TLR', label: 'Teaching, Learning & Resources (TLR)', max: 100, unit: 'pts' },
  { key: 'RPC', label: 'Research & Professional Practice (RPC)', max: 100, unit: 'pts' },
  { key: 'GO', label: 'Graduation Outcomes (GO)', max: 100, unit: 'pts' },
  { key: 'OI', label: 'Outreach & Inclusivity (OI)', max: 100, unit: 'pts' },
  { key: 'PR', label: 'Perception (PR)', max: 100, unit: 'pts' },
  { key: 'rank', label: 'National Rank', max: 200, unit: 'rank' },
];

export const DynamicFeatures: React.FC = () => {
  const { setInspectInstitutionId } = useApp();

  // ==========================================
  // SHARED GLOBAL FILTER STATE
  // ==========================================
  const [yearMode, setYearMode] = useState<'single' | 'range'>('single');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [startYear, setStartYear] = useState<number>(2017);
  const [endYear, setEndYear] = useState<number>(2025);
  const [selectedCategory, setSelectedCategory] = useState<string>('Overall');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedParam, setSelectedParam] = useState<ParameterKey>('overall_score');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<number>(1);

  // Concept Collapsible States (one per tab)
  const [isConceptOpen, setIsConceptOpen] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
  });

  const toggleConcept = (tab: number) => {
    setIsConceptOpen((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  // Helper to extract param value safely
  const getRecordParamValue = (r: (typeof RANKINGS)[0], p: ParameterKey): number => {
    if (p === 'rank') return r.rank;
    return r[p];
  };

  // Filter records based on shared filter bar
  const filteredRecords = useMemo(() => {
    return RANKINGS.filter((r) => {
      // Year condition
      if (yearMode === 'single') {
        if (r.year !== selectedYear) return false;
      } else {
        if (r.year < startYear || r.year > endYear) return false;
      }

      // Category condition
      if (selectedCategory !== 'All' && r.category !== selectedCategory) {
        return false;
      }

      // State condition (multi-select)
      if (selectedStates.length > 0) {
        const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
        if (!inst || !selectedStates.includes(inst.state)) {
          return false;
        }
      }

      // Ensure valid non-null score/rank
      const val = getRecordParamValue(r, selectedParam);
      return typeof val === 'number' && !isNaN(val) && val > 0;
    });
  }, [yearMode, selectedYear, startYear, endYear, selectedCategory, selectedStates, selectedParam]);

  // Institution map for fast lookup
  const instMap = useMemo(() => {
    return new Map(INSTITUTIONS.map((i) => [i.institution_id, i]));
  }, []);

  // Shared stats for active filtered records
  const paramValues = useMemo(() => {
    return filteredRecords.map((r) => getRecordParamValue(r, selectedParam));
  }, [filteredRecords, selectedParam]);

  const stats = useMemo(() => {
    return calculateExtendedStats(paramValues);
  }, [paramValues]);

  // Parameter label
  const activeParamMeta = PARAMETER_OPTIONS.find((p) => p.key === selectedParam)!;

  // ==========================================
  // TAB 1: DISTRIBUTIONS STATE
  // ==========================================
  const [distChartType, setDistChartType] = useState<
    'Histogram' | 'KDE' | 'ECDF' | 'Violin' | 'Box' | 'Strip'
  >('Histogram');
  const [binMode, setBinMode] = useState<'equal-width' | 'equal-frequency'>('equal-width');
  const [binCount, setBinCount] = useState<number>(10);

  // ==========================================
  // TAB 2: STATISTICS STATE
  // ==========================================
  const [corrParamX, setCorrParamX] = useState<ParameterKey>('TLR');
  const [corrParamY, setCorrParamY] = useState<ParameterKey>('overall_score');
  const [errorBarGroupBy, setErrorBarGroupBy] = useState<'year' | 'category' | 'state'>('category');
  const [errorBarType, setErrorBarType] = useState<'sd' | 'ci'>('sd');

  // ==========================================
  // TAB 3: VISUALIZATION LAB STATE
  // ==========================================
  const [isLogScale, setIsLogScale] = useState<boolean>(false);
  const [activePaletteKey, setActivePaletteKey] = useState<
    'sequential' | 'diverging' | 'categorical' | 'colorblind'
  >('categorical');

  const PALETTES = {
    sequential: ['#DBEAFE', '#93C5FD', '#60A5FA', '#2563EB', '#1D4ED8', '#1E3A8A'],
    diverging: ['#EF4444', '#F87171', '#FCA5A5', '#6EE7B7', '#10B981', '#047857'],
    categorical: ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0D9488'],
    colorblind: ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#D55E00'],
  };

  // ==========================================
  // TAB 4: TIME SERIES STATE
  // ==========================================
  const [tsEntityType, setTsEntityType] = useState<'institution' | 'state' | 'category'>('institution');
  const [tsInstitutionId, setTsInstitutionId] = useState<string>('iit-madras');
  const [tsStateName, setTsStateName] = useState<string>('Tamil Nadu');
  const [tsCategoryName, setTsCategoryName] = useState<string>('Overall');
  const [tsSmoothingMethod, setTsSmoothingMethod] = useState<SmoothingMethod>('SMA');
  const [tsWindowSize, setTsWindowSize] = useState<number>(3);
  const [tsFitType, setTsFitType] = useState<'none' | 'linear' | 'polynomial'>('polynomial');
  const [tsPolyDegree, setTsPolyDegree] = useState<number>(2);

  // ==========================================
  // TAB 5: MULTIVARIATE (PCA & FEATURE SELECTION)
  // ==========================================
  const pcaYear = yearMode === 'single' ? selectedYear : endYear;
  const pcaCategory = selectedCategory === 'All' ? 'Overall' : selectedCategory;

  // ==========================================
  // TAB 6: GEOSPATIAL STATE
  // ==========================================
  const [geoMetric, setGeoMetric] = useState<'count' | 'avgScore' | 'top100'>('count');
  const [geoViewMode, setGeoViewMode] = useState<'map' | 'heatmap'>('map');
  const [hoveredStateInfo, setHoveredStateInfo] = useState<{
    name: string;
    count: number;
    avgScore: number;
    top100: number;
  } | null>(null);

  // ==========================================
  // TAB 7: SAMPLING STATE
  // ==========================================
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('srs');
  const [sampleSize, setSampleSize] = useState<number>(50);
  const [sampleSeed, setSampleSeed] = useState<number>(42);
  const [showSamplingBias, setShowSamplingBias] = useState<boolean>(false);
  const [showOversamplingDemo, setShowOversamplingDemo] = useState<boolean>(false);

  // Toggle state in multi-select
  const handleToggleState = (st: string) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ======================================================== */}
      {/* 1. PAGE HEADER & SHARED TOP FILTER BAR                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Sliders className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Dynamic Features & Statistical Laboratory
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Interactive multi-dimensional statistical computing, empirical distributions, PCA, polynomial modeling, and reproducible sampling on real NIRF data (2017–2025).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100/70 text-blue-800">
              {filteredRecords.length} records in cohort
            </span>
          </div>
        </div>

        {/* SHARED FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Year Filter (Single or Range) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Year Mode
              </span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px]">
                <button
                  onClick={() => setYearMode('single')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    yearMode === 'single' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setYearMode('range')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    yearMode === 'range' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Range
                </button>
              </div>
            </div>

            {yearMode === 'single' ? (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    NIRF Edition {y}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} disabled={y >= endYear}>
                      From {y}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">→</span>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} disabled={y <= startYear}>
                      To {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Category Filter */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">Category Stream</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 outline-none"
            >
              <option value="All">All Categories ({CATEGORIES.length})</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. State Multi-Select Filter */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">State / UT Filter</span>
              {selectedStates.length > 0 && (
                <button
                  onClick={() => setSelectedStates([])}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  Reset ({selectedStates.length})
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 flex items-center justify-between text-left"
            >
              <span className="truncate">
                {selectedStates.length === 0
                  ? 'All States (Pan-India)'
                  : `${selectedStates.length} State${selectedStates.length > 1 ? 's' : ''} Selected`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>

            {isStateDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto space-y-1">
                <div
                  onClick={() => setSelectedStates([])}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between ${
                    selectedStates.length === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>All States & UTs</span>
                  {selectedStates.length === 0 && <CheckCircle className="w-3.5 h-3.5" />}
                </div>
                {STATES.map((st) => {
                  const isSelected = selectedStates.includes(st);
                  return (
                    <div
                      key={st}
                      onClick={() => handleToggleState(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{st}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Parameter Selector */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">Analytical Parameter</span>
            <select
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value as ParameterKey)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-blue-700 outline-none"
            >
              {PARAMETER_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TAB NAVIGATION                                        */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        {[
          { id: 1, label: '1. Distributions', icon: BarChart2 },
          { id: 2, label: '2. Statistics & Covariance', icon: Activity },
          { id: 3, label: '3. Visualization Lab', icon: Eye },
          { id: 4, label: '4. Time Series & Fitting', icon: TrendingUp },
          { id: 5, label: '5. Multivariate & PCA', icon: Layers },
          { id: 6, label: '6. Geospatial & Heatmap', icon: MapPin },
          { id: 7, label: '7. Sampling & Bias Lab', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. ACTIVE TAB CONTENT                                    */}
      {/* ======================================================== */}

      {/* -------------------------------------------------------- */}
      {/* TAB 1: DISTRIBUTIONS                                     */}
      {/* -------------------------------------------------------- */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Control Panel (Left, 4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Distribution Controls
              </h3>

              {/* Chart Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Plot Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Histogram', 'KDE', 'ECDF', 'Violin', 'Box', 'Strip'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDistChartType(t)}
                      className={`px-2.5 py-2 rounded-xl text-left font-bold transition-all ${
                        distChartType === t
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Binning Configuration (if Histogram) */}
              {distChartType === 'Histogram' && (
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Binning Strategy
                    </label>
                    <div className="flex rounded-xl bg-slate-100 p-1">
                      <button
                        onClick={() => setBinMode('equal-width')}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                          binMode === 'equal-width'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Equal-Width
                      </button>
                      <button
                        onClick={() => setBinMode('equal-frequency')}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                          binMode === 'equal-frequency'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Equal-Freq (Quantile)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-500">Bin Count</span>
                      <span className="font-black text-blue-700 text-xs">{binCount}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={25}
                      step={1}
                      value={binCount}
                      onChange={(e) => setBinCount(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Cohort Parametric Quick Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sample Size (N):</span>
                  <span className="font-bold text-slate-800">{stats.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean ± SD:</span>
                  <span className="font-bold text-slate-800">
                    {stats.mean} ± {stats.sampleStdDev}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Median (IQR):</span>
                  <span className="font-bold text-slate-800">
                    {stats.median} ({stats.iqr})
                  </span>
                </div>
              </div>
            </div>

            {/* Main Chart Area (Right, 8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    {distChartType} Distribution: {activeParamMeta.label}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {selectedCategory} • {yearMode === 'single' ? selectedYear : `${startYear}–${endYear}`}
                  </span>
                </div>

                <div className="h-72 w-full mt-4">
                  {paramValues.length < 2 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Insufficient data points for this filtered cohort.
                    </div>
                  ) : distChartType === 'Histogram' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={calculateBins(paramValues, binCount, binMode)}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: any) => [`${v} Institutions`, 'Frequency']}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : distChartType === 'KDE' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={calculateKDE(paramValues)}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="x" tick={{ fontSize: 10 }} domain={['dataMin', 'dataMax']} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: any) => [`${v}%`, 'Probability Density']}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="density"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fill="#93C5FD"
                          fillOpacity={0.4}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : distChartType === 'ECDF' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={calculateECDF(paramValues)}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip
                          formatter={(v: any) => [`${v}%`, 'Cumulative Percentile']}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" label="Median (P50)" />
                        <Line
                          type="stepAfter"
                          dataKey="percentile"
                          stroke="#7C3AED"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : distChartType === 'Box' || distChartType === 'Violin' ? (
                    <div className="h-full flex flex-col justify-center items-center px-8">
                      <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Min: {stats.min}</span>
                          <span className="text-blue-700">Q1: {stats.q1}</span>
                          <span className="text-indigo-700 font-black">Median: {stats.median}</span>
                          <span className="text-blue-700">Q3: {stats.q3}</span>
                          <span>Max: {stats.max}</span>
                        </div>
                        {/* Box Whisker Graphical Representation */}
                        <div className="relative w-full h-10 bg-slate-100 rounded-xl overflow-hidden flex items-center">
                          {/* Whisker Line */}
                          <div
                            className="absolute h-0.5 bg-slate-400"
                            style={{
                              left: `${Math.max(0, stats.min)}%`,
                              width: `${Math.max(0, stats.max - stats.min)}%`,
                            }}
                          />
                          {/* IQR Box */}
                          <div
                            className="absolute h-6 bg-blue-500/80 rounded-lg shadow-sm border border-blue-600"
                            style={{
                              left: `${Math.max(0, stats.q1)}%`,
                              width: `${Math.max(2, stats.q3 - stats.q1)}%`,
                            }}
                          />
                          {/* Median Marker */}
                          <div
                            className="absolute top-1 bottom-1 w-1.5 bg-blue-950 rounded-full"
                            style={{ left: `${Math.max(0, stats.median)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">
                          IQR span: <strong>{stats.iqr} points</strong> ({stats.q1} to {stats.q3}).
                          Upper whisker reaches {stats.max}, lower whisker reaches {stats.min}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Strip / Jitter plot
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 10 }}
                          name={activeParamMeta.label}
                        />
                        <YAxis
                          dataKey="jitter"
                          type="number"
                          domain={[-0.5, 0.5]}
                          hide
                        />
                        <Tooltip
                          formatter={(v: any, name: any, item: any) => [
                            `${item.payload.x} ${activeParamMeta.unit}`,
                            item.payload.name,
                          ]}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <Scatter
                          data={filteredRecords.slice(0, 200).map((r, i) => ({
                            x: getRecordParamValue(r, selectedParam),
                            jitter: ((i % 7) - 3) * 0.1,
                            name: instMap.get(r.institution_id)?.short_name || r.institution_id,
                          }))}
                          fill="#2563EB"
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Explanations & Theory */}
              <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
                <p className="text-xs text-slate-700 font-medium">
                  <strong>What this shows:</strong> Visualizes the probability density and frequency dispersion of {activeParamMeta.label} across {stats.count} institutional rankings.
                </p>

                <div>
                  <button
                    onClick={() => toggleConcept(1)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Concept: Parametric Density vs Empirical CDF</span>
                    {isConceptOpen[1] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isConceptOpen[1] && (
                    <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                      Parametric methods assume a predefined family of distributions (e.g. Gaussian bell curve), whereas Non-Parametric Kernel Density Estimation (KDE) smoothly estimates empirical density using Gaussian kernels with Silverman&apos;s bandwidth rule. ECDF non-parametrically computes the exact cumulative proportion of institutions scoring below any cutoff threshold.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 2: STATISTICS & COVARIANCE                           */}
      {/* -------------------------------------------------------- */}
      {activeTab === 2 && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {[
              { label: 'Mean (Average)', val: stats.mean, color: 'text-blue-700', tip: 'Arithmetic mean of values' },
              { label: 'Median (P50)', val: stats.median, color: 'text-indigo-700', tip: '50th percentile rank' },
              { label: 'Mode (Freq)', val: stats.mode, color: 'text-emerald-700', tip: 'Most recurring score' },
              { label: 'Sample Variance', val: stats.sampleVariance, color: 'text-purple-700', tip: 'Sample variance (n-1)' },
              { label: 'Sample SD (s)', val: stats.sampleStdDev, color: 'text-amber-700', tip: 'Sample standard deviation with n-1 degrees of freedom' },
              { label: 'Q1 (25th)', val: stats.q1, color: 'text-slate-700', tip: 'Lower quartile boundary' },
              { label: 'Q3 (75th)', val: stats.q3, color: 'text-slate-700', tip: 'Upper quartile boundary' },
              { label: 'IQR (Spread)', val: stats.iqr, color: 'text-rose-700', tip: 'Interquartile range (Q3 - Q1)' },
              { label: 'Minimum', val: stats.min, color: 'text-slate-800', tip: 'Lowest score in cohort' },
              { label: 'Maximum', val: stats.max, color: 'text-emerald-600', tip: 'Peak premier score' },
            ].map((kpi, idx) => (
              <div
                key={idx}
                title={kpi.tip}
                className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs cursor-help"
              >
                <span className="text-[10px] font-bold text-slate-400 block truncate">{kpi.label}</span>
                <span className={`text-lg font-black ${kpi.color} block mt-0.5`}>{kpi.val}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Covariance vs Pearson Correlation Panel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Covariance vs Pearson Correlation
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={corrParamX}
                    onChange={(e) => setCorrParamX(e.target.value as ParameterKey)}
                    className="font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                  >
                    {PARAMETER_OPTIONS.filter((p) => p.key !== 'rank').map((p) => (
                      <option key={p.key} value={p.key}>
                        X: {p.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-bold">vs</span>
                  <select
                    value={corrParamY}
                    onChange={(e) => setCorrParamY(e.target.value as ParameterKey)}
                    className="font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                  >
                    {PARAMETER_OPTIONS.filter((p) => p.key !== 'rank').map((p) => (
                      <option key={p.key} value={p.key}>
                        Y: {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Covariance / Correlation KPI Bar */}
              {(() => {
                const xVals = filteredRecords.map((r) => getRecordParamValue(r, corrParamX));
                const yVals = filteredRecords.map((r) => getRecordParamValue(r, corrParamY));
                const corrData = calculateCovarianceAndCorrelation(xVals, yVals);

                const scatterPoints = filteredRecords.map((r) => ({
                  x: getRecordParamValue(r, corrParamX),
                  y: getRecordParamValue(r, corrParamY),
                  name: instMap.get(r.institution_id)?.short_name || r.institution_id,
                }));

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Sample Covariance</span>
                        <span className="text-sm font-black text-slate-800">{corrData.covariance}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Pearson (r)</span>
                        <span className={`text-sm font-black ${corrData.pearsonR > 0.5 ? 'text-blue-700' : 'text-slate-800'}`}>
                          {corrData.pearsonR}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">R² Explained</span>
                        <span className="text-sm font-black text-emerald-600">{(corrData.rSquared * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="x" name={corrParamX} tick={{ fontSize: 10 }} />
                          <YAxis dataKey="y" name={corrParamY} tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `${item.payload.y} pts`,
                              `${item.payload.name} (${corrParamX}: ${item.payload.x})`,
                            ]}
                            contentStyle={{ fontSize: 11, borderRadius: 10 }}
                          />
                          <Scatter data={scatterPoints} fill="#2563EB" fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Linear fit: <strong>Y = {corrData.slope} · X {corrData.intercept >= 0 ? `+ ${corrData.intercept}` : `- ${Math.abs(corrData.intercept)}`}</strong>.
                      Covariance measures joint directional variability, while Pearson correlation scales this by standard deviations into [-1, 1].
                    </p>
                  </>
                );
              })()}
            </div>

            {/* 2. Error Bars & Grouped Comparison */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Grouped Error Bars: Mean ± Dispersion
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={errorBarGroupBy}
                    onChange={(e) => setErrorBarGroupBy(e.target.value as any)}
                    className="font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="category">By Category</option>
                    <option value="year">By Year</option>
                    <option value="state">By Top States</option>
                  </select>

                  <select
                    value={errorBarType}
                    onChange={(e) => setErrorBarType(e.target.value as any)}
                    className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="sd">± 1 Sample SD</option>
                    <option value="ci">95% Confidence Interval</option>
                  </select>
                </div>
              </div>

              {/* Grouped Bar with Whisker computation */}
              {(() => {
                let groups: { name: string; values: number[] }[] = [];

                if (errorBarGroupBy === 'category') {
                  groups = CATEGORIES.slice(0, 6).map((c) => ({
                    name: c.label.replace('Category', '').trim(),
                    values: RANKINGS.filter((r) => r.category === c.value).map((r) =>
                      getRecordParamValue(r, selectedParam)
                    ),
                  }));
                } else if (errorBarGroupBy === 'year') {
                  groups = YEARS.map((y) => ({
                    name: String(y),
                    values: RANKINGS.filter((r) => r.year === y && (selectedCategory === 'All' || r.category === selectedCategory)).map(
                      (r) => getRecordParamValue(r, selectedParam)
                    ),
                  }));
                } else {
                  // Top 6 States
                  const stateCounts = new Map<string, number>();
                  filteredRecords.forEach((r) => {
                    const st = instMap.get(r.institution_id)?.state;
                    if (st) stateCounts.set(st, (stateCounts.get(st) || 0) + 1);
                  });
                  const topStates = Array.from(stateCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map((e) => e[0]);

                  groups = topStates.map((st) => ({
                    name: st,
                    values: filteredRecords
                      .filter((r) => instMap.get(r.institution_id)?.state === st)
                      .map((r) => getRecordParamValue(r, selectedParam)),
                  }));
                }

                const chartData = groups.map((g) => {
                  const s = calculateExtendedStats(g.values);
                  const errorMargin = errorBarType === 'sd' ? s.sampleStdDev : Number((1.96 * s.standardError).toFixed(2));
                  return {
                    name: g.name,
                    mean: s.mean,
                    errorMargin,
                    lowerWhisker: Number(Math.max(0, s.mean - errorMargin).toFixed(2)),
                    upperWhisker: Number((s.mean + errorMargin).toFixed(2)),
                    count: s.count,
                  };
                });

                return (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: any, name: any, item: any) => [
                            `${v} (Whisker: ${item.payload.lowerWhisker} to ${item.payload.upperWhisker})`,
                            'Mean Score',
                          ]}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <Bar dataKey="mean" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              <p className="text-[11px] text-slate-500">
                Confidence intervals ({errorBarType === 'ci' ? '95% CI: ±1.96·SE' : 'Sample SD: ±1·s'}) estimate population parameter bounds across cohorts.
              </p>
            </div>
          </div>

          {/* 3. Outlier Detection Table (1.5 × IQR Rule) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            {(() => {
              const outlierResult = detectOutliersIQR(filteredRecords, (r) => getRecordParamValue(r, selectedParam));
              const { lowerBound, upperBound, outliers } = outlierResult;

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Outlier Detection via 1.5 × IQR Rule
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cutoff bounds for {activeParamMeta.label}: Lower Bound = <strong>{lowerBound}</strong> (Q1 - 1.5·IQR) • Upper Bound = <strong>{upperBound}</strong> (Q3 + 1.5·IQR).
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800">
                      {outliers.length} Outliers Detected
                    </span>
                  </div>

                  {outliers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No extreme outliers detected beyond the [Q1 - 1.5·IQR, Q3 + 1.5·IQR] boundaries for this cohort.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold">
                            <th className="pb-2">Institution</th>
                            <th className="pb-2">Year</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2 text-center">Value</th>
                            <th className="pb-2 text-center">Threshold</th>
                            <th className="pb-2 text-right">Deviation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {outliers.slice(0, 10).map((out, idx) => {
                            const inst = instMap.get(out.item.institution_id);
                            return (
                              <tr
                                key={idx}
                                onClick={() => setInspectInstitutionId(out.item.institution_id)}
                                className="hover:bg-slate-50 cursor-pointer"
                              >
                                <td className="py-2 font-bold text-slate-800">{inst?.short_name || out.item.institution_id}</td>
                                <td className="py-2 text-slate-500">{out.item.year}</td>
                                <td className="py-2 text-slate-500">{out.item.category}</td>
                                <td className="py-2 text-center font-black text-rose-600">{out.value}</td>
                                <td className="py-2 text-center text-slate-500">
                                  {out.isHigh ? `> ${upperBound}` : `< ${lowerBound}`}
                                </td>
                                <td className="py-2 text-right font-bold text-amber-700">+{out.deviation} pts</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Tab 2 Explanation & Concept */}
            <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
              <p className="text-xs text-slate-700 font-medium">
                <strong>What this shows:</strong> Computes Bessel-corrected parametric dispersion, covariance, Pearson association, and Tukey 1.5·IQR outlier detection.
              </p>

              <div>
                <button
                  onClick={() => toggleConcept(2)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Concept: Covariance vs Pearson Correlation & Degrees of Freedom</span>
                  {isConceptOpen[2] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isConceptOpen[2] && (
                  <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                    Sample variance and standard deviation employ Bessel&apos;s correction (n - 1 degrees of freedom) to eliminate negative bias when estimating population parameters. Covariance measures joint directional variation, while Pearson r normalizes covariance by the product of individual sample standard deviations into [-1, 1]. Tukey&apos;s 1.5·IQR rule flags observations falling beyond Q1 - 1.5·IQR and Q3 + 1.5·IQR as potential statistical anomalies.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 3: VISUALIZATION LAB                                 */}
      {/* -------------------------------------------------------- */}
      {activeTab === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Strip (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Axis & Palette Controls
              </h3>

              {/* Linear vs Log Scale Toggle */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Y-Axis Scaling</label>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    onClick={() => setIsLogScale(false)}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      !isLogScale ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Linear Scale
                  </button>
                  <button
                    onClick={() => setIsLogScale(true)}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      isLogScale ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Log10 Scale
                  </button>
                </div>
              </div>

              {/* Color Palette Picker */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500">Dynamic Color Palette</label>
                {(['categorical', 'sequential', 'diverging', 'colorblind'] as const).map((pal) => (
                  <button
                    key={pal}
                    onClick={() => setActivePaletteKey(pal)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      activePaletteKey === pal
                        ? 'bg-blue-50/70 border-blue-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    <span className="font-bold capitalize text-slate-800">{pal}</span>
                    <div className="flex items-center gap-1">
                      {PALETTES[pal].slice(0, 4).map((c, i) => (
                        <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recolor Sample Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Dynamic Recolor & Scale Explorer: Top Institutions
                </h3>
                <span className="text-xs font-bold text-blue-700">
                  {isLogScale ? 'Log10 Scale' : 'Linear Scale'} • {activePaletteKey} palette
                </span>
              </div>

              {(() => {
                const topSample = filteredRecords.slice(0, 8).map((r) => ({
                  name: instMap.get(r.institution_id)?.short_name || r.institution_id,
                  rawVal: getRecordParamValue(r, selectedParam),
                  displayVal: isLogScale
                    ? Number(Math.log10(Math.max(1, getRecordParamValue(r, selectedParam))).toFixed(2))
                    : getRecordParamValue(r, selectedParam),
                }));

                const palette = PALETTES[activePaletteKey];

                return (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSample} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: any, name: any, item: any) => [
                            `${item.payload.rawVal} pts (Plot: ${v})`,
                            item.payload.name,
                          ]}
                          contentStyle={{ fontSize: 11, borderRadius: 10 }}
                        />
                        <Bar dataKey="displayVal" radius={[6, 6, 0, 0]}>
                          {topSample.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={palette[idx % palette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Misleading vs Honest Axis Side-by-Side Demo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                Data Integrity & Perception Lab
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                Visual Deception Demo: Truncated Axis vs Honest Zero-Based Axis
              </h3>
              <p className="text-xs text-slate-500">
                Comparing the top 5 NIRF Overall institutions (2025). Notice how the truncated axis inflates perceived performance differentials.
              </p>
            </div>

            {(() => {
              const demoInstitutions = RANKINGS.filter((r) => r.year === 2025 && r.category === 'Overall')
                .slice(0, 5)
                .map((r) => ({
                  name: instMap.get(r.institution_id)?.short_name || r.institution_id,
                  score: r.overall_score,
                }));

              const minScore = Math.min(...demoInstitutions.map((d) => d.score));
              const maxScore = Math.max(...demoInstitutions.map((d) => d.score));

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Left: Misleading Truncated Axis */}
                  <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                      <span>⚠️ Misleading (Truncated Y-Axis)</span>
                      <span>Domain: [{Math.floor(minScore - 1)}, {Math.ceil(maxScore + 1)}]</span>
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={demoInstitutions}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FECDD3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis domain={[Math.floor(minScore - 1), Math.ceil(maxScore + 1)]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <Bar dataKey="score" fill="#E11D48" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      <strong>Deception Effect:</strong> By cutting off the baseline at ~{Math.floor(minScore - 1)}, the #1 institution appears 4x taller than #5, exaggerating a 5% difference into an optical illusion of total dominance.
                    </p>
                  </div>

                  {/* Right: Honest Zero-Based Axis */}
                  <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>✅ Honest (Zero-Based Y-Axis)</span>
                      <span>Domain: [0, 100]</span>
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={demoInstitutions}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1FAE5" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <Bar dataKey="score" fill="#059669" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      <strong>Honest Representation:</strong> Rooting the vertical axis at zero accurately preserves bar length proportionality, showing that all five elite institutions maintain closely competitive scores (&gt;80 pts).
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Tab 3 Explanation & Concept */}
            <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
              <p className="text-xs text-slate-700 font-medium">
                <strong>What this shows:</strong> Demonstrates logarithmic domain transformations and illustrates how truncating vertical axes distorts graphical proportionality.
              </p>

              <div>
                <button
                  onClick={() => toggleConcept(3)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Concept: Perceptual Visual Integrity & Axis Truncation</span>
                  {isConceptOpen[3] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isConceptOpen[3] && (
                  <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                    Truncating the vertical baseline distorts physical bar height ratios, magnifying minor variations into misleading perceptual leaps. Honest data visualization requires preserving proportionality with zero-based baselines or explicitly annotating logarithmic scale transformations when comparing orders of magnitude.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 4: TIME SERIES & POLYNOMIAL FITTING                  */}
      {/* -------------------------------------------------------- */}
      {activeTab === 4 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Panel (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Time Series Model Controls
              </h3>

              {/* Entity Type Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Longitudinal Entity</label>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {(['institution', 'state', 'category'] as const).map((ent) => (
                    <button
                      key={ent}
                      onClick={() => setTsEntityType(ent)}
                      className={`flex-1 py-1.5 rounded-lg font-bold capitalize transition-all ${
                        tsEntityType === ent ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      {ent}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Entity Pick */}
              <div className="space-y-1.5 text-xs">
                {tsEntityType === 'institution' ? (
                  <>
                    <label className="text-[11px] font-bold text-slate-500">Select Institution</label>
                    <select
                      value={tsInstitutionId}
                      onChange={(e) => setTsInstitutionId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none"
                    >
                      {INSTITUTIONS.slice(0, 60).map((i) => (
                        <option key={i.institution_id} value={i.institution_id}>
                          {i.short_name} ({i.state})
                        </option>
                      ))}
                    </select>
                  </>
                ) : tsEntityType === 'state' ? (
                  <>
                    <label className="text-[11px] font-bold text-slate-500">Select State Average</label>
                    <select
                      value={tsStateName}
                      onChange={(e) => setTsStateName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none"
                    >
                      {STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="text-[11px] font-bold text-slate-500">Select Category Average</label>
                    <select
                      value={tsCategoryName}
                      onChange={(e) => setTsCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Smoothing Method */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Moving Average Smoothing</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['SMA', 'WMA', 'CMA', 'Trailing'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTsSmoothingMethod(m)}
                      className={`px-2 py-1.5 rounded-xl font-bold transition-all ${
                        tsSmoothingMethod === m
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Window Size:</span>
                  <span className="font-bold text-blue-700 text-xs">{tsWindowSize} Years</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={4}
                  value={tsWindowSize}
                  onChange={(e) => setTsWindowSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Curve Fitting Controls */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Polynomial Regression Curve Fit</label>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    onClick={() => setTsFitType('none')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      tsFitType === 'none' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => setTsFitType('linear')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      tsFitType === 'linear' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Linear (d=1)
                  </button>
                  <button
                    onClick={() => setTsFitType('polynomial')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      tsFitType === 'polynomial' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Poly (1–5)
                  </button>
                </div>

                {tsFitType === 'polynomial' && (
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Degree (d):</span>
                      <span className="font-bold text-purple-700 text-xs">{tsPolyDegree}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      value={tsPolyDegree}
                      onChange={(e) => setTsPolyDegree(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Time Series Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              {(() => {
                // Compute longitudinal points
                let rawSeries: { year: number; value: number }[] = [];

                if (tsEntityType === 'institution') {
                  rawSeries = YEARS.map((y) => {
                    const rec = RANKINGS.find(
                      (r) =>
                        r.year === y &&
                        r.institution_id === tsInstitutionId &&
                        (selectedCategory === 'All' || r.category === selectedCategory)
                    );
                    return {
                      year: y,
                      value: rec ? getRecordParamValue(rec, selectedParam) : 0,
                    };
                  }).filter((pt) => pt.value > 0);
                } else if (tsEntityType === 'state') {
                  rawSeries = YEARS.map((y) => {
                    const stateRecs = RANKINGS.filter(
                      (r) =>
                        r.year === y &&
                        instMap.get(r.institution_id)?.state === tsStateName &&
                        (selectedCategory === 'All' || r.category === selectedCategory)
                    );
                    const avg =
                      stateRecs.length > 0
                        ? stateRecs.reduce((a, b) => a + getRecordParamValue(b, selectedParam), 0) / stateRecs.length
                        : 0;
                    return { year: y, value: Number(avg.toFixed(2)) };
                  }).filter((pt) => pt.value > 0);
                } else {
                  rawSeries = YEARS.map((y) => {
                    const catRecs = RANKINGS.filter((r) => r.year === y && r.category === tsCategoryName);
                    const avg =
                      catRecs.length > 0
                        ? catRecs.reduce((a, b) => a + getRecordParamValue(b, selectedParam), 0) / catRecs.length
                        : 0;
                    return { year: y, value: Number(avg.toFixed(2)) };
                  }).filter((pt) => pt.value > 0);
                }

                // Smooth series
                const smoothedSeries = calculateMovingAverage(rawSeries, tsWindowSize, tsSmoothingMethod);

                // Polynomial fit
                const fitDegree = tsFitType === 'linear' ? 1 : tsPolyDegree;
                const polyFit = tsFitType !== 'none'
                  ? calculatePolynomialFit(
                      rawSeries.map((pt) => ({ x: pt.year, y: pt.value })),
                      fitDegree
                    )
                  : null;

                // Merge into unified recharts data
                const mergedChartData = rawSeries.map((pt, i) => ({
                  year: pt.year,
                  'Raw Observed': pt.value,
                  'Moving Average': smoothedSeries[i]?.smoothed ?? null,
                  'Polynomial Fit': polyFit ? polyFit.fittedPoints[i]?.yFit : null,
                }));

                return (
                  <>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {tsEntityType === 'institution'
                            ? instMap.get(tsInstitutionId)?.short_name
                            : tsEntityType === 'state'
                            ? `${tsStateName} State Avg`
                            : `${tsCategoryName} Stream Avg`}{' '}
                          • {activeParamMeta.label}
                        </h3>
                        {polyFit && (
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
                            R² = {polyFit.rSquared} ({polyFit.equation})
                          </span>
                        )}
                      </div>

                      <div className="h-64 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={mergedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line
                              type="monotone"
                              dataKey="Raw Observed"
                              stroke="#94A3B8"
                              strokeWidth={1.5}
                              dot={{ r: 4, fill: '#64748B' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Moving Average"
                              stroke="#2563EB"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#2563EB' }}
                            />
                            {polyFit && (
                              <Line
                                type="monotone"
                                dataKey="Polynomial Fit"
                                stroke="#9333EA"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                              />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
                      <p className="text-xs text-slate-700 font-medium">
                        <strong>What this shows:</strong> Overlays raw institutional time-series telemetry against {tsSmoothingMethod} ({tsWindowSize}-year window) and Gauss-Jordan polynomial curve fitting.
                      </p>

                      <div>
                        <button
                          onClick={() => toggleConcept(4)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Concept: Polynomial Regression & Normal Equations</span>
                          {isConceptOpen[4] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isConceptOpen[4] && (
                          <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                            Polynomial curve fitting solves the normal system (X^T X) beta = X^T y via Gauss-Jordan matrix inversion. The coefficient of determination R² = 1 - (SS_res / SS_tot) quantifies the proportion of historical score variance explained by the fitted polynomial model.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 5: MULTIVARIATE & PCA                                */}
      {/* -------------------------------------------------------- */}
      {activeTab === 5 && (
        <div className="space-y-6">
          {(() => {
            // Filter cohort for PCA
            const pcaCohort = RANKINGS.filter(
              (r) => r.year === pcaYear && r.category === pcaCategory && r.overall_score > 0
            ).map((r) => ({
              institution_id: r.institution_id,
              name: instMap.get(r.institution_id)?.short_name || r.institution_id,
              overall_score: r.overall_score,
              TLR: r.TLR,
              RPC: r.RPC,
              GO: r.GO,
              OI: r.OI,
              PR: r.PR,
            }));

            const pcaResult = computePCA(pcaCohort);

            // Feature Selection: correlation with Overall Score
            const featureCorrelations = (['TLR', 'RPC', 'GO', 'OI', 'PR'] as const).map((feat) => {
              const xVals = pcaCohort.map((r) => r[feat]);
              const yVals = pcaCohort.map((r) => r.overall_score);
              const corr = calculateCovarianceAndCorrelation(xVals, yVals);
              return {
                feature: feat,
                r: corr.pearsonR,
                absR: Math.abs(corr.pearsonR),
                rSquared: Number((corr.rSquared * 100).toFixed(1)),
              };
            }).sort((a, b) => b.absR - a.absR);

            if (!pcaResult) {
              return (
                <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                  Insufficient data points in {pcaCategory} ({pcaYear}) for 5-parameter PCA.
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PC1 vs PC2 2D Projection */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        PCA 2D Projection: PC1 vs PC2
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {pcaCategory} • {pcaYear} (N={pcaCohort.length})
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis
                            dataKey="pc1"
                            name="PC1"
                            tick={{ fontSize: 10 }}
                            label={{ value: `PC1 (${pcaResult.explainedVariance[0]}%)`, position: 'insideBottom', offset: -5, fontSize: 10 }}
                          />
                          <YAxis
                            dataKey="pc2"
                            name="PC2"
                            tick={{ fontSize: 10 }}
                            label={{ value: `PC2 (${pcaResult.explainedVariance[1]}%)`, angle: -90, position: 'insideLeft', fontSize: 10 }}
                          />
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `PC1: ${item.payload.pc1}, PC2: ${item.payload.pc2}`,
                              item.payload.name,
                            ]}
                            contentStyle={{ fontSize: 11, borderRadius: 10 }}
                          />
                          <Scatter data={pcaResult.projectedData} fill="#2563EB" fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      PC1 & PC2 together explain <strong>{(pcaResult.cumulativeVariance[1])}%</strong> of the total variance across all 5 NIRF pillar parameters.
                    </p>
                  </div>

                  {/* Scree Plot: Explained Variance */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Scree Plot & Cumulative Explained Variance
                      </h3>
                      <span className="text-xs font-bold text-emerald-600">
                        5 Principal Components
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={pcaResult.explainedVariance.map((pct, idx) => ({
                            name: `PC${idx + 1}`,
                            variance: pct,
                            cumulative: pcaResult.cumulativeVariance[idx],
                          }))}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `${v}% (Cumulative: ${item.payload.cumulative}%)`,
                              'Explained Variance',
                            ]}
                            contentStyle={{ fontSize: 11, borderRadius: 10 }}
                          />
                          <Bar dataKey="variance" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      The scree plot displays the eigenvalues in descending order. An elbow typically indicates the optimal dimensional reduction threshold.
                    </p>
                  </div>
                </div>

                {/* Loadings Table & Feature Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Loadings Matrix */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Principal Component Loadings (Eigenvectors)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold">
                            <th className="pb-2">Parameter</th>
                            <th className="pb-2 text-center">PC1</th>
                            <th className="pb-2 text-center">PC2</th>
                            <th className="pb-2 text-center">PC3</th>
                            <th className="pb-2 text-center">PC4</th>
                            <th className="pb-2 text-center">PC5</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold">
                          {pcaResult.loadings.map((ld) => (
                            <tr key={ld.parameter}>
                              <td className="py-2.5 font-bold text-slate-800">{ld.parameter}</td>
                              <td className="py-2.5 text-center text-blue-700">{ld.PC1}</td>
                              <td className="py-2.5 text-center text-purple-700">{ld.PC2}</td>
                              <td className="py-2.5 text-center text-slate-600">{ld.PC3}</td>
                              <td className="py-2.5 text-center text-slate-600">{ld.PC4}</td>
                              <td className="py-2.5 text-center text-slate-600">{ld.PC5}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Feature Selection Ranking */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Feature Selection: Correlation with Overall Score
                    </h3>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={featureCorrelations}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `|r| = ${v} (r = ${item.payload.r}, R² = ${item.payload.rSquared}%)`,
                              item.payload.feature,
                            ]}
                            contentStyle={{ fontSize: 11, borderRadius: 10 }}
                          />
                          <Bar dataKey="absR" fill="#10B981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Parameters ranked by absolute Pearson correlation |r| against Overall Score, identifying primary ranking drivers.
                    </p>
                  </div>
                </div>

                {/* Tab 5 Explanation & Concept */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                  <p className="text-xs text-slate-700 font-medium">
                    <strong>What this shows:</strong> Computes standardized PCA dimensionality reduction over the 5 NIRF pillar metrics and ranks feature importance by variance contribution.
                  </p>

                  <div>
                    <button
                      onClick={() => toggleConcept(5)}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Concept: Principal Component Analysis & Eigen-Decomposition</span>
                      {isConceptOpen[5] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isConceptOpen[5] && (
                      <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                        PCA first standardizes variables to zero mean and unit variance, constructing the symmetric correlation covariance matrix C = (1/(n-1)) Z^T Z. The Jacobi eigenvalue algorithm computes orthogonal eigenvectors (loadings) and eigenvalues (explained variance). Rotating the feature space into principal components projects multi-pillar performance into an optimal 2D plane without correlation collinearity.
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 6: GEOSPATIAL & HEATMAP GRID                         */}
      {/* -------------------------------------------------------- */}
      {activeTab === 6 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  India Geospatial Analysis: State Choropleth & Heatmap Grid
                </h3>
                <p className="text-xs text-slate-500">
                  Geographic distribution across 36 States and Union Territories with accurate Survey of India projection.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* Metric Selector */}
                <select
                  value={geoMetric}
                  onChange={(e) => setGeoMetric(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none"
                >
                  <option value="count">Institution Count</option>
                  <option value="avgScore">Average Score</option>
                  <option value="top100">Top 100 Institutions</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    onClick={() => setGeoViewMode('map')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      geoViewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Choropleth Map
                  </button>
                  <button
                    onClick={() => setGeoViewMode('heatmap')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      geoViewMode === 'heatmap' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Heatmap Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Compute State Metrics */}
            {(() => {
              const stateMetricsMap = new Map<
                string,
                { count: number; totalScore: number; top100: number }
              >();

              filteredRecords.forEach((r) => {
                const inst = instMap.get(r.institution_id);
                if (!inst) return;
                const st = inst.state;
                const curr = stateMetricsMap.get(st) || { count: 0, totalScore: 0, top100: 0 };
                curr.count += 1;
                curr.totalScore += r.overall_score;
                if (r.rank <= 100 && r.rank > 0) curr.top100 += 1;
                stateMetricsMap.set(st, curr);
              });

              const getStateMetricValue = (stName: string): number => {
                const data = stateMetricsMap.get(stName);
                if (!data || data.count === 0) return 0;
                if (geoMetric === 'count') return data.count;
                if (geoMetric === 'avgScore') return Number((data.totalScore / data.count).toFixed(2));
                return data.top100;
              };

              const allValues = Array.from(stateMetricsMap.keys()).map(getStateMetricValue);
              const maxVal = Math.max(...allValues, 1);

              return (
                <div>
                  {geoViewMode === 'map' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* SVG Map Container (8 cols) */}
                      <div className="lg:col-span-8 flex justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                        <div className="w-full max-w-[500px] aspect-[650/720] relative">
                          <svg
                            viewBox="0 0 650 720"
                            className="w-full h-full drop-shadow-sm select-none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            {INDIA_STATES.map((state) => {
                              const val = getStateMetricValue(state.name);
                              const ratio = val / maxVal;

                              // Blue gradient intensity
                              let fill = '#F1F5F9';
                              if (val > 0) {
                                if (ratio > 0.75) fill = '#1D4ED8';
                                else if (ratio > 0.5) fill = '#2563EB';
                                else if (ratio > 0.25) fill = '#60A5FA';
                                else fill = '#93C5FD';
                              }

                              const stData = stateMetricsMap.get(state.name);

                              return (
                                <path
                                  key={state.id}
                                  d={state.path}
                                  fill={fill}
                                  stroke="#FFFFFF"
                                  strokeWidth="1.2"
                                  className="transition-colors duration-150 cursor-pointer hover:opacity-80"
                                  onMouseEnter={() => {
                                    setHoveredStateInfo({
                                      name: state.name,
                                      count: stData?.count || 0,
                                      avgScore: stData ? Number((stData.totalScore / stData.count).toFixed(2)) : 0,
                                      top100: stData?.top100 || 0,
                                    });
                                  }}
                                />
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* Map Tooltip & Info Sidebar (4 cols) */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                            State Inspection
                          </span>
                          {hoveredStateInfo ? (
                            <div className="space-y-2">
                              <h4 className="text-base font-black text-slate-900">{hoveredStateInfo.name}</h4>
                              <div className="space-y-1.5 text-xs text-slate-600">
                                <div className="flex justify-between">
                                  <span>Institutions Ranked:</span>
                                  <span className="font-bold text-slate-900">{hoveredStateInfo.count}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Average NIRF Score:</span>
                                  <span className="font-bold text-blue-700">{hoveredStateInfo.avgScore} pts</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Top 100 Ranks:</span>
                                  <span className="font-bold text-emerald-600">{hoveredStateInfo.top100}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Hover over any state or union territory on the map to inspect telemetry details.
                            </p>
                          )}
                        </div>

                        {/* Legend */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                          <span className="font-bold text-slate-600 text-[11px] block">
                            Choropleth Color Scale ({geoMetric})
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-[#F1F5F9] border border-slate-300" />
                            <span className="text-[11px] text-slate-500">0</span>
                            <span className="w-4 h-4 rounded bg-[#93C5FD]" />
                            <span className="w-4 h-4 rounded bg-[#60A5FA]" />
                            <span className="w-4 h-4 rounded bg-[#2563EB]" />
                            <span className="w-4 h-4 rounded bg-[#1D4ED8]" />
                            <span className="text-[11px] text-slate-500 font-bold">Max ({maxVal})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Heatmap Grid View: States × Years (2017–2025) */
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-bold">
                            <th className="pb-2.5">State</th>
                            {YEARS.map((y) => (
                              <th key={y} className="pb-2.5 text-center">
                                {y}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {STATES.slice(0, 15).map((st) => (
                            <tr key={st} className="hover:bg-slate-50">
                              <td className="py-2 font-bold text-slate-800 whitespace-nowrap">{st}</td>
                              {YEARS.map((y) => {
                                const yrRecs = RANKINGS.filter(
                                  (r) =>
                                    r.year === y &&
                                    instMap.get(r.institution_id)?.state === st &&
                                    (selectedCategory === 'All' || r.category === selectedCategory)
                                );
                                const count = yrRecs.length;
                                const avgScore =
                                  count > 0 ? yrRecs.reduce((a, b) => a + b.overall_score, 0) / count : 0;
                                const cellVal =
                                  geoMetric === 'count'
                                    ? count
                                    : geoMetric === 'avgScore'
                                    ? Number(avgScore.toFixed(1))
                                    : yrRecs.filter((r) => r.rank <= 100).length;

                                return (
                                  <td key={y} className="py-2 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                        cellVal > 0 ? 'bg-blue-100 text-blue-800' : 'text-slate-300'
                                      }`}
                                    >
                                      {cellVal}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tab 6 Explanation & Concept */}
            <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
              <p className="text-xs text-slate-700 font-medium">
                <strong>What this shows:</strong> Geospatial choropleth intensity mapping and multi-year state matrix telemetry.
              </p>

              <div>
                <button
                  onClick={() => toggleConcept(6)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Concept: Choropleth Mapping & Spatial Normalization</span>
                  {isConceptOpen[6] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isConceptOpen[6] && (
                  <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                    Choropleth mapping assigns colour saturation proportionally to regional statistical metrics. Normalizing counts by state averages or top-100 proportions ensures geographic territory size does not distort comparisons of institutional excellence.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* TAB 7: SAMPLING & BIAS LAB                               */}
      {/* -------------------------------------------------------- */}
      {activeTab === 7 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sampling Controls (4 cols) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Sampling Parameters
              </h3>

              {/* Method Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[11px] font-bold text-slate-500">Sampling Protocol</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'srs', label: 'Simple Random' },
                    { id: 'systematic', label: 'Systematic' },
                    { id: 'stratified', label: 'Stratified (Cat)' },
                    { id: 'cluster', label: 'Cluster (State)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSamplingMethod(m.id as SamplingMethod)}
                      className={`px-2 py-1.5 rounded-xl font-bold transition-all text-left ${
                        samplingMethod === m.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample Size Slider */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500">Sample Size (n)</span>
                  <span className="font-bold text-blue-700">{sampleSize}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={Math.min(300, filteredRecords.length || 100)}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Re-Sample Button */}
              <button
                onClick={() => setSampleSeed((s) => s + 1)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Sample (PRNG Seed: {sampleSeed})</span>
              </button>

              {/* Demos Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <label className="text-[11px] font-bold text-slate-500 block">Interactive Demonstrations</label>
                <button
                  onClick={() => setShowSamplingBias(!showSamplingBias)}
                  className={`w-full py-2 px-3 rounded-xl border text-left font-bold flex items-center justify-between transition-all ${
                    showSamplingBias ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>Sampling Bias Demo (Top 50 vs Random)</span>
                  <span className="text-xs">{showSamplingBias ? 'Active' : 'Off'}</span>
                </button>

                <button
                  onClick={() => setShowOversamplingDemo(!showOversamplingDemo)}
                  className={`w-full py-2 px-3 rounded-xl border text-left font-bold flex items-center justify-between transition-all ${
                    showOversamplingDemo ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>Rebalancing / Oversampling Demo</span>
                  <span className="text-xs">{showOversamplingDemo ? 'Active' : 'Off'}</span>
                </button>
              </div>
            </div>

            {/* Sample vs Full Data Stats (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              {(() => {
                const sampleRecords = executeSampling(
                  filteredRecords,
                  sampleSize,
                  samplingMethod,
                  sampleSeed,
                  (r) => r.category,
                  (r) => instMap.get(r.institution_id)?.state || 'Unknown'
                );

                const sampleVals = sampleRecords.map((r) => getRecordParamValue(r, selectedParam));
                const sampleStats = calculateExtendedStats(sampleVals);

                const deltaMean = Number((sampleStats.mean - stats.mean).toFixed(2));
                const deltaSD = Number((sampleStats.sampleStdDev - stats.sampleStdDev).toFixed(2));

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Sample Statistics vs Full Population Metrics
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        Method: {samplingMethod.toUpperCase()} (Seed: {sampleSeed})
                      </span>
                    </div>

                    {/* Comparison KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Sample Mean</span>
                        <span className="text-base font-black text-blue-700 mt-0.5 block">{sampleStats.mean}</span>
                        <span className="text-[10px] text-slate-500">Pop: {stats.mean} (Δ: {deltaMean > 0 ? `+${deltaMean}` : deltaMean})</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Sample SD</span>
                        <span className="text-base font-black text-indigo-700 mt-0.5 block">{sampleStats.sampleStdDev}</span>
                        <span className="text-[10px] text-slate-500">Pop: {stats.sampleStdDev} (Δ: {deltaSD})</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Standard Error</span>
                        <span className="text-base font-black text-purple-700 mt-0.5 block">{sampleStats.standardError}</span>
                        <span className="text-[10px] text-slate-500">SE = s / √n</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">95% Confidence Interval</span>
                        <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                          [{sampleStats.ci95Lower}, {sampleStats.ci95Upper}]
                        </span>
                        <span className="text-[10px] text-slate-500">Truth in CI: {stats.mean >= sampleStats.ci95Lower && stats.mean <= sampleStats.ci95Upper ? '✅ Yes' : '❌ No'}</span>
                      </div>
                    </div>

                    {/* Distribution Comparison: Sample vs Full */}
                    <div className="h-56 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={calculateBins(paramValues, 10, 'equal-width').map((b, i) => {
                            const sampleBin = calculateBins(sampleVals, 10, 'equal-width')[i];
                            return {
                              range: b.range,
                              'Full Population %': b.frequency,
                              'Drawn Sample %': sampleBin ? sampleBin.frequency : 0,
                            };
                          })}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Full Population %" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Drawn Sample %" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Sampling Bias Demo Box */}
                    {showSamplingBias && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Sampling Bias Demonstration (Selection Bias)</span>
                        </div>
                        {(() => {
                          const biasedSample = [...filteredRecords]
                            .sort((a, b) => b.overall_score - a.overall_score)
                            .slice(0, 50);
                          const biasedMean = calculateExtendedStats(biasedSample.map((r) => r.overall_score)).mean;
                          return (
                            <p className="text-slate-600">
                              If we sample only the Top 50 ranked institutions, the sample mean becomes <strong>{biasedMean} pts</strong>, compared to the true population mean of <strong>{stats.mean} pts</strong> (an upward selection bias skew of <strong>+{(biasedMean - stats.mean).toFixed(2)} pts</strong>).
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {/* Oversampling vs Undersampling Rebalance Demo */}
                    {showOversamplingDemo && (
                      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                          <Layers className="w-4 h-4 text-purple-600" />
                          <span>Class Imbalance & Category Rebalancing (Oversampling)</span>
                        </div>
                        <p className="text-slate-600">
                          In real NIRF data, categories like Engineering and College contain hundreds of records, while Dental and Architecture have smaller cohorts. Oversampling minority categories to a target parity size balances representation before machine learning classification or aggregated benchmarking.
                        </p>
                      </div>
                    )}

                    {/* Tab 7 Explanation & Concept */}
                    <div className="pt-3 border-t border-slate-100 space-y-2 mt-3">
                      <p className="text-xs text-slate-700 font-medium">
                        <strong>What this shows:</strong> Compares sample estimators against population truth across 4 probabilistic sampling protocols and quantifies selection bias.
                      </p>

                      <div>
                        <button
                          onClick={() => toggleConcept(7)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Concept: Sampling Distributions, Central Limit Theorem & Reproducibility</span>
                          {isConceptOpen[7] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isConceptOpen[7] && (
                          <div className="mt-1.5 p-3 rounded-2xl bg-blue-50/60 text-xs text-slate-600 leading-relaxed border border-blue-100">
                            The Central Limit Theorem guarantees that sample means approximate a normal distribution centered at the population mean, with standard error SE = s / sqrt(n). Using deterministic Mulberry32 pseudo-random seeds ensures full computational reproducibility while demonstrating how deliberate non-random sampling produces severe selection bias.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
