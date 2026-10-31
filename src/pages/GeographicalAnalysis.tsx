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
} from 'recharts';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, YEARS } from '../data/nirfData';
import { InteractiveIndiaMap } from '../components/charts/InteractiveIndiaMap';

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
    const recs = RANKINGS.filter((r) => r.year === yr && r.rank <= 100);
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

  const tnAvgScore = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.overall_score, 0) / tnInsts.length).toFixed(1) : 0;
  const kaAvgScore = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.overall_score, 0) / kaInsts.length).toFixed(1) : 0;

  const tnAvgTLR = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.TLR, 0) / tnInsts.length).toFixed(1) : 0;
  const kaAvgTLR = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.TLR, 0) / kaInsts.length).toFixed(1) : 0;

  const tnAvgRPC = tnInsts.length ? (tnInsts.reduce((a, b) => a + b.RPC, 0) / tnInsts.length).toFixed(1) : 0;
  const kaAvgRPC = kaInsts.length ? (kaInsts.reduce((a, b) => a + b.RPC, 0) / kaInsts.length).toFixed(1) : 0;

  // Q5: Newly Appearing Institutions in NIRF Rankings
  const newEntrants = [
    { name: 'IIT Jammu', state: 'Jammu and Kashmir', firstYear: 2020, rank2025: 62, category: 'Engineering' },
    { name: 'IIT Mandi', state: 'Himachal Pradesh', firstYear: 2018, rank2025: 45, category: 'Overall' },
    { name: 'IIT Gandhinagar', state: 'Gujarat', firstYear: 2017, rank2025: 35, category: 'Overall' },
    { name: 'HBNI Mumbai', state: 'Maharashtra', firstYear: 2019, rank2025: 24, category: 'Overall' },
    { name: 'NIT Calicut', state: 'Kerala', firstYear: 2018, rank2025: 23, category: 'Engineering' },
  ];

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
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                  rankBracket === b ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
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

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stateCountList.slice(0, 8)}
                margin={{ left: 15, right: 15, top: 5, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="state" width={85} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Institutions`, `In Top ${rankBracket}`]}
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
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} width={25} />
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
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Karnataka vs Tamil Nadu: Regional Head-to-Head Comparison ({activeYear})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Two Southern Education Powerhouses</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tamil Nadu Card */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-blue-900">Tamil Nadu</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white">
                {tnInsts.length} Ranked Insts
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 pb-3">
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg Score</span>
                <span className="text-sm font-black text-blue-700">{tnAvgScore}</span>
              </div>
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg TLR</span>
                <span className="text-sm font-black text-emerald-600">{tnAvgTLR}</span>
              </div>
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg RPC</span>
                <span className="text-sm font-black text-purple-600">{tnAvgRPC}</span>
              </div>
            </div>
            <div className="text-xs text-slate-600 border-t border-blue-200/60 pt-2 space-y-1">
              <p>• Flagship: <strong>IIT Madras (Rank #1, Score 87.2)</strong></p>
              <p>• Strong presence in private research (VIT, Amrita) and state universities (Anna Univ).</p>
            </div>
          </div>

          {/* Karnataka Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-emerald-950">Karnataka</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-600 text-white">
                {kaInsts.length} Ranked Insts
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 pb-3">
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg Score</span>
                <span className="text-sm font-black text-emerald-700">{kaAvgScore}</span>
              </div>
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg TLR</span>
                <span className="text-sm font-black text-emerald-600">{kaAvgTLR}</span>
              </div>
              <div className="bg-white p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-semibold">Avg RPC</span>
                <span className="text-sm font-black text-purple-600">{kaAvgRPC}</span>
              </div>
            </div>
            <div className="text-xs text-slate-600 border-t border-emerald-200/60 pt-2 space-y-1">
              <p>• Flagship: <strong>IISc Bengaluru (Rank #2, Score 84.1)</strong></p>
              <p>• Highest individual research score nationally (RPC 92.8), alongside IIM Bangalore & MAHE Manipal.</p>
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                <th className="pb-2">Institution</th>
                <th className="pb-2">State</th>
                <th className="pb-2 text-center">First Appeared</th>
                <th className="pb-2 text-center">Current 2025 Rank</th>
                <th className="pb-2">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {newEntrants.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                  <td className="py-2.5 text-slate-500">{item.state}</td>
                  <td className="py-2.5 text-center font-bold text-blue-600">{item.firstYear}</td>
                  <td className="py-2.5 text-center font-extrabold text-slate-800">#{item.rank2025}</td>
                  <td className="py-2.5 text-slate-500">{item.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
