/**
 * Distribution & Statistical Analysis page
 * Uses real NIRF dataset — no hardcoded statistics.
 */
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
  LineChart, Line, ReferenceLine,
  ComposedChart, Area,
} from 'recharts';
import { BarChart2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RANKINGS, INSTITUTIONS, YEARS, CATEGORIES, STATES } from '../data/nirfData';
import {
  calculateStatsSummary,
  calculateStandardDeviation,
  calculateMean,
  calculateMedian,
  calculateQuartiles,
} from '../utils/statistics';

// ─── Types ───────────────────────────────────────────────────────────────────
type ParamOption = 'overall_score' | 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR';
const PARAM_OPTIONS: { key: ParamOption; label: string }[] = [
  { key: 'overall_score', label: 'Overall Score' },
  { key: 'TLR', label: 'TLR' },
  { key: 'RPC', label: 'RPC' },
  { key: 'GO', label: 'GO' },
  { key: 'OI', label: 'OI' },
  { key: 'PR', label: 'PR' },
];
const PARAM_COLORS: Record<string, string> = {
  TLR: '#2459D3', RPC: '#8B5CF6', GO: '#10B981', OI: '#F59E0B', PR: '#EC4899',
};

function getParamValues(records: typeof RANKINGS, param: ParamOption): number[] {
  return records
    .map((r) => r[param] as number)
    .filter((v) => v != null && !isNaN(v) && v > 0);
}

// Custom box-plot shape rendered via SVG
interface BoxPlotDatum {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color: string;
  count: number;
  mean: number;
  stdDev: number;
}

