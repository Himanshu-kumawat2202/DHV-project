import React, { useState } from 'react';
import {
  Layers,
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
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { RANKINGS, INSTITUTIONS, YEARS } from '../data/nirfData';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

// ─── Q4 custom tooltip ──────────────────────────────────────────────────────
const Q4Tooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const entry = payload[0];
  const delta = entry.value as number;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">{entry.payload?.instName ?? label}</p>
      <p className="text-slate-500">Parameter: <span className="font-semibold text-slate-700">{entry.name}</span></p>
      <p className={delta >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
        Change: {delta >= 0 ? '+' : ''}{delta} pts
      </p>
      {entry.payload?.overallGain !== undefined && (
        <p className="text-blue-700 font-bold mt-1">Overall gain: +{entry.payload.overallGain} pts</p>
      )}
    </div>
  );
};

// ─── Q5 Dumbbell rendered as custom SVG inside a scrollable div ─────────────
interface DumbbellRow {
  id: string;
  name: string;
  rank: number;
  strongKey: string;
  strongVal: number;
  weakKey: string;
  weakVal: number;
  gap: number;
}

const DumbbellChart: React.FC<{ data: DumbbellRow[] }> = ({ data }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; row: DumbbellRow } | null>(null);

  const domainMin = 0;
  const domainMax = 100;
  const LEFT_MARGIN = 148; // px for institution labels
  const RIGHT_MARGIN = 56;
  const ROW_HEIGHT = 44;
  const DOT_R = 7;
  const SVG_WIDTH = 560; // intrinsic width; ResponsiveContainer scales it
  const plotW = SVG_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
  const svgH = data.length * ROW_HEIGHT + 32;

  const toX = (val: number) =>
    LEFT_MARGIN + ((val - domainMin) / (domainMax - domainMin)) * plotW;

  // Tick values for the x-axis
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${svgH}`}
        width="100%"
        style={{ display: 'block', minWidth: 320 }}
        onMouseLeave={() => { setHovered(null); setTooltipData(null); }}
      >
        {/* Grid lines */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={toX(t)}
            x2={toX(t)}
            y1={16}
            y2={svgH - 16}
            stroke="#F1F5F9"
            strokeWidth={1}
          />
        ))}

        {/* X-axis tick labels */}
        {ticks.map((t) => (
          <text
            key={t}
            x={toX(t)}
            y={svgH - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#94A3B8"
          >
            {t}
          </text>
        ))}

        {data.map((row, i) => {
          const cy = 16 + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const xStrong = toX(row.strongVal);
          const xWeak = toX(row.weakVal);
          const xLeft = Math.min(xStrong, xWeak);
          const xRight = Math.max(xStrong, xWeak);
          const isHovered = hovered === row.id;

          return (
            <g
              key={row.id}
              onMouseEnter={(e) => {
                setHovered(row.id);
                setTooltipData({ x: e.clientX, y: e.clientY, row });
              }}
              onMouseMove={(e) => setTooltipData({ x: e.clientX, y: e.clientY, row })}
              style={{ cursor: 'pointer' }}
            >
              {/* Row hover bg */}
              {isHovered && (
                <rect
                  x={0}
                  y={cy - ROW_HEIGHT / 2}
                  width={SVG_WIDTH}
                  height={ROW_HEIGHT}
                  fill="#EFF6FF"
                  rx={6}
                />
              )}

              {/* Institution label */}
              <text
                x={LEFT_MARGIN - 8}
                y={cy + 4}
                textAnchor="end"
                fontSize={10}
                fontWeight={isHovered ? 700 : 500}
                fill={isHovered ? '#1E40AF' : '#334155'}
              >
                {row.name.length > 18 ? row.name.slice(0, 17) + '…' : row.name}
              </text>

              {/* Connector line */}
              <line
                x1={xLeft}
                x2={xRight}
                y1={cy}
                y2={cy}
                stroke={isHovered ? '#1D4ED8' : '#CBD5E1'}
                strokeWidth={isHovered ? 2.5 : 2}
              />

              {/* Weak dot (orange) */}
              <circle
                cx={xWeak}
                cy={cy}
                r={DOT_R}
                fill="#F97316"
                stroke="#fff"
                strokeWidth={2}
              />
              {/* Weak label */}
              <text
                x={xWeak + (xWeak < xStrong ? -(DOT_R + 3) : DOT_R + 3)}
                y={cy - 9}
                textAnchor={xWeak < xStrong ? 'end' : 'start'}
                fontSize={8}
                fill="#C2410C"
                fontWeight={600}
              >
                {row.weakKey} {row.weakVal}
              </text>

              {/* Strong dot (blue) */}
              <circle
                cx={xStrong}
                cy={cy}
                r={DOT_R}
                fill="#2563EB"
                stroke="#fff"
                strokeWidth={2}
              />
              {/* Strong label */}
              <text
                x={xStrong + (xStrong > xWeak ? DOT_R + 3 : -(DOT_R + 3))}
                y={cy - 9}
                textAnchor={xStrong > xWeak ? 'start' : 'end'}
                fontSize={8}
                fill="#1E40AF"
                fontWeight={600}
              >
                {row.strongKey} {row.strongVal}
              </text>

              {/* Gap badge on the right */}
              <text
                x={SVG_WIDTH - RIGHT_MARGIN + 4}
                y={cy + 4}
                fontSize={9}
                fontWeight={700}
                fill="#D97706"
              >
                Δ{row.gap}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltipData && (
        <div
          className="pointer-events-none fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs"
          style={{ left: tooltipData.x + 14, top: tooltipData.y - 10 }}
        >
          <p className="font-bold text-slate-800 mb-1">{tooltipData.row.name}</p>
          <p className="text-slate-500">Rank: <span className="font-semibold">#{tooltipData.row.rank}</span></p>
          <p className="text-blue-700 font-semibold">
            Strongest: {tooltipData.row.strongKey} = {tooltipData.row.strongVal}
          </p>
          <p className="text-orange-600 font-semibold">
            Weakest: {tooltipData.row.weakKey} = {tooltipData.row.weakVal}
          </p>
          <p className="text-amber-700 font-bold mt-0.5">
            Spread gap: {tooltipData.row.gap} pts
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export const MultivariateAnalysis: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();
  const { activeTheme } = useChartTheme();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [activeCategory, setActiveCategory] = useState<string>('Overall');

  // Filtered records for the selected year/category
  const records = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory)
  ).sort((a, b) => a.rank - b.rank);

  // ── Q1: Top 5 Institutions across all 5 parameters ──────────────────────
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

  // ── Q2: High Research, Lower Teaching ───────────────────────────────────
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

  // ── Q3: High Teaching, Lower Perception ─────────────────────────────────
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

  // ── Q4: Diverging bar chart data ─────────────────────────────────────────
  // Compare earliest year → activeYear for the same category.
  // Institutions whose overall_score improved AND had ≥1 declining parameter.
  const [q4Sort, setQ4Sort] = useState<'gain' | 'decline'>('gain');

  const PARAMS = ['TLR', 'RPC', 'GO', 'OI', 'PR'] as const;
  type ParamKey = typeof PARAMS[number];

  const earliestYear = YEARS[0];

  // Build institution → record maps for each year
  const mapEarliest = new Map<string, typeof records[number]>();
  const mapActive = new Map<string, typeof records[number]>();

  RANKINGS.filter(
    (r) => r.year === earliestYear && (activeCategory === 'All' || r.category === activeCategory)
  ).forEach((r) => mapEarliest.set(r.institution_id, r));

  RANKINGS.filter(
    (r) => r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory)
  ).forEach((r) => mapActive.set(r.institution_id, r));

  type Q4Institution = {
    id: string;
    name: string;
    overallGain: number;
    maxDecline: number; // most negative delta (most declined param)
    deltas: { param: ParamKey; delta: number }[];
  };

  const q4AllImprovers: Q4Institution[] = [];

  if (earliestYear !== activeYear) {
    mapActive.forEach((toRec, id) => {
      const fromRec = mapEarliest.get(id);
      if (!fromRec) return;
      const overallGain = Number((toRec.overall_score - fromRec.overall_score).toFixed(1));
      if (overallGain <= 0) return;
      const deltas = PARAMS.map((p) => ({
        param: p,
        delta: Number(((toRec[p] as number) - (fromRec[p] as number)).toFixed(1)),
      }));
      const hasDecline = deltas.some((d) => d.delta < 0);
      if (!hasDecline) return;
      const maxDecline = Math.min(...deltas.map((d) => d.delta));
      const inst = INSTITUTIONS.find((i) => i.institution_id === id);
      q4AllImprovers.push({
        id,
        name: inst?.short_name || id,
        overallGain,
        maxDecline,
        deltas,
      });
    });
  }

  const q4Sorted =
    q4Sort === 'gain'
      ? [...q4AllImprovers].sort((a, b) => b.overallGain - a.overallGain)
      : [...q4AllImprovers].sort((a, b) => a.maxDecline - b.maxDecline); // most declined first

  // Top 10 for display
  const q4Display = q4Sorted.slice(0, 10);

  // Flatten into one chart row per institution with 5 bar dataKeys (one per param)
  // Each row: { instName, rank, overallGain, TLR, RPC, GO, OI, PR }
  const q4ChartData = q4Display.map((inst) => {
    const row: Record<string, any> = {
      instName: inst.name,
      overallGain: inst.overallGain,
    };
    inst.deltas.forEach((d) => { row[d.param] = d.delta; });
    return row;
  });

  // ── Q5: Dumbbell chart data ───────────────────────────────────────────────
  const q5Raw: DumbbellRow[] = records
    .map((r) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
      const paramVals = PARAMS.map((p) => ({ key: p, val: r[p] as number }))
        .filter((x) => x.val != null && !isNaN(x.val));
      if (paramVals.length < 2) return null;
      paramVals.sort((a, b) => b.val - a.val);
      const strongest = paramVals[0];
      const weakest = paramVals[paramVals.length - 1];
      return {
        id: r.institution_id,
        name: inst?.short_name || r.institution_id,
        rank: r.rank,
        strongKey: strongest.key,
        strongVal: strongest.val,
        weakKey: weakest.key,
        weakVal: weakest.val,
        gap: Number((strongest.val - weakest.val).toFixed(1)),
      };
    })
    .filter(Boolean) as DumbbellRow[];

  const q5Display = q5Raw.sort((a, b) => b.gap - a.gap).slice(0, 14);

  // ── Param color helpers ───────────────────────────────────────────────────
  const PARAM_COLORS: Record<string, string> = {
    TLR: '#2459D3',
    RPC: '#8B5CF6',
    GO: '#10B981',
    OI: '#F59E0B',
    PR: '#EC4899',
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Multivariate Analysis &amp; Parameter Dynamics
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
                <option key={y} value={y}>{y}</option>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Q2: High Research, Lower Teaching */}
        <div className="flex flex-col h-[480px] p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Research (RPC) with Relatively Lower Teaching (TLR)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-2 shrink-0">
            Specialized research institutes with high scientific output despite smaller instructional faculty
          </p>

          <div className="flex-1 min-h-0 overflow-y-auto mt-3 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-white z-10">
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
        <div className="flex flex-col h-[480px] p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Question 3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Teaching (TLR) with Relatively Lower Perception (PR)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-2 shrink-0">
            "Under-perceived excellence" — institutions excelling in faculty resources that lag in brand prestige surveys
          </p>

          <div className="flex-1 min-h-0 overflow-y-auto mt-3 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-white z-10">
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

      {/* QUESTIONS 4 & 5 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* ── Q4: Diverging Horizontal Bar Chart ─────────────────────────── */}
        <div className="flex flex-col h-[560px] p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          {/* Header */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Score Improvement Despite Parameter Declines
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 shrink-0">
            Institutions that improved overall score ({earliestYear}→{activeYear}) while at least one parameter declined. Green = gain · Red = decline.
          </p>

          {/* Sort controls */}
          <div className="flex items-center gap-2 mt-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-semibold">Sort:</span>
            <button
              onClick={() => setQ4Sort('gain')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                q4Sort === 'gain'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
              }`}
            >
              Overall Gain ↓
            </button>
            <button
              onClick={() => setQ4Sort('decline')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                q4Sort === 'decline'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-rose-400'
              }`}
            >
              Max Decline ↓
            </button>
          </div>

          {/* Chart or empty state */}
          {q4ChartData.length === 0 || earliestYear === activeYear ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                {earliestYear === activeYear
                  ? 'Select a year other than the earliest to compare year-over-year changes.'
                  : `No institutions in the ${activeCategory} category improved overall score while declining in at least one parameter between ${earliestYear} and ${activeYear}.`}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto mt-3">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                {PARAMS.map((p) => (
                  <div key={p} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: PARAM_COLORS[p] }}
                    />
                    <span className="text-[10px] text-slate-500 font-semibold">{p}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-semibold">Gain</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span className="text-[10px] text-slate-500 font-semibold">Decline</span>
                </div>
              </div>

              {/* One diverging bar chart per institution */}
              {q4ChartData.map((row) => {
                const instData = PARAMS.map((p) => ({
                  param: p,
                  delta: (row[p] as number) ?? 0,
                }));
                const maxAbs = Math.max(...instData.map((d) => Math.abs(d.delta)), 1);
                const domainPad = Math.ceil(maxAbs * 1.3);
                return (
                  <div key={row.instName} className="mb-3">
                    {/* Institution header */}
                    <div className="flex items-center justify-between mb-0.5 px-1">
                      <span
                        className="text-[11px] font-bold text-slate-800 truncate max-w-[180px]"
                        title={row.instName}
                      >
                        {row.instName}
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 rounded-md px-1.5 py-0.5 shrink-0">
                        +{row.overallGain} pts overall
                      </span>
                    </div>
                    <div style={{ height: 54 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={instData}
                          layout="vertical"
                          margin={{ top: 2, right: 8, left: 28, bottom: 2 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis
                            type="number"
                            domain={[-domainPad, domainPad]}
                            tick={{ fontSize: 8, fill: '#94A3B8' }}
                            tickCount={5}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="param"
                            tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                            width={26}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
                          <Tooltip content={<Q4Tooltip />} />
                          <Bar dataKey="delta" radius={[2, 2, 2, 2]} isAnimationActive={true}>
                            {instData.map((entry, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={entry.delta >= 0 ? '#10B981' : '#F43F5E'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Q5: Dumbbell Chart ──────────────────────────────────────────── */}
        <div className="flex flex-col h-[560px] p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          {/* Header */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
              Question 5
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Largest Parameter Imbalances (Strongest vs Weakest)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 shrink-0">
            Dumbbell chart showing each institution's highest and lowest parameter scores. Sorted by spread gap descending.
          </p>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
              <span className="text-[11px] text-slate-500 font-semibold">Strongest param</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow" />
              <span className="text-[11px] text-slate-500 font-semibold">Weakest param</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-amber-700 font-bold">Δ = spread gap</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
            {q5Display.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No data available for the selected filters.
              </div>
            ) : (
              <DumbbellChart data={q5Display} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
