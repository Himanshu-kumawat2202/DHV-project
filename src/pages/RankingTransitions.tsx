import React, { useState } from 'react';
import {
  Shuffle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  ArrowRight,
  LogIn,
  LogOut,
  Calendar,
} from 'lucide-react';
import {
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
import { INSTITUTIONS, RANKINGS, YEARS } from '../data/nirfData';
import { getRankBand, calculateRankMovement } from '../utils/statistics';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

const DEFAULT_BANDS = ['1–10', '11–50', '51–100', '101–200', '201+'];

export const RankingTransitions: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();
  const { activeTheme } = useChartTheme();

  const [fromYear, setFromYear] = useState<number>(2020);
  const [toYear, setToYear] = useState<number>(2025);
  const [selectedBandFilter, setSelectedBandFilter] = useState<string>('All');

  // Compute transition items
  const transitionItems = INSTITUTIONS.map((inst) => {
    const rFrom = RANKINGS.find(
      (r) => r.institution_id === inst.institution_id && r.year === fromYear
    );
    const rTo = RANKINGS.find(
      (r) => r.institution_id === inst.institution_id && r.year === toYear
    );

    const fromRank = rFrom ? rFrom.rank : null;
    const toRank = rTo ? rTo.rank : null;

    if (!fromRank && !toRank) return null;

    const fromBand = getRankBand(fromRank);
    const toBand = getRankBand(toRank);

    const move = calculateRankMovement(fromRank, toRank);

    return {
      id: inst.institution_id,
      name: inst.short_name,
      state: inst.state,
      fromRank,
      toRank,
      fromBand,
      toBand,
      delta: move.delta,
      direction: move.direction,
      retainedBand: fromBand === toBand,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Q1: Count and list of institutions moving from 51–100 into top 50
  const moved51To100IntoTop50 = transitionItems.filter(
    (item) => item.fromBand === '51–100' && (item.toBand === '1–10' || item.toBand === '11–50')
  );

  // Q2: Top 10 Entries and Exits
  const enteredTop10 = transitionItems.filter(
    (item) => item.fromBand !== '1–10' && item.toBand === '1–10'
  );

  const exitedTop10 = transitionItems.filter(
    (item) => item.fromBand === '1–10' && item.toBand !== '1–10'
  );

  // Q3: Percentage remaining in same band
  const totalWithBothYears = transitionItems.filter(
    (item) => item.fromRank !== null && item.toRank !== null
  );
  const retainedSameBandCount = totalWithBothYears.filter((item) => item.retainedBand).length;
  const retainedPct = totalWithBothYears.length
    ? ((retainedSameBandCount / totalWithBothYears.length) * 100).toFixed(1)
    : 0;

  // Q4: Largest upward and downward movements
  const topUpward = [...transitionItems]
    .filter((t) => t.delta !== null && t.delta > 0)
    .sort((a, b) => (b.delta || 0) - (a.delta || 0))
    .slice(0, 5);

  const topDownward = [...transitionItems]
    .filter((t) => t.delta !== null && t.delta < 0)
    .sort((a, b) => (a.delta || 0) - (b.delta || 0))
    .slice(0, 5);

  // Q5: Annual Movement Dynamics Chart (Moved Up, Moved Down, Retained)
  const annualDynamics = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((yr) => {
    const prevYr = yr - 1;
    let up = 0;
    let down = 0;
    let steady = 0;

    INSTITUTIONS.forEach((inst) => {
      const p = RANKINGS.find((r) => r.institution_id === inst.institution_id && r.year === prevYr);
      const c = RANKINGS.find((r) => r.institution_id === inst.institution_id && r.year === yr);
      if (p && c) {
        if (p.rank > c.rank) up += 1;
        else if (p.rank < c.rank) down += 1;
        else steady += 1;
      }
    });

    return {
      year: yr,
      'Moved Up': up,
      'Moved Down': down,
      'Retained Rank': steady,
    };
  });

  // 5x5 Rank Band Transition Matrix
  const transitionMatrix: Record<string, Record<string, number>> = {};
  DEFAULT_BANDS.forEach((b1) => {
    transitionMatrix[b1] = {};
    DEFAULT_BANDS.forEach((b2) => {
      transitionMatrix[b1][b2] = 0;
    });
  });

  totalWithBothYears.forEach((item) => {
    if (transitionMatrix[item.fromBand] && transitionMatrix[item.fromBand][item.toBand] !== undefined) {
      transitionMatrix[item.fromBand][item.toBand] += 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-600" />
            Ranking Transitions & Band Mobility Dynamics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze institutional mobility between categorical rank bands, threshold crossings into Top 50/Top 10, and stability indices.
          </p>
        </div>

        {/* Transition Year Pair Selector */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="trans-base-year" className="text-slate-500 font-semibold text-[11px]">Base Year:</label>
            <select
              id="trans-base-year"
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} disabled={y >= toYear}>
                  {y}
                </option>
              ))}
            </select>
            <label htmlFor="trans-target-year" className="text-slate-500 font-semibold text-[11px] ml-1">Target Year:</label>
            <select
              id="trans-target-year"
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} disabled={y <= fromYear}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">51–100 → Top 50 Crossers</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {moved51To100IntoTop50.length} Institutions
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Broke through from 51–100 into top 50 between {fromYear} & {toYear}
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Band Stability Index</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {retainedPct}% Retained
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {retainedSameBandCount} of {totalWithBothYears.length} institutions stayed in the same rank tier
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Top 10 Churn</span>
          <div className="text-2xl font-black text-purple-700 mt-1">
            +{enteredTop10.length} In / -{exitedTop10.length} Out
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Net changes in the highest tier between {fromYear} & {toYear}
          </span>
        </div>
      </div>

      {/* QUESTION 1: Institutions moving from 51–100 to Top 50 */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
            Question 1
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            How many institutions moved from the 51–100 band into the top 50 between {fromYear} and {toYear}?
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Institutions achieving significant upward mobility across the crucial Top 50 boundary
        </p>

        {moved51To100IntoTop50.length === 0 ? (
          <div className="p-6 bg-slate-50 text-center text-xs text-slate-400 rounded-2xl">
            No institutions crossed from 51–100 into top 50 between {fromYear} and {toYear}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {moved51To100IntoTop50.map((item) => (
              <div
                key={item.id}
                onClick={() => setInspectInstitutionId(item.id)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                  <p className="text-[10px] text-slate-500">{item.state}</p>
                  <span className="text-[11px] text-blue-700 font-semibold mt-1 block">
                    #{item.fromRank} ({fromYear}) → #{item.toRank} ({toYear})
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                    +{item.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUESTION 2: Top 10 Entries and Exits Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
            Question 2
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Institutions Entering or Exiting the Top 10 ({fromYear} vs {toYear})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Entered Top 10 */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <LogIn className="w-4 h-4 text-emerald-600" />
              Entered Top 10 ({enteredTop10.length})
            </span>
            {enteredTop10.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No new entries to the top 10 between selected years.</p>
            ) : (
              <div className="space-y-1.5">
                {enteredTop10.map((item) => (
                  <div key={item.id} className="p-2 bg-white rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-slate-800">{item.name}</strong>
                      <span className="text-[10px] text-slate-500 block">From #{item.fromRank} in {fromYear}</span>
                    </div>
                    <span className="font-extrabold text-emerald-600">Now #{item.toRank}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exited Top 10 */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2">
            <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-rose-600" />
              Exited Top 10 ({exitedTop10.length})
            </span>
            {exitedTop10.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No institutions dropped out of the top 10 in this window.</p>
            ) : (
              <div className="space-y-1.5">
                {exitedTop10.map((item) => (
                  <div key={item.id} className="p-2 bg-white rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-slate-800">{item.name}</strong>
                      <span className="text-[10px] text-slate-500 block">Was #{item.fromRank} in {fromYear}</span>
                    </div>
                    <span className="font-extrabold text-rose-600">Dropped to #{item.toRank}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RANK BAND TRANSITION MATRIX (Heatmap Table) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Rank Band Transition Flow Matrix ({fromYear} Band → {toYear} Band)
        </h3>
        <p className="text-xs text-slate-500">
          Diagonal cells indicate institutions retaining their rank bracket; upper/lower cells indicate promotions or demotions
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-2.5 text-left text-slate-500 font-bold">
                  {fromYear} \ {toYear}
                </th>
                {DEFAULT_BANDS.map((b) => (
                  <th key={`head-${b}`} className="p-2.5 font-bold text-slate-700">
                    {b} Band
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_BANDS.map((bFrom) => (
                <tr key={`row-${bFrom}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2.5 text-left font-bold text-slate-800">
                    {bFrom} Band
                  </td>
                  {DEFAULT_BANDS.map((bTo) => {
                    const count = transitionMatrix[bFrom]?.[bTo] || 0;
                    const isDiagonal = bFrom === bTo;
                    return (
                      <td key={`cell-${bFrom}-${bTo}`} className="p-2">
                        <span
                          className={`inline-block py-1 px-3 rounded-lg font-bold text-xs ${
                            count === 0
                              ? 'text-slate-300'
                              : isDiagonal
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-indigo-100 text-indigo-900'
                          }`}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUESTION 4 & 5: Largest Movers & Annual Dynamics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Q4: Largest Upward & Downward Movements */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Largest Rank Movements ({fromYear}–{toYear})
            </h3>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-emerald-700 block">Top Upward Climbers:</span>
            {topUpward.map((item) => (
              <div key={item.id} className="p-2 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-800">{item.name}</span>
                <span className="font-extrabold text-emerald-600">+{item.delta} ranks (#{item.fromRank} → #{item.toRank})</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-rose-700 block">Top Downward Movers:</span>
            {topDownward.map((item) => (
              <div key={item.id} className="p-2 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                <span className="font-semibold text-slate-800">{item.name}</span>
                <span className="font-extrabold text-rose-600">{item.delta} ranks (#{item.fromRank} → #{item.toRank})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Q5: Year-by-Year Transition Dynamics (Moved Up / Down / Retained) */}
        <div className="lg:col-span-7">
          <InteractiveChartCard
            title="Question 5: Year-over-Year Movement Dynamics"
            subtitle="Number of institutions moving up, declining, or maintaining position. Zoom, pan, and click legend to isolate dynamics."
            badge="Question 5"
            dataLength={annualDynamics.length}
            seriesList={[
              { key: 'Moved Up', label: 'Moved Up', color: '#10B981' },
              { key: 'Moved Down', label: 'Moved Down', color: '#F43F5E' },
              { key: 'Retained Rank', label: 'Retained Rank', color: activeTheme.colors[0] },
            ]}
          >
            {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
              const visibleData = annualDynamics.slice(startIndex, endIndex + 1);
              return (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visibleData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                      <YAxis tick={{ fontSize: 11, fill: theme.textMuted }} />
                      <Tooltip
                        content={
                          <AccessibleChartTooltip
                            titlePrefix="Transition Cycle:"
                            unit="institutions"
                            formatter={(val: any) => `${val} institutions`}
                          />
                        }
                      />
                      {!hiddenSeries.has('Moved Up') && (
                        <Bar
                          dataKey="Moved Up"
                          name="Moved Up"
                          fill="#10B981"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={isAnimationActive}
                        />
                      )}
                      {!hiddenSeries.has('Moved Down') && (
                        <Bar
                          dataKey="Moved Down"
                          name="Moved Down"
                          fill="#F43F5E"
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={isAnimationActive}
                        />
                      )}
                      {!hiddenSeries.has('Retained Rank') && (
                        <Bar
                          dataKey="Retained Rank"
                          name="Retained Rank"
                          fill={theme.colors[0]}
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={isAnimationActive}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            }}
          </InteractiveChartCard>
        </div>
      </div>
    </div>
  );
};