const BoxPlotSVG: React.FC<{ data: BoxPlotDatum[]; domainMin?: number; domainMax?: number }> = ({
  data,
  domainMin = 0,
  domainMax = 100,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const W = 480;
  const H = 220;
  const MARGIN = { top: 20, right: 24, bottom: 32, left: 48 };
  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom;
  const slotW = plotW / data.length;
  const boxW = Math.min(slotW * 0.5, 60);

  const toY = (v: number) =>
    MARGIN.top + plotH - ((v - domainMin) / (domainMax - domainMin)) * plotH;

  const ticks = Array.from({ length: 6 }, (_, i) =>
    Math.round(domainMin + ((domainMax - domainMin) / 5) * i)
  );

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', minWidth: 280 }}
        onMouseLeave={() => { setHoveredIdx(null); setTooltipPos(null); }}
      >
        {/* Grid */}
        {ticks.map((t) => (
          <line key={t} x1={MARGIN.left} x2={W - MARGIN.right} y1={toY(t)} y2={toY(t)}
            stroke="#F1F5F9" strokeWidth={1} />
        ))}
        {/* Y-axis labels */}
        {ticks.map((t) => (
          <text key={t} x={MARGIN.left - 6} y={toY(t) + 4} textAnchor="end" fontSize={9} fill="#94A3B8">{t}</text>
        ))}
        {/* Y-axis title */}
        <text
          x={12} y={H / 2} textAnchor="middle" fontSize={9} fill="#94A3B8"
          transform={`rotate(-90, 12, ${H / 2})`}
        >Score</text>

        {data.map((d, i) => {
          const cx = MARGIN.left + slotW * i + slotW / 2;
          const isHov = hoveredIdx === i;
          return (
            <g
              key={d.label}
              onMouseEnter={(e) => { setHoveredIdx(i); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              style={{ cursor: 'pointer' }}
            >
              {/* Hover bg */}
              {isHov && (
                <rect x={cx - slotW / 2} y={MARGIN.top} width={slotW} height={plotH}
                  fill="#EFF6FF" rx={4} opacity={0.6} />
              )}
              {/* Whisker top */}
              <line x1={cx} x2={cx} y1={toY(d.max)} y2={toY(d.q3)}
                stroke={d.color} strokeWidth={isHov ? 2 : 1.5} strokeDasharray="3 2" />
              {/* Whisker bottom */}
              <line x1={cx} x2={cx} y1={toY(d.q1)} y2={toY(d.min)}
                stroke={d.color} strokeWidth={isHov ? 2 : 1.5} strokeDasharray="3 2" />
              {/* Whisker caps */}
              <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={toY(d.max)} y2={toY(d.max)}
                stroke={d.color} strokeWidth={1.5} />
              <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={toY(d.min)} y2={toY(d.min)}
                stroke={d.color} strokeWidth={1.5} />
              {/* IQR box */}
              <rect
                x={cx - boxW / 2} y={toY(d.q3)}
                width={boxW} height={Math.max(1, toY(d.q1) - toY(d.q3))}
                fill={d.color} fillOpacity={isHov ? 0.3 : 0.18}
                stroke={d.color} strokeWidth={isHov ? 2 : 1.5} rx={3}
              />
              {/* Median line */}
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={toY(d.median)} y2={toY(d.median)}
                stroke={d.color} strokeWidth={isHov ? 3 : 2} />
              {/* Mean dot */}
              <circle cx={cx} cy={toY(d.mean)} r={3} fill={d.color} stroke="#fff" strokeWidth={1.5} />
              {/* X label */}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={10} fontWeight={600}
                fill={isHov ? d.color : '#475569'}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Floating tooltip */}
      {hoveredIdx !== null && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <p className="font-bold text-slate-800 mb-1">{data[hoveredIdx].label} (n={data[hoveredIdx].count})</p>
          <p className="text-slate-500">Max: <span className="font-semibold text-slate-700">{data[hoveredIdx].max}</span></p>
          <p className="text-slate-500">Q3: <span className="font-semibold text-slate-700">{data[hoveredIdx].q3}</span></p>
          <p className="text-blue-700 font-bold">Median: {data[hoveredIdx].median}</p>
          <p className="text-slate-500">Mean: <span className="font-semibold">{data[hoveredIdx].mean}</span> <span className="text-[10px]">(dot)</span></p>
          <p className="text-slate-500">Q1: <span className="font-semibold text-slate-700">{data[hoveredIdx].q1}</span></p>
          <p className="text-slate-500">Min: <span className="font-semibold text-slate-700">{data[hoveredIdx].min}</span></p>
          <p className="text-slate-500">IQR: <span className="font-semibold text-slate-700">{(data[hoveredIdx].q3 - data[hoveredIdx].q1).toFixed(1)}</span></p>
          <p className="text-slate-500">Std Dev: <span className="font-semibold text-slate-700">{data[hoveredIdx].stdDev}</span></p>
        </div>
      )}
    </div>
  );
};

// ─── Custom tooltip for Q4 ────────────────────────────────────────────────────
const IQRBandTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">Year {label}</p>
      <p className="text-slate-500">Median: <span className="font-bold text-blue-700">{d.median}</span></p>
      <p className="text-slate-500">Q1 (25th pct): <span className="font-semibold">{d.q1}</span></p>
      <p className="text-slate-500">Q3 (75th pct): <span className="font-semibold">{d.q3}</span></p>
      <p className="text-slate-500">IQR: <span className="font-semibold text-amber-600">{d.iqr}</span></p>
      <p className="text-slate-500">Sample: <span className="font-semibold">{d.count}</span></p>
    </div>
  );
};

// ─── Custom Q3 tooltip ───────────────────────────────────────────────────────
const ParamSdTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      <p className="text-slate-500">Std Dev (σ): <span className="font-bold text-blue-700">{d?.stdDev}</span></p>
      <p className="text-slate-500">Mean: <span className="font-semibold">{d?.mean}</span></p>
      <p className="text-slate-500">Sample (n): <span className="font-semibold">{d?.count}</span></p>
    </div>
  );
};

// ─── State median choropleth (SVG-based panel) ───────────────────────────────
interface StateStatRow {
  state: string;
  count: number;
  median: number;
  mean: number;
  iqr: number;
  q1: number;
  q3: number;
}

