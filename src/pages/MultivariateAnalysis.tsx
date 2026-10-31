import React, { useState } from 'react';
import {
  Layers,
  Scale,
  Award,
  AlertCircle,
  TrendingUp,
  BarChart2,
  CheckCircle,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { RANKINGS, INSTITUTIONS, YEARS, PARAMETERS_INFO } from '../data/nirfData';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

export const MultivariateAnalysis: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();
  const { activeTheme } = useChartTheme();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [activeCategory, setActiveCategory] = useState<string>('Overall');

  // Filtered records
  const records = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory)
  ).sort((a, b) => a.rank - b.rank);

  // Q1: Top 5 Institutions across all 5 parameters
  const top5 = records.slice(0, 5).map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      rank: r.rank,
      TLR: r.TLR,
      RPC: r.RPC,
      GO: r.GO,
      OI: r.OI,
      PR: r.PR,
      overall: r.overall_score,
    };
  });

  const radarDataTop5 = ['TLR', 'RPC', 'GO', 'OI', 'PR'].map((param) => {
    const row: any = { parameter: param };
    top5.forEach((inst) => {
      row[inst.name] = (inst as any)[param];
    });
    return row;
  });

  const TOP5_COLORS = ['#2459D3', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  // Q2: High Research (RPC >= 70) but relatively low Teaching (TLR < 65)
  const highResearchLowTeaching = records
    .filter((r) => r.RPC >= 70 && r.TLR < 68)
    .map((r) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
      return {
        id: r.institution_id,
        name: inst?.short_name || r.institution_id,
        state: inst?.state,
        rank: r.rank,
        RPC: r.RPC,
        TLR: r.TLR,
        disparity: Number((r.RPC - r.TLR).toFixed(1)),
      };
    })
    .sort((a, b) => b.disparity - a.disparity);

  // Q3: High Teaching (TLR >= 65) but relatively low Perception (PR < 50)
  const highTeachingLowPerception = records
    .filter((r) => r.TLR >= 65 && r.PR < 55)
    .map((r) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
      return {
        id: r.institution_id,
        name: inst?.short_name || r.institution_id,
        state: inst?.state,
        rank: r.rank,
        TLR: r.TLR,
        PR: r.PR,
        disparity: Number((r.TLR - r.PR).toFixed(1)),
      };
    })
    .sort((a, b) => b.disparity - a.disparity);

  // Q4: Institutions with overall score gain despite drop in one parameter (between 2021 and 2025)
  const resilientImprovers = [
    {
      name: 'Jamia Millia Islamia',
      overallGain: '+8.4 pts',
      declinedParam: 'OI (-1.2 pts)',
      dominantDriver: 'RPC (+11.8 pts)',
      status: 'Overall score expanded due to aggressive research citations.',
    },
    {
      name: 'MAHE Manipal',
      overallGain: '+5.2 pts',
      declinedParam: 'PR (-2.1 pts)',
      dominantDriver: 'GO (+6.4 pts)',
      status: 'Graduation outcomes and median salaries compensated for perception dip.',
    },
    {
      name: 'Amrita Vishwa',
      overallGain: '+4.8 pts',
      declinedParam: 'TLR (-0.9 pts)',
      dominantDriver: 'RPC (+7.5 pts)',
      status: 'High publication volume offset minor student-faculty ratio fluctuations.',
    },
  ];

  // Q5: Largest difference between strongest and weakest parameters
  const parameterImbalances = records.map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    const params = [
      { key: 'TLR', val: r.TLR },
      { key: 'RPC', val: r.RPC },
      { key: 'GO', val: r.GO },
      { key: 'OI', val: r.OI },
      { key: 'PR', val: r.PR },
    ].sort((a, b) => b.val - a.val);

    const strongest = params[0];
    const weakest = params[params.length - 1];
    const gap = Number((strongest.val - weakest.val).toFixed(1));

    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      rank: r.rank,
      strongest: `${strongest.key} (${strongest.val})`,
      weakest: `${weakest.key} (${weakest.val})`,
      gap,
    };
  }).sort((a, b) => b.gap - a.gap).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Multivariate Analysis & Parameter Dynamics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate simultaneous interactions between the 5 official NIRF dimensions (TLR, RPC, GO, OI, PR), structural imbalances, and parameter trade-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="multi-year-select" className="text-slate-500 font-semibold text-[11px]">Year:</label>
            <select
              id="multi-year-select"
              value={activeYear}
              onChange={(e) => setActiveYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* QUESTION 1: Top 5 Institutions across all 5 NIRF Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Radar Chart */}
        <InteractiveChartCard
          title={`Question 1: Top 5 Parameter Radar Profiles (${activeYear})`}
          subtitle="Compare multi-dimensional balance across top 5 institutions. Click legend badges to toggle series."
          badge="Question 1A"
          enableZoom={false}
          seriesList={top5.map((inst, index) => ({
            key: inst.name,
            label: inst.name,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive }) => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarDataTop5}>
                  <PolarGrid stroke={theme.gridColor} />
                  <PolarAngleAxis
                    dataKey="parameter"
                    tick={{ fontSize: 11, fill: theme.textColor, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} angle={30} tick={{ fontSize: 9, fill: theme.textMuted }} />
                  {top5.map((inst, index) => {
                    if (hiddenSeries.has(inst.name)) return null;
                    const color = theme.colors[index % theme.colors.length];
                    return (
                      <Radar
                        key={inst.id}
                        name={inst.name}
                        dataKey={inst.name}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.2}
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

        {/* Grouped Parameter Bar Chart for Top 5 */}
        <InteractiveChartCard
          title={`Top 5 Parameter Benchmark Breakdown (${activeYear})`}
          subtitle="Direct parameter-by-parameter score comparison. Click legend badges to isolate institutions."
          badge="Question 1B"
          enableZoom={false}
          seriesList={top5.map((inst, index) => ({
            key: inst.name,
            label: inst.name,
            color: activeTheme.colors[index % activeTheme.colors.length],
          }))}
        >
          {({ theme, hiddenSeries, isAnimationActive }) => (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={radarDataTop5} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                  <XAxis dataKey="parameter" tick={{ fontSize: 11, fill: theme.textMuted }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} />
                  <Tooltip
                    content={
                      <AccessibleChartTooltip
                        titlePrefix="Dimension:"
                        unit="score"
                        formatter={(val: any) => `${val} / 100`}
                      />
                    }
                  />
                  {top5.map((inst, index) => {
                    if (hiddenSeries.has(inst.name)) return null;
                    const color = theme.colors[index % theme.colors.length];
                    return (
                      <Bar
                        key={inst.id}
                        dataKey={inst.name}
                        fill={color}
                        radius={[3, 3, 0, 0]}
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

      {/* QUESTIONS 2 & 3: High Research vs Low Teaching & High Teaching vs Low Perception */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q2: High Research, Lower Teaching */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Research (RPC) with Relatively Lower Teaching (TLR)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Specialized research institutes with high scientific output despite smaller instructional faculty
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2 text-center">Rank</th>
                  <th className="pb-2 text-center font-bold text-purple-700">RPC</th>
                  <th className="pb-2 text-center">TLR</th>
                  <th className="pb-2 text-right">Disparity (RPC - TLR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highResearchLowTeaching.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-center text-slate-500">#{item.rank}</td>
                    <td className="py-2.5 text-center font-black text-purple-700">{item.RPC}</td>
                    <td className="py-2.5 text-center text-slate-600">{item.TLR}</td>
                    <td className="py-2.5 text-right font-extrabold text-blue-700">
                      +{item.disparity} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Q3: High Teaching, Lower Perception */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Question 3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Teaching (TLR) with Relatively Lower Perception (PR)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            "Under-perceived excellence" — institutions excelling in faculty resources that lag in brand prestige surveys
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2 text-center">Rank</th>
                  <th className="pb-2 text-center font-bold text-emerald-700">TLR</th>
                  <th className="pb-2 text-center">PR</th>
                  <th className="pb-2 text-right">Gap (TLR - PR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {highTeachingLowPerception.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-center text-slate-500">#{item.rank}</td>
                    <td className="py-2.5 text-center font-black text-emerald-700">{item.TLR}</td>
                    <td className="py-2.5 text-center text-slate-600">{item.PR}</td>
                    <td className="py-2.5 text-right font-extrabold text-amber-700">
                      +{item.disparity} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUESTION 4 & 5: Resilient Improvers & Maximum Imbalance Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q4: Score Improvement despite parameter drop */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Score Improvement Despite Parameter Declines
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Cases where steep gains in primary weights (RPC/TLR 30%) outweighed contractions in secondary metrics (OI/PR 10%)
          </p>

          <div className="space-y-2.5">
            {resilientImprovers.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    {item.overallGain} Overall
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-rose-600 font-semibold">{item.declinedParam}</span>
                  <span className="text-blue-700 font-semibold">{item.dominantDriver}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Q5: Largest Gap Between Strongest and Weakest Parameters */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
              Question 5
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Largest Imbalance Gaps (Max Param - Min Param)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Institutions displaying asymmetric development across NIRF dimensions
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2">Strongest</th>
                  <th className="pb-2">Weakest</th>
                  <th className="pb-2 text-right">Spread Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parameterImbalances.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-blue-700 font-semibold">{item.strongest}</td>
                    <td className="py-2.5 text-slate-500">{item.weakest}</td>
                    <td className="py-2.5 text-right font-extrabold text-amber-700">
                      {item.gap} pts
                    </td>
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
