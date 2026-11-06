import React, { useState } from 'react';
import {
  BarChart3,
  Calculator,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { RANKINGS, CATEGORIES, YEARS } from '../data/nirfData';
import { calculateStatsSummary } from '../utils/statistics';

export const ScoreDistribution: React.FC = () => {
  const { filters } = useApp();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [activeCategory, setActiveCategory] = useState<string>('Overall');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(30);

  // Active records
  const records = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory) &&
      r.overall_score >= minScoreFilter
  );

  const scores = records.map((r) => r.overall_score);
  const stats = calculateStatsSummary(scores);

  // Q1: Score Histogram Bins (including 30–40)
  const bins = [
    { range: '30–40', min: 30, max: 40, count: 0 },
    { range: '40–50', min: 40, max: 50, count: 0 },
    { range: '50–60', min: 50, max: 60, count: 0 },
    { range: '60–70', min: 60, max: 70, count: 0 },
    { range: '70–80', min: 70, max: 80, count: 0 },
    { range: '80–90', min: 80, max: 90, count: 0 },
    { range: '90–100', min: 90, max: 100, count: 0 },
  ];

  scores.forEach((s) => {
    const bin = bins.find((b) => s >= b.min && s < b.max) || (s >= 90 ? bins[bins.length - 1] : bins[0]);
    if (bin) bin.count += 1;
  });

  // Q4: Quartile Distribution
  const q1Count = scores.filter((s) => s < stats.q1).length;
  const q2Count = scores.filter((s) => s >= stats.q1 && s < stats.median).length;
  const q3Count = scores.filter((s) => s >= stats.median && s < stats.q3).length;
  const q4Count = scores.filter((s) => s >= stats.q3).length;
  const total = scores.length || 1;

  const quartileData = [
    { name: `Q1 (Bottom 25%: <${stats.q1})`, count: q1Count, percentage: ((q1Count / total) * 100).toFixed(1) },
    { name: `Q2 (25%–50%: ${stats.q1}–${stats.median})`, count: q2Count, percentage: ((q2Count / total) * 100).toFixed(1) },
    { name: `Q3 (50%–75%: ${stats.median}–${stats.q3})`, count: q3Count, percentage: ((q3Count / total) * 100).toFixed(1) },
    { name: `Q4 (Top 25%: ≥${stats.q3})`, count: q4Count, percentage: ((q4Count / total) * 100).toFixed(1) },
  ];

  const QUARTILE_COLORS = ['#93C5FD', '#60A5FA', '#3B82F6', '#1D4ED8'];

  // Q5: Category-wise score spread
  const categorySpreads = CATEGORIES.map((c) => {
    const catScores = RANKINGS.filter((r) => r.year === activeYear && r.category === c.value).map(
      (r) => r.overall_score
    );
    const catStats = calculateStatsSummary(catScores);
    return {
      category: c.label,
      min: catStats.min,
      q1: catStats.q1,
      median: catStats.median,
      q3: catStats.q3,
      max: catStats.max,
      mean: catStats.mean,
      count: catScores.length,
    };
  });

  // Q2: Rank Distribution Histogram (separate year + category filters)
  const [q2Year, setQ2Year] = useState<number>(filters.year || 2025);
  const [q2Category, setQ2Category] = useState<string>('Overall');

  const q2Records = RANKINGS.filter(
    (r) =>
      r.year === q2Year &&
      (q2Category === 'All' || r.category === q2Category) &&
      r.rank != null &&
      r.rank > 0
  );
  const q2Total = q2Records.length || 1;

  const RANK_BINS = [
    { range: '1–10',    min: 1,   max: 10  },
    { range: '11–50',   min: 11,  max: 50  },
    { range: '51–100',  min: 51,  max: 100 },
    { range: '101–200', min: 101, max: 200 },
    { range: '201–300', min: 201, max: 300 },
    { range: '301–500', min: 301, max: 500 },
    { range: '501+',    min: 501, max: Infinity },
  ];

  const q2ChartData = RANK_BINS.map((bin) => {
    const count = q2Records.filter((r) => r.rank >= bin.min && r.rank <= bin.max).length;
    const pct = ((count / q2Total) * 100).toFixed(1);
    return { range: bin.range, count, pct };
  });

  // Dynamic interpretation
  const q2DenseBin = [...q2ChartData].sort((a, b) => b.count - a.count)[0];
  const q2TopBin = q2ChartData.find((b) => b.range === '1–10');
  const q2Interpretation =
    q2DenseBin && q2DenseBin.count > 0
      ? `In ${q2Year}${q2Category !== 'All' ? ` (${q2Category})` : ''}, the largest concentration of institutions falls in the \
<strong>${q2DenseBin.range}</strong> rank band (${q2DenseBin.count} institutions, ${q2DenseBin.pct}%). \
${q2TopBin && q2TopBin.count > 0 ? `Only ${q2TopBin.count} institution${q2TopBin.count > 1 ? 's' : ''} rank in the elite top-10.` : ''} \
The distribution reveals how competition intensifies as ranks approach the top.`
      : `No ranked institution data found for the selected filters.`;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Univariate Score Distribution & Statistical Measures
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical distribution, central tendency metrics, dispersion properties, and quartile spreads of institutional NIRF scores.
          </p>
        </div>

        {/* Local filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="score-dist-year" className="text-slate-500 font-semibold text-[11px]">Year:</label>
            <select
              id="score-dist-year"
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

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="score-dist-cat" className="text-slate-500 font-semibold text-[11px]">Category:</label>
            <select
              id="score-dist-cat"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* QUESTION 3: Statistical Summary KPI Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
            Question 3
          </span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Parametric Summary Statistics ({activeYear} • {activeCategory} Cohort • N={stats.count})
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Mean (Average)</span>
            <div className="text-xl font-black text-blue-700 mt-1">{stats.mean}</div>
            <span className="text-[10px] text-slate-400">Score units</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Median (P50)</span>
            <div className="text-xl font-black text-indigo-700 mt-1">{stats.median}</div>
            <span className="text-[10px] text-slate-400">50th percentile</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Minimum</span>
            <div className="text-xl font-black text-slate-700 mt-1">{stats.min}</div>
            <span className="text-[10px] text-slate-400">Lowest rank score</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Maximum</span>
            <div className="text-xl font-black text-emerald-600 mt-1">{stats.max}</div>
            <span className="text-[10px] text-slate-400">Top premier score</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Std Deviation</span>
            <div className="text-xl font-black text-purple-700 mt-1">{stats.stdDev}</div>
            <span className="text-[10px] text-slate-400">σ dispersion</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">IQR (Q3 - Q1)</span>
            <div className="text-xl font-black text-amber-700 mt-1">{stats.iqr}</div>
            <span className="text-[10px] text-slate-400">Middle 50% spread</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Q1 / Q3 Cutoffs</span>
            <div className="text-sm font-black text-slate-800 mt-1.5">{stats.q1} / {stats.q3}</div>
            <span className="text-[10px] text-slate-400">25th & 75th percentiles</span>
          </div>
        </div>
      </div>

      {/* QUESTION 1 & 2: Score Histogram & Rank Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q1: Histogram */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Question 1
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              NIRF Score Frequency Histogram ({activeYear})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Number of institutions falling within discrete 10-point score intervals
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bins} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Institutions`, 'Frequency']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#2459D3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500">
            The distribution displays a positive skew; majority of institutions cluster between 50–70 points, with a selective elite exceeding 80 points.
          </p>
        </div>

        {/* Q4: Quartile Distribution */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Quartile Proportion Breakdown ({activeYear})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Percentage and count of ranked institutions across each quartile segment
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={quartileData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {quartileData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={QUARTILE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} institutions (${item.payload.percentage}%)`,
                    item.payload.name,
                  ]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* QUESTION 2: Rank Distribution Histogram */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                Question 2
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Distribution of Overall NIRF Ranks Across Institutions ({q2Year})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Frequency of institutions per rank-range interval — using actual overall rank, not score
            </p>
          </div>

          {/* Q2 own filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <label htmlFor="q2-rank-year" className="text-slate-500 font-semibold text-[11px]">Year:</label>
              <select
                id="q2-rank-year"
                value={q2Year}
                onChange={(e) => setQ2Year(Number(e.target.value))}
                className="font-bold text-blue-700 outline-none cursor-pointer bg-transparent"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <label htmlFor="q2-rank-cat" className="text-slate-500 font-semibold text-[11px]">Category:</label>
              <select
                id="q2-rank-cat"
                value={q2Category}
                onChange={(e) => setQ2Category(e.target.value)}
                className="font-bold text-slate-800 outline-none cursor-pointer bg-transparent"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Histogram */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={q2ChartData}
              margin={{ top: 28, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'Overall Rank Range',
                  position: 'insideBottom',
                  offset: -2,
                  style: { fontSize: 10, fill: '#94A3B8' },
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                label={{
                  value: 'No. of Institutions',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 5,
                  style: { fontSize: 10, fill: '#94A3B8' },
                }}
              />
              <Tooltip
                cursor={{ fill: '#EFF6FF' }}
                contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }}
                formatter={(val: any, _name: any, item: any) => [
                  `${val} institutions (${item.payload.pct}% of total)`,
                  'Count',
                ]}
                labelFormatter={(label) => `Rank Range: ${label}`}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {q2ChartData.map((_entry, index) => {
                  const blues = ['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A'];
                  return <Cell key={`rbin-${index}`} fill={blues[Math.min(index, blues.length - 1)]} />;
                })}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 700, fill: '#1E40AF' }}
                  formatter={(v: any) => (v > 0 ? String(v) : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic interpretation */}
        <p
          className="text-[11px] text-slate-500 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: q2Interpretation }}
        />
      </div>

      {/* QUESTION 5: Category-Wise Score Spread (Box-Plot Representation) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
            Question 5
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            How does the spread of scores differ across NIRF categories? ({activeYear})
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Cross-stream comparison of minimum, Q1, median, Q3, and maximum scores across official categories
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400">
                <th className="pb-3">Category</th>
                <th className="pb-3 text-center">Sample Count</th>
                <th className="pb-3 text-center">Min Score</th>
                <th className="pb-3 text-center">Q1 (25th)</th>
                <th className="pb-3 text-center font-bold text-blue-700">Median (50th)</th>
                <th className="pb-3 text-center">Q3 (75th)</th>
                <th className="pb-3 text-center">Max Score</th>
                <th className="pb-3 text-right">Spread Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorySpreads.map((cs) => (
                <tr key={cs.category} className="hover:bg-slate-50">
                  <td className="py-3 font-bold text-slate-800">{cs.category}</td>
                  <td className="py-3 text-center text-slate-500">{cs.count}</td>
                  <td className="py-3 text-center text-slate-500">{cs.min}</td>
                  <td className="py-3 text-center text-slate-600">{cs.q1}</td>
                  <td className="py-3 text-center font-black text-blue-700">{cs.median}</td>
                  <td className="py-3 text-center text-slate-600">{cs.q3}</td>
                  <td className="py-3 text-center font-bold text-emerald-600">{cs.max}</td>
                  <td className="py-3 text-right">
                    {/* Compact Box Plot Bar */}
                    <div className="w-36 ml-auto bg-slate-100 h-3 rounded-full relative overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500/80 rounded-full"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((cs.q1 - 30) / 70) * 100))}%`,
                          width: `${Math.max(5, Math.min(100, ((cs.q3 - cs.q1) / 70) * 100))}%`,
                        }}
                        title={`IQR: ${cs.q1} to ${cs.q3}`}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-blue-900 rounded-full"
                        style={{ left: `${Math.max(0, Math.min(100, ((cs.median - 30) / 70) * 100))}%` }}
                        title={`Median: ${cs.median}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
