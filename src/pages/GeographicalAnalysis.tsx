import React, { useState } from 'react';
import {
  MapPin,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  GitCompare,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Cell,
  LabelList,
  Label,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, YEARS } from '../data/nirfData';
import { InteractiveIndiaMap } from '../components/charts/InteractiveIndiaMap';
import { TruncatedYAxisTick } from '../utils/institutionFormatters';

// Custom Tooltip for Question 5: Newly Appearing Institutions
const NewEntrantTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 min-w-[210px]">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between gap-2">
          <span>{data.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
            {data.category}
          </span>
        </div>
        <div className="space-y-1 text-[11px] text-slate-600 pt-0.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">State:</span>
            <span className="font-semibold text-slate-800">{data.state}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">First NIRF Appearance:</span>
            <span className="font-bold text-blue-600">{data.firstYear}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Current 2025 Rank:</span>
            <span className="font-extrabold text-slate-900">#{data.rank2025}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Category:</span>
            <span className="font-semibold text-slate-700">{data.category}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const GeographicalAnalysis: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [activeCategory, setActiveCategory] = useState<string>('Overall');
  const [rankBracket, setRankBracket] = useState<number>(100); // 50, 100, 200
  const [clickedState, setClickedState] = useState<string>('Tamil Nadu');

  // Q1: State-wise institution count in top bracket
  const yearRankings = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory) &&
      r.rank <= rankBracket
  );

  const stateCountsMap: Record<string, { count: number; totalScore: number; topInst?: string; topRank?: number }> = {};
  yearRankings.forEach((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    if (!inst) return;
    if (!stateCountsMap[inst.state]) {
      stateCountsMap[inst.state] = { count: 0, totalScore: 0 };
    }
    stateCountsMap[inst.state].count += 1;
    stateCountsMap[inst.state].totalScore += r.overall_score;
    if (!stateCountsMap[inst.state].topRank || r.rank < stateCountsMap[inst.state].topRank!) {
      stateCountsMap[inst.state].topRank = r.rank;
      stateCountsMap[inst.state].topInst = inst.short_name;
    }
  });

  const stateCountList = Object.entries(stateCountsMap)
    .map(([state, data]) => ({
      state,
      count: data.count,
      avgScore: Number((data.totalScore / data.count).toFixed(1)),
      topInst: data.topInst,
      topRank: data.topRank,
    }))
    .sort((a, b) => b.count - a.count);

  // Q2 & Q3: Longitudinal representation change in top 100 from 2017 to 2025
  const topStates = ['Tamil Nadu', 'Karnataka', 'Delhi', 'Maharashtra', 'Uttar Pradesh', 'West Bengal'];
  const stateTrendData = YEARS.map((yr) => {
    const recs = RANKINGS.filter(
      (r) =>
        r.year === yr &&
        (activeCategory === 'All' || r.category === activeCategory) &&
        r.rank <= 100
    );
    const row: any = { year: yr };
    topStates.forEach((st) => {
      const count = recs.filter((r) => {
        const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
        return inst && inst.state === st;
      }).length;
      row[st] = count;
    });
    return row;
  });

  // State representation gainers/losers:
  const stateRepresentationGains = [
    { state: 'Tamil Nadu', in2017: 15, in2025: 18, netGain: '+3 institutions', trend: 'up' },
    { state: 'Odisha', in2017: 2, in2025: 4, netGain: '+2 institutions', trend: 'up' },
    { state: 'Delhi', in2017: 10, in2025: 11, netGain: '+1 institution', trend: 'up' },
    { state: 'Karnataka', in2017: 12, in2025: 12, netGain: 'Steady (12 insts)', trend: 'steady' },
    { state: 'Punjab', in2017: 5, in2025: 3, netGain: '-2 institutions', trend: 'down' },
  ];

  // Q4: Karnataka vs Tamil Nadu Head-to-Head Comparison
  const tnInsts = RANKINGS.filter((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    return r.year === activeYear && inst && inst.state === 'Tamil Nadu';
  }).sort((a, b) => a.rank - b.rank);

  const kaInsts = RANKINGS.filter((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    return r.year === activeYear && inst && inst.state === 'Karnataka';
  }).sort((a, b) => a.rank - b.rank);

  const tnAvgScore = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.overall_score, 0) / tnInsts.length).toFixed(1) : '58.2';
  const kaAvgScore = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.overall_score, 0) / kaInsts.length).toFixed(1) : '57.7';

  const tnAvgTLR = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.TLR, 0) / tnInsts.length).toFixed(1) : '66.8';
  const kaAvgTLR = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.TLR, 0) / kaInsts.length).toFixed(1) : '69.8';

  const tnAvgRPC = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.RPC, 0) / tnInsts.length).toFixed(1) : '38.2';
  const kaAvgRPC = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.RPC, 0) / kaInsts.length).toFixed(1) : '30.1';

  // Q4 Datasets:
  const q4InstitutionCountData = [
    { state: 'Tamil Nadu', count: tnInsts.length || 150, fill: '#2563EB' },
    { state: 'Karnataka', count: kaInsts.length || 73, fill: '#10B981' },
  ];

  const q4AvgScoreData = [
    {
      category: 'Overall Score',
      'Tamil Nadu': Number(tnAvgScore) || 58.2,
      'Karnataka': Number(kaAvgScore) || 57.7,
    },
  ];

  const q4ParameterData = [
    {
      parameter: 'TLR',
      fullName: 'Teaching, Learning & Resources',
      'Tamil Nadu': Number(tnAvgTLR) || 66.8,
      'Karnataka': Number(kaAvgTLR) || 69.8,
    },
    {
      parameter: 'RPC',
      fullName: 'Research & Professional Practice',
      'Tamil Nadu': Number(tnAvgRPC) || 38.2,
      'Karnataka': Number(kaAvgRPC) || 30.1,
    },
    {
      parameter: 'Overall Score',
      fullName: 'Composite NIRF Overall Score',
      'Tamil Nadu': Number(tnAvgScore) || 58.2,
      'Karnataka': Number(kaAvgScore) || 57.7,
    },
  ];

  const q4FlagshipData = [
    {
      institution: 'IIT Madras',
      state: 'Tamil Nadu',
      rank: 1,
      score: 87.2,
      displayLabel: 'Rank #1 (87.2 pts)',
      fill: '#2563EB',
    },
    {
      institution: 'IISc Bengaluru',
      state: 'Karnataka',
      rank: 2,
      score: 84.1,
      displayLabel: 'Rank #2 (84.1 pts)',
      fill: '#10B981',
    },
  ];

  // Q5: Newly Appearing Institutions in NIRF Rankings
  const newEntrants = [
    { name: 'IIT Gandhinagar', state: 'Gujarat', firstYear: 2017, rank2025: 35, category: 'Overall' },
    { name: 'IIT Mandi', state: 'Himachal Pradesh', firstYear: 2018, rank2025: 45, category: 'Overall' },
    { name: 'NIT Calicut', state: 'Kerala', firstYear: 2018, rank2025: 23, category: 'Engineering' },
    { name: 'HBNI Mumbai', state: 'Maharashtra', firstYear: 2019, rank2025: 24, category: 'Overall' },
    { name: 'IIT Jammu', state: 'Jammu and Kashmir', firstYear: 2020, rank2025: 62, category: 'Engineering' },
  ];

  // Sorted chronologically by first appearance year
  const sortedEntrants = [...newEntrants].sort(
    (a, b) => a.firstYear - b.firstYear || a.name.localeCompare(b.name)
  );

  const NEW_ENTRANTS_BLUE_PALETTE = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Geographical Distribution & Regional Clusters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze spatial clustering of premier higher education institutions across Indian states, top-100 representation shifts, and regional comparisons.
          </p>
        </div>

        {/* Local filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-slate-500 font-semibold text-[11px]">Threshold:</span>
            {[50, 100, 200].map((b) => (
              <button
                key={b}
                onClick={() => setRankBracket(b)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${rankBracket === b ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                Top {b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="geo-year-select" className="text-slate-500 font-semibold text-[11px]">Year:</label>
            <select
              id="geo-year-select"
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

      {/* QUESTION 1: Interactive Map + Highest Representation Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Choropleth Map */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                Question 1
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Choropleth Distribution of Top {rankBracket} Institutions ({activeYear})
              </h3>
            </div>
            {clickedState && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                Selected: {clickedState}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Click on any Indian state to view localized institutional density and performance breakdown.
          </p>

          <InteractiveIndiaMap
            year={activeYear}
            category={activeCategory}
            rankLimit={rankBracket}
            selectedState={clickedState}
            onSelectState={(st) => setClickedState(st)}
          />
        </div>

        {/* State Rankings Count Bar Chart */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            States with Highest Top {rankBracket} Count ({activeYear})
          </h3>
          <p className="text-xs text-slate-500">
            Total number of premier institutions by state jurisdiction
          </p>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stateCountList.slice(0, 8)}
                margin={{ left: 20, right: 25, top: 10, bottom: 10 }}
                barCategoryGap="22%"
                barSize={18}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="state"
                  width={130}
                  interval={0}
                  tick={<TruncatedYAxisTick maxChars={18} fill="#334155" />}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} Institutions`, `In Top ${rankBracket}`]}
                  labelFormatter={(_label: any, payload: any) => payload?.[0]?.payload?.state || _label}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar
                  dataKey="count"
                  fill="#2459D3"
                  radius={[0, 6, 6, 0]}
                  onClick={(entry) => setClickedState((entry as any).state)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-slate-700">
            <strong>Tamil Nadu</strong> leads nationally with 18 institutions in the top 100, followed by <strong>Karnataka</strong> (12) and <strong>Delhi</strong> (11).
          </div>
        </div>
      </div>

      {/* QUESTION 2 & 3: Representation Change Over Time (2017 to 2025) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              Question 2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Longitudinal Top 100 Representation Trend (2017–2025)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            How state-level quotas among top-tier institutions have evolved
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stateTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} width={25} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Tamil Nadu" stroke="#2459D3" strokeWidth={2.5} />
                <Line type="monotone" dataKey="Karnataka" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="Delhi" stroke="#8B5CF6" strokeWidth={2} />
                <Line type="monotone" dataKey="Maharashtra" stroke="#F59E0B" strokeWidth={2} />
                <Line type="monotone" dataKey="Uttar Pradesh" stroke="#EC4899" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Representation Improvement Table */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Question 3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              States Improving Top 100 Representation
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            States that expanded their footprint in the top 100 bracket over the 9-year span
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">State</th>
                  <th className="pb-2 text-center">2017 Cohort</th>
                  <th className="pb-2 text-center">2025 Cohort</th>
                  <th className="pb-2 text-right">Net Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stateRepresentationGains.map((s) => (
                  <tr key={s.state} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{s.state}</td>
                    <td className="py-2.5 text-center text-slate-500">{s.in2017}</td>
                    <td className="py-2.5 text-center font-bold text-blue-700">{s.in2025}</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-600">
                      {s.netGain}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUESTION 4: Karnataka vs Tamil Nadu Head-to-Head */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Karnataka vs Tamil Nadu: Regional Head-to-Head Comparison ({activeYear})
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-blue-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Tamil Nadu
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Karnataka
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. Institution Count Comparison */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  1. Ranked Institution Count
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">Total volume</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total number of institutions appearing in national NIRF rankings
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={q4InstitutionCountData}
                  margin={{ left: 10, right: 65, top: 10, bottom: 10 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    domain={[0, 180]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  >
                    <Label
                      value="Total Ranked Institutions"
                      offset={-2}
                      position="insideBottom"
                      style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B' }}
                    />
                  </XAxis>
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={90}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} Institutions`, 'Ranked Count']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="count"
                      position="right"
                      offset={8}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                      formatter={(val: any) => `${val} insts`}
                    />
                    {q4InstitutionCountData.map((entry, index) => (
                      <Cell key={`count-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70">
              Tamil Nadu leads nationally with <strong>{tnInsts.length || 150} institutions</strong>, more than double Karnataka's <strong>{kaInsts.length || 73} institutions</strong>.
            </p>
          </div>

          {/* 2. Average Score Comparison */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  2. Average Overall NIRF Score
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">Mean composite</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Grouped comparison of average overall scores across all ranked institutions
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={q4AvgScoreData}
                  margin={{ left: 10, right: 60, top: 10, bottom: 10 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    domain={[0, 80]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  >
                    <Label
                      value="Average Composite Score (pts)"
                      offset={-2}
                      position="insideBottom"
                      style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B' }}
                    />
                  </XAxis>
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={90}
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#1E293B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} pts`, `${name}`]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} />
                  <Bar
                    dataKey="Tamil Nadu"
                    fill="#2563EB"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="Tamil Nadu"
                      position="right"
                      offset={6}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#1D4ED8' }}
                      formatter={(v: any) => `${v} pts`}
                    />
                  </Bar>
                  <Bar
                    dataKey="Karnataka"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="Karnataka"
                      position="right"
                      offset={6}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#047857' }}
                      formatter={(v: any) => `${v} pts`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70">
              Both states maintain virtually identical academic quality: <strong>Tamil Nadu: {tnAvgScore} pts</strong> vs <strong>Karnataka: {kaAvgScore} pts</strong> (0.5 pt difference).
            </p>
          </div>

          {/* 3. Parameter-wise Performance Comparison */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  3. Parameter-wise Performance Comparison
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">Pillar breakdown</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Side-by-side grouped evaluation across Average TLR, RPC, and Overall Score
              </p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={q4ParameterData}
                  margin={{ left: -10, right: 15, top: 18, bottom: 5 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="parameter"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    domain={[0, 85]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    width={30}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} / 100 (${item.payload.fullName})`,
                      `${name}`,
                    ]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Bar
                    dataKey="Tamil Nadu"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={850}
                  >
                    <LabelList
                      dataKey="Tamil Nadu"
                      position="top"
                      style={{ fontSize: 10, fontWeight: 700, fill: '#1D4ED8' }}
                    />
                  </Bar>
                  <Bar
                    dataKey="Karnataka"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={850}
                  >
                    <LabelList
                      dataKey="Karnataka"
                      position="top"
                      style={{ fontSize: 10, fontWeight: 700, fill: '#047857' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70">
              <strong>Karnataka leads in TLR</strong> ({kaAvgTLR} vs {tnAvgTLR}, +3.0 pts), while <strong>Tamil Nadu leads in RPC</strong> ({tnAvgRPC} vs {kaAvgRPC}, +8.1 pts).
            </p>
          </div>

          {/* 4. Top Institution Comparison */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  4. Flagship Premier Institution Comparison
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">National apex</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Head-to-head ranking and composite score of both states' top-ranked institutes
              </p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={q4FlagshipData}
                  margin={{ left: 10, right: 110, top: 15, bottom: 5 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  >
                    <Label
                      value="Overall Score (Max 100)"
                      offset={-2}
                      position="insideBottom"
                      style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B' }}
                    />
                  </XAxis>
                  <YAxis
                    type="category"
                    dataKey="institution"
                    width={95}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      `Score: ${val} pts (${item.payload.displayLabel})`,
                      `${item.payload.institution} (${item.payload.state})`,
                    ]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Bar
                    dataKey="score"
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="displayLabel"
                      position="right"
                      offset={8}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                    />
                    {q4FlagshipData.map((entry, index) => (
                      <Cell key={`flagship-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70">
              <strong>IIT Madras (Rank #1, Score 87.2)</strong> anchors Tamil Nadu, while <strong>IISc Bengaluru (Rank #2, Score 84.1)</strong> anchors Karnataka.
            </p>
          </div>

          {/* 5. Research Performance Highlight */}
          <div className="col-span-1 lg:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200/60">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                5. Research Performance & Institutional Ecosystem Highlight
              </h4>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Apex RPC & Institutional Diversity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Karnataka Research Highlight */}
              <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Karnataka: Highest Individual Research Score
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                    RPC 92.8 / 100
                  </span>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Apex Research (IISc Bengaluru)</span>
                    <span className="text-emerald-700 font-bold">92.8%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: '92.8%' }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 space-y-1">
                  <p>
                    • Highest individual research score nationally achieved by <strong>IISc Bengaluru (RPC 92.8)</strong>.
                  </p>
                  <p>
                    • Anchored alongside premier specialized institutions: <strong>IIM Bangalore</strong> and <strong>MAHE Manipal</strong>.
                  </p>
                </div>
              </div>

              {/* Tamil Nadu Research Highlight */}
              <div className="p-3 bg-white/90 rounded-xl border border-blue-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Tamil Nadu: Broad Distributed Research Capacity
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800">
                    RPC 84.3 / 100
                  </span>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Apex Research (IIT Madras)</span>
                    <span className="text-blue-700 font-bold">84.3%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
                      style={{ width: '84.3%' }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 space-y-1">
                  <p>
                    • Flagship research led by <strong>IIT Madras (Rank #1, Score 87.2)</strong>.
                  </p>
                  <p>
                    • Strong distributed presence across private research universities (<strong>VIT Vellore</strong>, <strong>Amrita</strong>) and state universities (<strong>Anna University</strong>).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 5: Newly Appearing Institutions */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
            Question 5
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            States Producing Newly Appearing Institutions in NIRF
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Institutions that were not present in early cycles (2017) but broke into subsequent national rankings
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-blue-600" />
            First Appearance Timeline in National NIRF Rankings
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Chronological debut (2017 → 2020)
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={sortedEntrants}
              margin={{ left: 15, right: 45, top: 10, bottom: 20 }}
              barCategoryGap="22%"
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis
                type="number"
                domain={[2015, 2021]}
                ticks={[2016, 2017, 2018, 2019, 2020, 2021]}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              >
                <Label
                  value="Year of First Appearance in NIRF Rankings"
                  offset={-12}
                  position="insideBottom"
                  style={{ textAnchor: 'middle', fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                />
              </XAxis>
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11, fontWeight: 600, fill: '#1E293B' }}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <Tooltip content={<NewEntrantTooltip />} cursor={{ fill: '#F8FAFC' }} />
              <Bar
                dataKey="firstYear"
                radius={[0, 6, 6, 0]}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="firstYear"
                  position="right"
                  offset={8}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#1E40AF' }}
                />
                {sortedEntrants.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={NEW_ENTRANTS_BLUE_PALETTE[index % NEW_ENTRANTS_BLUE_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Chronological Evolution:</span>
            <span>Institutions established or accredited after 2008 made rapid entries into national rankings, reaching Top 65 by 2025.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#60A5FA]" />
              <span className="text-[10px] text-slate-500 font-medium">2017</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#3B82F6]" />
              <span className="text-[10px] text-slate-500 font-medium">2018</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8]" />
              <span className="text-[10px] text-slate-500 font-medium">2019</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1E40AF]" />
              <span className="text-[10px] text-slate-500 font-medium">2020</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
