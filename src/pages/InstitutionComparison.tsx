import React, { useState } from 'react';
import {
  GitCompare,
  Plus,
  X,
  RotateCcw,
  Bookmark,
  Award,
  MapPin,
  TrendingUp,
  Check,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, YEARS, PARAMETERS_INFO } from '../data/nirfData';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

export const InstitutionComparison: React.FC = () => {
  const {
    filters,
    comparisonInstitutions,
    addComparisonInstitution,
    removeComparisonInstitution,
    clearComparison,
    saveCurrentComparison,
    setInspectInstitutionId,
  } = useApp();

  const { activeTheme } = useChartTheme();
  const comparisonColors = activeTheme.colors;

  const [compareYear, setCompareYear] = useState<number>(filters.year || 2025);
  const [saveName, setSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState('');

  // Selected institutions data
  const selectedInsts = comparisonInstitutions.map((id) =>
    INSTITUTIONS.find((i) => i.institution_id === id)
  ).filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Rankings in compareYear
  const currentRankings = selectedInsts.map((inst) => {
    const rec = RANKINGS.find(
      (r) => r.institution_id === inst.institution_id && r.year === compareYear
    );
    return { inst, ranking: rec };
  });

  // Longitudinal Rankings History (2017 to 2025)
  const historyData = YEARS.map((yr) => {
    const row: any = { year: yr };
    selectedInsts.forEach((inst) => {
      const rec = RANKINGS.find(
        (r) => r.institution_id === inst.institution_id && r.year === yr
      );
      row[`${inst.short_name} Rank`] = rec ? rec.rank : null;
      row[`${inst.short_name} Score`] = rec ? rec.overall_score : null;
    });
    return row;
  });

  // 5 Parameters Radar Data
  const radarData = ['TLR', 'RPC', 'GO', 'OI', 'PR'].map((param) => {
    const row: any = { parameter: param };
    currentRankings.forEach(({ inst, ranking }) => {
      row[inst.short_name] = ranking ? (ranking as any)[param] : 0;
    });
    return row;
  });

  // Grouped Bar Chart Data
  const groupedBarData = PARAMETERS_INFO.map((param) => {
    const row: any = { parameter: param.key, name: param.name };
    currentRankings.forEach(({ inst, ranking }) => {
      row[inst.short_name] = ranking ? (ranking as any)[param.key] : 0;
    });
    return row;
  });

  const availableToAdd = INSTITUTIONS.filter(
    (i) => !comparisonInstitutions.includes(i.institution_id)
  );

  const handleAdd = () => {
    if (selectedToAdd) {
      addComparisonInstitution(selectedToAdd);
      setSelectedToAdd('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCurrentComparison(saveName || `${selectedInsts.map((i) => i.short_name).join(' vs ')}`);
    setShowSaveModal(false);
    setSaveName('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            Multi-Institution Benchmarking & Comparison
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select 2 to 5 premier institutions to evaluate multi-year rank trajectories, score differences, and 5-parameter balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="compare-year-select" className="text-slate-500 font-semibold text-[11px]">Benchmark Year:</label>
            <select
              id="compare-year-select"
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Comparison</span>
          </button>

          <button
            onClick={clearComparison}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            title="Reset to default pair"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Institution Selector Bar & Chips */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700">
            Selected Institutions ({selectedInsts.length}/5):
          </span>

          {selectedInsts.length < 5 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none max-w-[200px]"
              >
                <option value="">+ Add institution...</option>
                {availableToAdd.map((inst) => (
                  <option key={inst.institution_id} value={inst.institution_id}>
                    {inst.short_name} ({inst.state})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedToAdd}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Selected Chips */}
        <div className="flex flex-wrap gap-2">
          {selectedInsts.map((inst, index) => {
            const ranking = currentRankings[index]?.ranking;
            return (
              <div
                key={inst.institution_id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 shadow-2xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: comparisonColors[index % comparisonColors.length] }}
                />
                <button
                  onClick={() => setInspectInstitutionId(inst.institution_id)}
                  className="font-bold text-xs text-slate-800 hover:text-blue-600 transition-colors"
                >
                  {inst.short_name}
                </button>
                <span className="text-[10px] text-slate-500 font-semibold">
                  (#{ranking?.rank ?? 'N/A'})
                </span>
                {selectedInsts.length > 2 && (
                  <button
                    onClick={() => removeComparisonInstitution(inst.institution_id)}
                    className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 transition-colors ml-1"
                    aria-label={`Remove ${inst.short_name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Cards Comparison Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {selectedInsts.map((inst, idx) => {
          const rec = currentRankings[idx]?.ranking;
          return (
            <div
              key={inst.institution_id}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: comparisonColors[idx % comparisonColors.length] }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">{inst.short_name}</h4>
                  <p className="text-[10px] text-slate-500">{inst.state}</p>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {inst.category}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Rank ({compareYear})</span>
                  <span className="text-xl font-black text-slate-900">#{rec?.rank ?? 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">Overall Score</span>
                  <span className="text-xl font-black text-blue-700">{rec?.overall_score ?? 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                <div>TLR: <strong className="text-slate-800">{rec?.TLR}</strong></div>
                <div>RPC: <strong className="text-slate-800">{rec?.RPC}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualizations Row 1: Radar Chart & Grouped Parameters Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart: 5 Parameters Balance */}
        <InteractiveChartCard
          title={`5 NIRF Parameters Radar Comparison (${compareYear})`}
          subtitle="Direct dimensional overlay (0–100 scale). Click institution badge to toggle series."
          badge="Multivariate Profile"
          enableZoom={false}
          seriesList={selectedInsts.map((inst, index) => ({
            key: inst.short_name,
            label: inst.short_name,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive }) => (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={theme.gridColor} />
                  <PolarAngleAxis
                    dataKey="parameter"
                    tick={{ fontSize: 11, fill: theme.textColor, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} angle={30} tick={{ fontSize: 9, fill: theme.textMuted }} />
                  {selectedInsts.map((inst, index) => {
                    if (hiddenSeries.has(inst.short_name)) return null;
                    const color = theme.colors[index % theme.colors.length];
                    return (
                      <Radar
                        key={inst.institution_id}
                        name={inst.short_name}
                        dataKey={inst.short_name}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.25}
                        strokeWidth={theme.strokeWidth}
                        isAnimationActive={isAnimationActive}
                      />
                    );
                  })}
                  <Tooltip
                    content={
                      <AccessibleChartTooltip
                        titlePrefix="Dimension:"
                        unit="score"
                        formatter={(val: any) => `${val} / 100`}
                      />
                    }
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </InteractiveChartCard>

        {/* Grouped Bar Chart */}
        <InteractiveChartCard
          title="Parameter-by-Parameter Direct Score Comparison"
          subtitle="Grouped parameter breakdown for active benchmark year. Click institution badge to toggle."
          badge="Direct Benchmark"
          enableZoom={false}
          seriesList={selectedInsts.map((inst, index) => ({
            key: inst.short_name,
            label: inst.short_name,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive }) => (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                  <XAxis dataKey="parameter" tick={{ fontSize: 11, fill: theme.textMuted }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                  <Tooltip
                    content={
                      <AccessibleChartTooltip
                        titlePrefix="Metric:"
                        unit="score"
                        formatter={(val: any) => `${val} / 100`}
                      />
                    }
                  />
                  {selectedInsts.map((inst, index) => {
                    if (hiddenSeries.has(inst.short_name)) return null;
                    const color = theme.colors[index % theme.colors.length];
                    return (
                      <Bar
                        key={inst.institution_id}
                        dataKey={inst.short_name}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={isAnimationActive}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </InteractiveChartCard>
      </div>

      {/* Visualizations Row 2: Ranking History & Overall Score History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Rank (Reversed Y-Axis) */}
        <InteractiveChartCard
          title="Historical Ranking Comparison (2017–2025)"
          subtitle="Reversed scale: Lower position value indicates higher ranking. Zoom & pan across cycles."
          badge="Longitudinal Rank"
          dataLength={historyData.length}
          seriesList={selectedInsts.map((inst, index) => ({
            key: `${inst.short_name} Rank`,
            label: `${inst.short_name} Rank`,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
            const visibleData = historyData.slice(startIndex, endIndex + 1);
            return (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis
                      reversed
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tick={{ fontSize: 11, fill: theme.textMuted }}
                      width={30}
                    />
                    <Tooltip
                      content={
                        <AccessibleChartTooltip
                          titlePrefix="Year:"
                          unit="rank"
                          formatter={(val: any) => `#${val} National Rank`}
                        />
                      }
                    />
                    {selectedInsts.map((inst, index) => {
                      const seriesKey = `${inst.short_name} Rank`;
                      if (hiddenSeries.has(seriesKey)) return null;
                      const color = theme.colors[index % theme.colors.length];
                      return (
                        <Line
                          key={inst.institution_id}
                          type="monotone"
                          dataKey={seriesKey}
                          name={`${inst.short_name} Rank`}
                          stroke={color}
                          strokeWidth={theme.strokeWidth}
                          dot={{ r: 3, fill: color }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={isAnimationActive}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          }}
        </InteractiveChartCard>

        {/* Historical Overall Score */}
        <InteractiveChartCard
          title="Longitudinal Overall Score History (2017–2025)"
          subtitle="Evolution of aggregate composite scores out of 100. Zoom & pan across cycles."
          badge="Score Trajectory"
          dataLength={historyData.length}
          seriesList={selectedInsts.map((inst, index) => ({
            key: `${inst.short_name} Score`,
            label: `${inst.short_name} Score`,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
            const visibleData = historyData.slice(startIndex, endIndex + 1);
            return (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: theme.textMuted }} width={30} />
                    <Tooltip
                      content={
                        <AccessibleChartTooltip
                          titlePrefix="Year:"
                          unit="pts"
                          formatter={(val: any) => `${val} points / 100`}
                        />
                      }
                    />
                    {selectedInsts.map((inst, index) => {
                      const seriesKey = `${inst.short_name} Score`;
                      if (hiddenSeries.has(seriesKey)) return null;
                      const color = theme.colors[index % theme.colors.length];
                      return (
                        <Line
                          key={inst.institution_id}
                          type="monotone"
                          dataKey={seriesKey}
                          name={`${inst.short_name} Score`}
                          stroke={color}
                          strokeWidth={theme.strokeWidth}
                          dot={{ r: 3, fill: color }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={isAnimationActive}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          }}
        </InteractiveChartCard>
      </div>

      {/* Parameter-Wise Performance Breakdown Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Parameter-Wise Metric Matrix ({compareYear})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400">
                <th className="pb-3">Institution</th>
                <th className="pb-3 text-center">Rank</th>
                <th className="pb-3 text-center">Overall</th>
                <th className="pb-3 text-center">TLR (30%)</th>
                <th className="pb-3 text-center">RPC (30%)</th>
                <th className="pb-3 text-center">GO (20%)</th>
                <th className="pb-3 text-center">OI (10%)</th>
                <th className="pb-3 text-center">PR (10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRankings.map(({ inst, ranking }, idx) => (
                <tr key={inst.institution_id} className="hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-800 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeTheme.colors[idx % activeTheme.colors.length] }}
                    />
                    <span>{inst.institution_name}</span>
                  </td>
                  <td className="py-3 text-center font-extrabold text-blue-700">#{ranking?.rank ?? 'N/A'}</td>
                  <td className="py-3 text-center font-bold text-slate-900">{ranking?.overall_score ?? 'N/A'}</td>
                  <td className="py-3 text-center text-slate-700">{ranking?.TLR ?? 'N/A'}</td>
                  <td className="py-3 text-center text-slate-700">{ranking?.RPC ?? 'N/A'}</td>
                  <td className="py-3 text-center text-slate-700">{ranking?.GO ?? 'N/A'}</td>
                  <td className="py-3 text-center text-slate-700">{ranking?.OI ?? 'N/A'}</td>
                  <td className="py-3 text-center text-slate-700">{ranking?.PR ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Comparison Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Save Institutional Comparison</h4>
            <p className="text-xs text-slate-500">
              Save this group of {selectedInsts.length} institutions to your profile for quick recall.
            </p>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Premier Technical Institutes"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                  Save Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