const StateRankingPanel: React.FC<{ data: StateStatRow[]; param: ParamOption }> = ({ data, param }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxMedian = Math.max(...data.map((d) => d.median), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div
          key={d.state}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-default transition-colors ${hovered === d.state ? 'bg-blue-50' : i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
          onMouseEnter={() => setHovered(d.state)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="text-[11px] font-bold text-slate-500 w-5 text-right shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 truncate">{d.state}</span>
              <span className="text-[11px] font-extrabold text-blue-700 shrink-0">{d.median}</span>
            </div>
            <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(d.median / maxMedian) * 100}%` }}
              />
            </div>
            {hovered === d.state && (
              <div className="mt-1 flex gap-3 text-[10px] text-slate-500">
                <span>n={d.count}</span>
                <span>Mean {d.mean}</span>
                <span>IQR {d.iqr}</span>
                <span>Q1 {d.q1} · Q3 {d.q3}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Filter pill helper ───────────────────────────────────────────────────────
const FilterSelect: React.FC<{
  id: string; label: string; value: string;
  onChange: (v: string) => void; children: React.ReactNode;
}> = ({ id, label, value, onChange, children }) => (
  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
    <label htmlFor={id} className="text-slate-500 font-semibold text-[11px] shrink-0">{label}:</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
      className="font-bold text-blue-700 outline-none cursor-pointer bg-transparent">
      {children}
    </select>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const DistributionStats: React.FC = () => {
  const { filters } = useApp();

  // Global filters
  const [year, setYear] = useState<number>(filters.year || 2025);
  const [category, setCategory] = useState<string>('Overall');
  const [param, setParam] = useState<ParamOption>('overall_score');

  // Q2 multi-year selection
  const [q2Years, setQ2Years] = useState<number[]>(YEARS.slice(-5));
  const [q2Category, setQ2Category] = useState<string>('Overall');

  // Q5 state filter
  const [q5State, setQ5State] = useState<string>('All');

  const resetFilters = () => {
    setYear(2025);
    setCategory('Overall');
    setParam('overall_score');
    setQ2Years(YEARS.slice(-5));
    setQ2Category('Overall');
    setQ5State('All');
  };

  // ── Base records ────────────────────────────────────────────────────────
  const baseRecords = useMemo(() =>
    RANKINGS.filter(
      (r) => r.year === year && (category === 'All' || r.category === category)
    ).sort((a, b) => a.rank - b.rank),
  [year, category]);

  // ── Q1: Top 10 vs Rest box plots ─────────────────────────────────────────
  const q1Data = useMemo((): BoxPlotDatum[] => {
    const top10 = baseRecords.slice(0, 10);
    const rest = baseRecords.slice(10);
    const makeBox = (recs: typeof baseRecords, label: string, color: string): BoxPlotDatum => {
      const vals = getParamValues(recs, param);
      const stats = calculateStatsSummary(vals);
      return {
        label, color,
        min: stats.min, q1: stats.q1, median: stats.median,
        q3: stats.q3, max: stats.max,
        count: stats.count, mean: stats.mean, stdDev: stats.stdDev,
      };
    };
    return [
      makeBox(top10, 'Top 10', '#2459D3'),
      makeBox(rest, 'Rest', '#94A3B8'),
    ];
  }, [baseRecords, param]);

  const q1Interp = useMemo(() => {
    const [t, r] = q1Data;
    if (!t || !r || t.count === 0 || r.count === 0) return 'Insufficient data for comparison.';
    const gap = Number((t.median - r.median).toFixed(1));
    return `The top-10 group has a median ${param === 'overall_score' ? 'score' : param} of ${t.median}, which is ${gap} pts higher than the remaining institutions (median ${r.median}). The top-10 IQR (${(t.q3 - t.q1).toFixed(1)} pts) reflects ${t.q3 - t.q1 < r.q3 - r.q1 ? 'less internal variability' : 'greater spread'} compared to the rest (IQR ${(r.q3 - r.q1).toFixed(1)} pts).`;
  }, [q1Data, param]);

  // ── Q2: Multi-year dispersion ────────────────────────────────────────────
  const q2BoxData = useMemo((): BoxPlotDatum[] =>
    q2Years.map((y) => {
      const recs = RANKINGS.filter(
        (r) => r.year === y && (q2Category === 'All' || r.category === q2Category)
      );
      const vals = getParamValues(recs, param);
      const stats = calculateStatsSummary(vals);
      return {
        label: String(y), color: '#2459D3',
        min: stats.min, q1: stats.q1, median: stats.median,
        q3: stats.q3, max: stats.max,
        count: stats.count, mean: stats.mean, stdDev: stats.stdDev,
      };
    }),
  [q2Years, q2Category, param]);

  const q2StdDevLine = useMemo(() =>
    q2Years.map((y) => {
      const recs = RANKINGS.filter(
        (r) => r.year === y && (q2Category === 'All' || r.category === q2Category)
      );
      const vals = getParamValues(recs, param);
      return { year: y, stdDev: calculateStandardDeviation(vals) };
    }),
  [q2Years, q2Category, param]);

  const maxStdDevYear = useMemo(() => {
    if (!q2StdDevLine.length) return null;
    return q2StdDevLine.reduce((a, b) => (b.stdDev > a.stdDev ? b : a));
  }, [q2StdDevLine]);

  // ── Q3: Parameter variability ────────────────────────────────────────────
  const q3Data = useMemo(() => {
    const params: Array<{ key: ParamOption; label: string }> = [
      { key: 'TLR', label: 'TLR' },
      { key: 'RPC', label: 'RPC' },
      { key: 'GO', label: 'GO' },
      { key: 'OI', label: 'OI' },
      { key: 'PR', label: 'PR' },
    ];
    return params
      .map(({ key, label }) => {
        const vals = getParamValues(baseRecords, key);
        return {
          param: label,
          stdDev: calculateStandardDeviation(vals),
          mean: calculateMean(vals),
          count: vals.length,
        };
      })
      .sort((a, b) => b.stdDev - a.stdDev);
  }, [baseRecords]);

  const maxSdParam = q3Data[0]?.param;

  // ── Q4: Yearly median trend + IQR band ──────────────────────────────────
  const [q4Category, setQ4Category] = useState<string>('Overall');
  const q4Data = useMemo(() =>
    YEARS.map((y) => {
      const recs = RANKINGS.filter(
        (r) => r.year === y && (q4Category === 'All' || r.category === q4Category)
      );
      const vals = getParamValues(recs, param);
      if (vals.length === 0) return { year: y, median: null, q1: null, q3: null, iqr: null, count: 0, band: [null, null] as [null, null] };
      const stats = calculateStatsSummary(vals);
      return {
        year: y,
        median: stats.median,
        q1: stats.q1,
        q3: stats.q3,
        iqr: stats.iqr,
        count: stats.count,
        band: [stats.q1, stats.q3] as [number, number],
      };
    }),
  [q4Category, param]);

  // ── Q5: State distribution ───────────────────────────────────────────────
  const [q5Year, setQ5Year] = useState<number>(filters.year || 2025);
  const [q5Category, setQ5Category] = useState<string>('Overall');

  const q5Data = useMemo((): StateStatRow[] => {
    const recs = RANKINGS.filter(
      (r) => r.year === q5Year && (q5Category === 'All' || r.category === q5Category)
    );
    const stateMap = new Map<string, number[]>();
    recs.forEach((r) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
      if (!inst) return;
      const val = r[param] as number;
      if (val == null || isNaN(val) || val <= 0) return;
      if (!stateMap.has(inst.state)) stateMap.set(inst.state, []);
      stateMap.get(inst.state)!.push(val);
    });

    const rows: StateStatRow[] = [];
    stateMap.forEach((vals, state) => {
      if (vals.length === 0) return;
      const stats = calculateStatsSummary(vals);
      rows.push({
        state,
        count: stats.count,
        median: stats.median,
        mean: stats.mean,
        iqr: stats.iqr,
        q1: stats.q1,
        q3: stats.q3,
      });
    });
    return rows.sort((a, b) => b.median - a.median);
  }, [q5Year, q5Category, param]);

  const q5Filtered = useMemo(() =>
    q5State === 'All' ? q5Data : q5Data.filter((d) => d.state === q5State),
  [q5Data, q5State]);

  // shared card header classes
  const cardCls = 'p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4';

  const toggleQ2Year = (y: number) => {
    setQ2Years((prev) =>
      prev.includes(y) ? (prev.length > 1 ? prev.filter((x) => x !== y) : prev) : [...prev, y].sort()
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Distribution &amp; Statistical Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical comparison of NIRF institutional scores across institutions, years, parameters, and states (2017–2025).
          </p>
        </div>

        {/* Global filter row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <FilterSelect id="ds-year" label="Year" value={String(year)} onChange={(v) => setYear(Number(v))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>
          <FilterSelect id="ds-cat" label="Category" value={category} onChange={setCategory}>
            <option value="All">All</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </FilterSelect>
          <FilterSelect id="ds-param" label="Parameter" value={param} onChange={(v) => setParam(v as ParamOption)}>
            {PARAM_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </FilterSelect>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-400 text-[11px] font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* ── Q1: Top 10 vs Rest Box Plots ─────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">Question 1</span>
          <h3 className="text-sm font-bold text-slate-900">
            How does score distribution differ between the Top 10 and remaining institutions?
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Side-by-side box plots comparing Top 10 (by rank in selected year/category) vs all other institutions.
          The box spans Q1–Q3; the line is the median; the dot marks the mean; whiskers extend to min/max.
        </p>

        {baseRecords.length < 11 ? (
          <p className="text-xs text-slate-400 italic">Not enough records for comparison (need &gt;10).</p>
        ) : (
          <>
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block opacity-25 border border-blue-600" />
                <span className="text-[11px] text-slate-600 font-semibold">IQR box</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-blue-600 inline-block" />
                <span className="text-[11px] text-slate-600 font-semibold">Median</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span className="text-[11px] text-slate-600 font-semibold">Mean (dot)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t border-dashed border-slate-400 inline-block" />
                <span className="text-[11px] text-slate-600 font-semibold">Whiskers (min/max)</span>
              </div>
            </div>
            <BoxPlotSVG data={q1Data} />
            <div className="mt-2 grid grid-cols-2 gap-3">
              {q1Data.map((d) => (
                <div key={d.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800 mb-1" style={{ color: d.color }}>{d.label} (n={d.count})</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-500">
                    <span>Median: <strong className="text-slate-800">{d.median}</strong></span>
                    <span>Mean: <strong className="text-slate-800">{d.mean}</strong></span>
                    <span>Q1: <strong className="text-slate-800">{d.q1}</strong></span>
                    <span>Q3: <strong className="text-slate-800">{d.q3}</strong></span>
                    <span>IQR: <strong className="text-slate-800">{(d.q3 - d.q1).toFixed(1)}</strong></span>
                    <span>σ: <strong className="text-slate-800">{d.stdDev}</strong></span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">{q1Interp}</p>
          </>
        )}
      </div>

      {/* ── Q2: Multi-year Dispersion ─────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">Question 2</span>
              <h3 className="text-sm font-bold text-slate-900">
                Are NIRF scores more dispersed in one year than another?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Multi-year box plots + standard deviation trend line. The year with highest σ is highlighted.
            </p>
          </div>
          <FilterSelect id="q2-cat" label="Category" value={q2Category} onChange={setQ2Category}>
            <option value="All">All</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </FilterSelect>
        </div>

        {/* Year toggles */}
        <div className="flex flex-wrap gap-1.5">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => toggleQ2Year(y)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${
                q2Years.includes(y)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
              }`}
            >{y}</button>
          ))}
        </div>

        <BoxPlotSVG
          data={q2BoxData.map((d) => ({
            ...d,
            color: maxStdDevYear && d.label === String(maxStdDevYear.year) ? '#EC4899' : '#2459D3',
          }))}
        />

        {/* Std Dev line chart */}
        <div>
          <p className="text-[11px] font-semibold text-slate-600 mb-1">
            Standard Deviation across selected years
            {maxStdDevYear && (
              <span className="ml-2 text-pink-600 font-bold">
                — highest dispersion: {maxStdDevYear.year} (σ = {maxStdDevYear.stdDev})
              </span>
            )}
          </p>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={q2StdDevLine} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`σ = ${v}`, 'Std Dev']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line
                  dataKey="stdDev" stroke="#2459D3" strokeWidth={2} dot={{ r: 3, fill: '#2459D3' }}
                  activeDot={{ r: 5 }} isAnimationActive={true}
                />
                {maxStdDevYear && (
                  <ReferenceLine x={maxStdDevYear.year} stroke="#EC4899" strokeDasharray="4 2"
                    label={{ value: 'Peak σ', position: 'top', fontSize: 9, fill: '#EC4899' }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          {maxStdDevYear
            ? `${maxStdDevYear.year} shows the greatest score dispersion (σ = ${maxStdDevYear.stdDev}) for the selected category and parameter, indicating the widest spread of institutional performance in that year.`
            : 'Select at least one year to view dispersion data.'}
        </p>
      </div>

      {/* ── Q3: Parameter Variability ─────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">Question 3</span>
              <h3 className="text-sm font-bold text-slate-900">
                Which NIRF parameter exhibits the greatest variability across institutions?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Horizontal bar chart of sample standard deviation per parameter. Sorted highest → lowest variability. The most variable parameter is highlighted.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">Year: {year} · {category}</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={q3Data}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                label={{ value: 'σ (Std Dev)', position: 'insideBottomRight', offset: -4, style: { fontSize: 9, fill: '#94A3B8' } }} />
              <YAxis type="category" dataKey="param" tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                width={30} axisLine={false} tickLine={false} />
              <Tooltip content={<ParamSdTooltip />} />
              <Bar dataKey="stdDev" radius={[0, 4, 4, 0]} isAnimationActive={true}>
                {q3Data.map((entry) => (
                  <Cell
                    key={entry.param}
                    fill={entry.param === maxSdParam ? '#2459D3' : '#CBD5E1'}
                  />
                ))}
                <LabelList
                  dataKey="stdDev"
                  position="right"
                  style={{ fontSize: 10, fontWeight: 700, fill: '#1E40AF' }}
                  formatter={(v: any) => typeof v === 'number' ? v.toFixed(2) : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          {q3Data.length > 0
            ? `${q3Data[0].param} shows the highest variability across institutions (σ = ${q3Data[0].stdDev}, mean = ${q3Data[0].mean}) in ${year} · ${category}. ${q3Data[q3Data.length - 1]?.param} is the most consistent (σ = ${q3Data[q3Data.length - 1]?.stdDev}).`
            : 'No data for selected filters.'}
        </p>
      </div>

      {/* ── Q4: Median Trend + IQR Band ──────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Question 4</span>
              <h3 className="text-sm font-bold text-slate-900">
                How do median and IQR of scores change over time?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Median trend line (2017–2025) with a shaded Q1–Q3 band showing year-on-year spread. Hover for exact values.
            </p>
          </div>
          <FilterSelect id="q4-cat" label="Category" value={q4Category} onChange={setQ4Category}>
            <option value="All">All</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </FilterSelect>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={q4Data} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                domain={['auto', 'auto']} />
              <Tooltip content={<IQRBandTooltip />} />
              {/* IQR shaded band — rendered as an Area with [q1, q3] */}
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="#2459D3"
                fillOpacity={0.1}
                isAnimationActive={true}
                dot={false}
                activeDot={false}
              />
              {/* Q1 line */}
              <Line type="monotone" dataKey="q1" stroke="#93C5FD" strokeWidth={1.5}
                strokeDasharray="4 2" dot={false} name="Q1 (25th pct)" isAnimationActive />
              {/* Q3 line */}
              <Line type="monotone" dataKey="q3" stroke="#93C5FD" strokeWidth={1.5}
                strokeDasharray="4 2" dot={false} name="Q3 (75th pct)" isAnimationActive />
              {/* Median */}
              <Line type="monotone" dataKey="median" stroke="#2459D3" strokeWidth={2.5}
                dot={{ r: 4, fill: '#2459D3' }} activeDot={{ r: 6 }} name="Median" isAnimationActive />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-600 inline-block" />
            <span>Median</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-blue-300 border-dashed border-t inline-block" />
            <span>Q1 / Q3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-3 bg-blue-600 opacity-10 inline-block rounded" />
            <span>IQR band</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          The shaded band between Q1 and Q3 represents where the middle 50% of institutions lie each year. A widening band indicates growing score dispersion over time.
        </p>
      </div>

      {/* ── Q5: State-level score distribution ───────────────────────────── */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">Question 5</span>
              <h3 className="text-sm font-bold text-slate-900">
                How does score distribution differ across states?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              State ranking by median {param === 'overall_score' ? 'overall score' : param}.
              Hover a state to see institution count, mean, and IQR.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect id="q5-year" label="Year" value={String(q5Year)} onChange={(v) => setQ5Year(Number(v))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
            <FilterSelect id="q5-cat" label="Category" value={q5Category} onChange={setQ5Category}>
              <option value="All">All</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </FilterSelect>
            <FilterSelect id="q5-state" label="State" value={q5State} onChange={setQ5State}>
              <option value="All">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>
          </div>
        </div>

        {q5Filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No data for the selected filters.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart of state medians */}
            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-2">
                Median {param === 'overall_score' ? 'Score' : param} by State — {q5Year}
              </p>
              <div style={{ height: Math.max(240, q5Filtered.length * 28) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={q5Filtered.slice(0, 20)}
                    layout="vertical"
                    margin={{ top: 4, right: 48, left: 110, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }}
                      axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="state" width={108}
                      tick={{ fontSize: 9, fill: '#475569', fontWeight: 500 }}
                      axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(val: any, _n: any, item: any) => [
                        `${val} (n=${item.payload.count}, IQR=${item.payload.iqr})`,
                        `Median ${param === 'overall_score' ? 'Score' : param}`,
                      ]}
                    />
                    <Bar dataKey="median" radius={[0, 4, 4, 0]} isAnimationActive>
                      {q5Filtered.slice(0, 20).map((d, i) => (
                        <Cell key={d.state}
                          fill={i === 0 ? '#1D4ED8' : i < 5 ? '#3B82F6' : i < 10 ? '#60A5FA' : '#93C5FD'} />
                      ))}
                      <LabelList dataKey="median" position="right"
                        style={{ fontSize: 9, fontWeight: 700, fill: '#1E40AF' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranked panel */}
            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-2">
                State Rankings (hover for details)
              </p>
              <div className="max-h-[400px] overflow-y-auto pr-1">
                <StateRankingPanel data={q5Filtered} param={param} />
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 italic">
          {q5Filtered.length > 0
            ? `${q5Filtered[0].state} leads with the highest median ${param === 'overall_score' ? 'score' : param} of ${q5Filtered[0].median} (${q5Filtered[0].count} institution${q5Filtered[0].count > 1 ? 's' : ''}, IQR = ${q5Filtered[0].iqr}).`
            : 'No states to display.'}
          {' '}States with &lt;2 institutions may show high variation.
        </p>
      </div>

    </div>
  );
};
