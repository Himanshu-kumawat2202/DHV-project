import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  HelpCircle,
  Calendar,
  Building,
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
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, YEARS, CATEGORIES } from '../data/nirfData';
import { calculateRankMovement } from '../utils/statistics';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';
import { getShortInstitutionName, TruncatedYAxisTick } from '../utils/institutionFormatters';

export const RankingTrends: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();
  const { activeTheme } = useChartTheme();

  const [selectedInstId, setSelectedInstId] = useState<string>('jamia-millia');
  const [startYear, setStartYear] = useState<number>(2017);
  const [endYear, setEndYear] = useState<number>(2025);
  const [selectedCategory, setSelectedCategory] = useState<string>(filters.category || 'Overall');

  const selectedInst = INSTITUTIONS.find((i) => i.institution_id === selectedInstId);

  // Q1: Historical trajectory of selected institution
  const instHistory = RANKINGS.filter(
    (r) =>
      r.institution_id === selectedInstId &&
      (selectedCategory === 'All' || r.category === selectedCategory) &&
      r.year >= startYear &&
      r.year <= endYear
  ).sort((a, b) => a.year - b.year);

  const startRec = instHistory[0];
  const endRec = instHistory[instHistory.length - 1];
  const rankMovement = calculateRankMovement(
    startRec ? startRec.rank : null,
    endRec ? endRec.rank : null
  );

  // Q2 & Q3: Rank improvements and declines across all institutions from startYear to endYear
  const movementList = INSTITUTIONS.map((inst) => {
    const rStart = RANKINGS.find(
      (r) =>
        r.institution_id === inst.institution_id &&
        r.year === startYear &&
        (selectedCategory === 'All' || r.category === selectedCategory)
    );
    const rEnd = RANKINGS.find(
      (r) =>
        r.institution_id === inst.institution_id &&
        r.year === endYear &&
        (selectedCategory === 'All' || r.category === selectedCategory)
    );

    if (!rStart || !rEnd) return null;

    const delta = rStart.rank - rEnd.rank; // positive = climbed
    const scoreDelta = Number((rEnd.overall_score - rStart.overall_score).toFixed(2));

    const fullName = inst.institution_name;
    const shortName = getShortInstitutionName(fullName);

    return {
      id: inst.institution_id,
      name: shortName,
      fullName,
      state: inst.state,
      startRank: rStart.rank,
      endRank: rEnd.rank,
      delta,
      scoreDelta,
      startScore: rStart.overall_score,
      endScore: rEnd.overall_score,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const topImprovers = [...movementList]
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 6);

  const topDecliners = [...movementList]
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 6);

  // Q4: Average Score of institutions over time
  const yearlyAverageScores = YEARS.map((yr) => {
    const recs = RANKINGS.filter(
      (r) =>
        r.year === yr &&
        (selectedCategory === 'All' || r.category === selectedCategory)
    );
    const count = recs.length || 1;
    return {
      year: yr,
      'Avg Overall Score': Number(
        (recs.reduce((a, b) => a + b.overall_score, 0) / count).toFixed(2)
      ),
      'Avg TLR': Number((recs.reduce((a, b) => a + b.TLR, 0) / count).toFixed(2)),
      'Avg RPC': Number((recs.reduce((a, b) => a + b.RPC, 0) / count).toFixed(2)),
      'Avg GO': Number((recs.reduce((a, b) => a + b.GO, 0) / count).toFixed(2)),
    };
  });

  // Q5: Top 10 Consistency Analysis (dynamically derived from NIRF dataset respecting category & year filters)
  const validYears = YEARS.filter((y) => y >= startYear && y <= endYear);
  const totalYears = validYears.length;

  const top10Rankings = RANKINGS.filter(
    (r) =>
      r.year >= startYear &&
      r.year <= endYear &&
      (selectedCategory === 'All' || r.category === selectedCategory) &&
      r.rank > 0 &&
      r.rank <= 10
  );

  const instRankMap = new Map<string, typeof RANKINGS>();
  top10Rankings.forEach((r) => {
    const list = instRankMap.get(r.institution_id) || [];
    list.push(r);
    instRankMap.set(r.institution_id, list);
  });

  const top10Consistent = Array.from(instRankMap.entries())
    .map(([id, ranks]) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === id);
      const yearsInTop10 = ranks.length;
      const avgRank = Number(
        (ranks.reduce((s, r) => s + r.rank, 0) / yearsInTop10).toFixed(1)
      );
      const maxRank = Math.max(...ranks.map((r) => r.rank));
      const minRank = Math.min(...ranks.map((r) => r.rank));

      let streak = '';
      if (yearsInTop10 === totalYears && totalYears > 1) {
        if (minRank === 1 && avgRank <= 1.5) {
          streak = `${startYear}–${endYear} (#1 Dominance)`;
        } else {
          streak = `${startYear}–${endYear} (Always Top ${maxRank})`;
        }
      } else {
        streak = `${yearsInTop10} of ${totalYears} years in Top 10`;
      }

      return {
        id,
        name: inst ? inst.short_name : id,
        state: inst ? inst.state : '',
        yearsInTop10,
        avgRank,
        streak,
      };
    })
    .sort((a, b) => b.yearsInTop10 - a.yearsInTop10 || a.avgRank - b.avgRank)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Ranking Trends & Longitudinal Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate time-series ranking trajectories, institutional climb/decline velocities, and consistency over nine years (2017–2025).
          </p>
        </div>

        {/* Contextual Time Range & Institution Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="trend-start-year" className="text-slate-500 font-semibold text-[11px]">From:</label>
            <select
              id="trend-start-year"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} disabled={y >= endYear}>
                  {y}
                </option>
              ))}
            </select>
            <label htmlFor="trend-end-year" className="text-slate-500 font-semibold text-[11px] ml-1">To:</label>
            <select
              id="trend-end-year"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} disabled={y <= startYear}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="trend-category" className="text-slate-500 font-semibold text-[11px]">Category:</label>
            <select
              id="trend-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="trend-inst-select" className="text-slate-500 font-semibold text-[11px]">Institution:</label>
            <select
              id="trend-inst-select"
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="font-bold text-slate-800 outline-none cursor-pointer max-w-[160px] truncate"
            >
              {INSTITUTIONS.map((i) => (
                <option key={i.institution_id} value={i.institution_id}>
                  {i.short_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* QUESTION 1: Selected Institution Multi-Year Trajectory */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                Question 1
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                How has the overall NIRF ranking of {selectedInst?.short_name} changed from {startYear} to {endYear}?
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historical position and overall score trajectory. Note: Rank 1 is the premier national position.
            </p>
          </div>

          {/* Rank Movement Metric Badge */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Net Movement:</span>
              <div className="flex items-center gap-1.5 font-black text-sm">
                {rankMovement.direction === 'improved' ? (
                  <span className="text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-4 h-4" /> +{rankMovement.delta} ranks
                  </span>
                ) : rankMovement.direction === 'declined' ? (
                  <span className="text-rose-600 flex items-center">
                    <ArrowDownRight className="w-4 h-4" /> {rankMovement.delta} ranks
                  </span>
                ) : (
                  <span className="text-slate-600 flex items-center">
                    <Minus className="w-4 h-4" /> Steady
                  </span>
                )}
              </div>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[10px] text-slate-400 block font-semibold">{endYear} Rank:</span>
              <span className="text-sm font-black text-blue-700">#{endRec?.rank ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Dual Chart: Rank (Reversed Y-Axis) + Overall Score */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Rank History Chart with Zoom & Pan */}
          <InteractiveChartCard
            title={`${selectedInst?.short_name} Rank Trajectory`}
            subtitle="Reversed scale: Lower # is Higher Rank. Zoom & pan enabled."
            badge="Question 1A"
            dataLength={instHistory.length}
            seriesList={[
              { key: 'rank', label: `${selectedInst?.short_name} Rank`, color: activeTheme.colors[0] },
            ]}
          >
            {({ theme, isAnimationActive, startIndex, endIndex }) => {
              const visibleData = instHistory.slice(startIndex, endIndex + 1);
              return (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                      <YAxis reversed domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: theme.textMuted }} width={35} />
                      <Tooltip
                        content={
                          <AccessibleChartTooltip
                            titlePrefix="Year"
                            unit="rank"
                            formatter={(val: any) => `#${val} National Rank`}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="rank"
                        name="National Rank"
                        stroke={theme.colors[0]}
                        strokeWidth={theme.strokeWidth}
                        dot={{ r: 4, fill: theme.colors[0] }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={isAnimationActive}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            }}
          </InteractiveChartCard>

          {/* Overall Score Chart with Zoom & Pan */}
          <InteractiveChartCard
            title={`${selectedInst?.short_name} Score Progression`}
            subtitle="Overall composite score trajectory (0–100). Zoom & pan enabled."
            badge="Question 1B"
            dataLength={instHistory.length}
            seriesList={[
              { key: 'overall_score', label: 'Overall Score', color: activeTheme.colors[1] },
            ]}
          >
            {({ theme, isAnimationActive, startIndex, endIndex }) => {
              const visibleData = instHistory.slice(startIndex, endIndex + 1);
              return (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: theme.textMuted }} width={35} />
                      <Tooltip
                        content={
                          <AccessibleChartTooltip
                            titlePrefix="Year"
                            unit="pts"
                            formatter={(val: any) => `${val} points / 100`}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="overall_score"
                        name="Overall Score"
                        stroke={theme.colors[1]}
                        strokeWidth={theme.strokeWidth}
                        dot={{ r: 4, fill: theme.colors[1] }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={isAnimationActive}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            }}
          </InteractiveChartCard>
        </div>
      </div>

      {/* QUESTIONS 2 & 3: Top Improving and Declining Institutions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q2: Top Improvers */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Question 2
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Greatest Improvement in Rank ({startYear} to {endYear})
              </h3>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topImprovers}
                margin={{ left: 20, right: 25, top: 10, bottom: 10 }}
                barCategoryGap="22%"
                barSize={18}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  interval={0}
                  tick={<TruncatedYAxisTick maxChars={18} fill="#334155" />}
                />
                <Tooltip
                  formatter={(val: any) => [`+${val} positions`, 'Rank Climbed']}
                  labelFormatter={(_label: any, payload: any) => payload?.[0]?.payload?.fullName || _label}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar
                  dataKey="delta"
                  fill="#10B981"
                  radius={[0, 6, 6, 0]}
                  onClick={(d) => setInspectInstitutionId((d as any).id)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500">
            <strong>Jamia Millia Islamia</strong> and <strong>KIIT Bhubaneswar</strong> demonstrated the fastest rank acceleration, driven by research output and faculty expansion.
          </p>
        </div>

        {/* Q3: Top Decliners */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                Question 3
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Largest Decline in Ranking ({startYear} to {endYear})
              </h3>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topDecliners}
                margin={{ left: 20, right: 25, top: 10, bottom: 10 }}
                barCategoryGap="22%"
                barSize={18}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  interval={0}
                  tick={<TruncatedYAxisTick maxChars={18} fill="#334155" />}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} positions`, 'Rank Dropped']}
                  labelFormatter={(_label: any, payload: any) => payload?.[0]?.payload?.fullName || _label}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar
                  dataKey="delta"
                  fill="#F43F5E"
                  radius={[6, 0, 0, 6]}
                  onClick={(d) => setInspectInstitutionId((d as any).id)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500">
            <strong>Panjab University</strong> and <strong>SPPU Pune</strong> faced drops in relative ranking due to intensified competition in research publications and outreach scores.
          </p>
        </div>
      </div>

      {/* QUESTION 4: Yearly Average Score Change with Zoom, Pan, and Legend Toggling */}
      <InteractiveChartCard
        title="Question 4: Longitudinal Average Score Change (2017–2025)"
        subtitle="Zoom & pan across cycles. Click series badges in the legend to selectively view or hide metrics."
        badge="Question 4"
        dataLength={yearlyAverageScores.length}
        seriesList={[
          { key: 'Avg Overall Score', label: 'Avg Overall Score', color: activeTheme.colors[0] },
          { key: 'Avg TLR', label: 'Avg Teaching (TLR)', color: activeTheme.colors[1], strokeDasharray: '4 4' },
          { key: 'Avg RPC', label: 'Avg Research (RPC)', color: activeTheme.colors[2], strokeDasharray: '4 4' },
          { key: 'Avg GO', label: 'Avg Graduation (GO)', color: activeTheme.colors[3], strokeDasharray: '4 4' },
        ]}
      >
        {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
          const visibleData = yearlyAverageScores.slice(startIndex, endIndex + 1);
          return (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis domain={[40, 85]} tick={{ fontSize: 11, fill: theme.textMuted }} width={35} />
                    <Tooltip
                      content={
                        <AccessibleChartTooltip
                          titlePrefix="Year"
                          unit="pts"
                        />
                      }
                    />
                    {!hiddenSeries.has('Avg Overall Score') && (
                      <Line
                        type="monotone"
                        dataKey="Avg Overall Score"
                        name="Avg Overall Score"
                        stroke={theme.colors[0]}
                        strokeWidth={theme.strokeWidth}
                        dot={{ r: 4, fill: theme.colors[0] }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('Avg TLR') && (
                      <Line
                        type="monotone"
                        dataKey="Avg TLR"
                        name="Avg Teaching (TLR)"
                        stroke={theme.colors[1]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray={theme.isHighContrast ? '5 5' : '4 4'}
                        dot={{ r: 3.5, fill: theme.colors[1] }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('Avg RPC') && (
                      <Line
                        type="monotone"
                        dataKey="Avg RPC"
                        name="Avg Research (RPC)"
                        stroke={theme.colors[2]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray={theme.isHighContrast ? '3 3' : '4 4'}
                        dot={{ r: 3.5, fill: theme.colors[2] }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('Avg GO') && (
                      <Line
                        type="monotone"
                        dataKey="Avg GO"
                        name="Avg Graduation (GO)"
                        stroke={theme.colors[3]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray={theme.isHighContrast ? '2 2' : '4 4'}
                        dot={{ r: 3.5, fill: theme.colors[3] }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p
                className="text-xs"
                style={{ color: theme.textMuted }}
              >
                The national cohort average overall score increased steadily from <strong>58.4</strong> in 2017 to <strong>65.1</strong> in 2025 (+6.7 points), with Research (RPC) showing the steepest upward trajectory.
              </p>
            </div>
          );
        }}
      </InteractiveChartCard>

      {/* QUESTION 5: Top 10 Consistency Analysis */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
            Question 5
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Which institutions have remained consistently in the top 10 across multiple years?
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-400">
                <th className="pb-3">Institution</th>
                <th className="pb-3">State</th>
                <th className="pb-3 text-center">Years in Top 10</th>
                <th className="pb-3 text-center">Average Rank</th>
                <th className="pb-3 text-right">Consistency Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top10Consistent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No top-10 ranking records found for the selected category and year range.
                  </td>
                </tr>
              ) : (
                top10Consistent.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setInspectInstitutionId(c.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>{c.name}</span>
                    </td>
                    <td className="py-3 text-slate-500">{c.state}</td>
                    <td className="py-3 text-center font-bold text-blue-700">
                      {c.yearsInTop10} of {totalYears} Year{totalYears > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 text-center text-slate-700">#{c.avgRank}</td>
                    <td className="py-3 text-right font-medium text-emerald-700">{c.streak}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
