import React, { useState } from 'react';
import {
  AlertTriangle,
  Sliders,
  Sparkles,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Info,
  CheckCircle,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { RANKINGS, INSTITUTIONS, YEARS } from '../data/nirfData';
import {
  calculatePearsonCorrelation,
  calculateStatsSummary,
  calculateZScore,
  calculateStandardDeviation,
} from '../utils/statistics';

export const OutlierDetection: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [zThreshold, setZThreshold] = useState<number>(1.8); // 1.5, 1.8, 2.0, 2.5

  const records = RANKINGS.filter((r) => r.year === activeYear);

  // Q1: Unusually high research scores relative to overall scores (Residuals from regression)
  const rpcVals = records.map((r) => r.RPC);
  const overallVals = records.map((r) => r.overall_score);
  const { slope, intercept } = calculatePearsonCorrelation(overallVals, rpcVals);

  const residualsWithData = records.map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    const expectedRPC = slope * r.overall_score + intercept;
    const residual = r.RPC - expectedRPC;
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      rank: r.rank,
      overall_score: r.overall_score,
      RPC: r.RPC,
      expectedRPC: Number(expectedRPC.toFixed(1)),
      residual: Number(residual.toFixed(1)),
    };
  });

  const resValues = residualsWithData.map((d) => d.residual);
  const resStats = calculateStatsSummary(resValues);

  const q1Outliers = residualsWithData
    .map((d) => {
      const z = calculateZScore(d.residual, resStats.mean, resStats.stdDev);
      return { ...d, zScore: z };
    })
    .filter((d) => Math.abs(d.zScore) >= zThreshold)
    .sort((a, b) => b.residual - a.residual);

  // Q2: Substantially better in research than in teaching (RPC - TLR disparity)
  const disparityList = records.map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    const diff = Number((r.RPC - r.TLR).toFixed(1));
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      rank: r.rank,
      RPC: r.RPC,
      TLR: r.TLR,
      diff,
    };
  });

  const diffStats = calculateStatsSummary(disparityList.map((d) => d.diff));
  const q2DisparityOutliers = disparityList
    .map((d) => ({
      ...d,
      zScore: calculateZScore(d.diff, diffStats.mean, diffStats.stdDev),
    }))
    .filter((d) => d.zScore >= zThreshold || d.diff > 20)
    .sort((a, b) => b.diff - a.diff);

  // Q3: Unusually large year-to-year score change (Score Delta spike from 2024 to 2025)
  const scoreChangeList = records.map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    const prevRec = RANKINGS.find((p) => p.institution_id === r.institution_id && p.year === activeYear - 1);
    if (!prevRec) return null;
    const delta = Number((r.overall_score - prevRec.overall_score).toFixed(2));
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      prevScore: prevRec.overall_score,
      currScore: r.overall_score,
      delta,
      absDelta: Math.abs(delta),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const deltaStats = calculateStatsSummary(scoreChangeList.map((d) => d.delta));
  const q3DeltaOutliers = scoreChangeList
    .map((d) => ({
      ...d,
      zScore: calculateZScore(d.delta, deltaStats.mean, deltaStats.stdDev),
    }))
    .filter((d) => Math.abs(d.zScore) >= zThreshold || d.absDelta >= 3.5)
    .sort((a, b) => b.absDelta - a.absDelta);

  // Q4: Strong Parameter Score but Relatively Poor Overall Rank
  // e.g. RPC >= 65 or TLR >= 65, but Overall Rank >= 25
  const q4StrongParamPoorRank = records.filter(
    (r) => (r.RPC >= 60 || r.TLR >= 65) && r.rank >= 20
  ).map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      rank: r.rank,
      overall_score: r.overall_score,
      strongMetric: r.RPC >= 60 ? `RPC: ${r.RPC}` : `TLR: ${r.TLR}`,
      reason: r.PR < 50 ? 'Lower Perception (PR) score suppresses final overall composite' : 'Outreach (OI) & GO deficit pulls rank down',
    };
  }).sort((a, b) => b.rank - a.rank);

  // Q5: Ranking Volatility (Standard Deviation of Rank across 2017–2025)
  const volatilityList = INSTITUTIONS.map((inst) => {
    const historicalRanks = RANKINGS.filter((r) => r.institution_id === inst.institution_id).map((r) => r.rank);
    if (historicalRanks.length < 5) return null;
    const stdDev = calculateStandardDeviation(historicalRanks);
    const minRank = Math.min(...historicalRanks);
    const maxRank = Math.max(...historicalRanks);
    const swing = maxRank - minRank;

    return {
      id: inst.institution_id,
      name: inst.short_name,
      state: inst.state,
      volatilitySD: stdDev,
      minRank,
      maxRank,
      swing,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => b.volatilitySD - a.volatilitySD).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Statistical Outlier Detection & Anomaly Inspection
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify statistical irregularities, parameter imbalances, and anomalous ranking swings using Z-score and IQR deviation models.
          </p>
        </div>

        {/* Sensitivity Slider / Threshold Selector */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="outlier-threshold-select" className="text-slate-500 font-semibold text-[11px]">Z-Score Threshold (σ):</label>
            <select
              id="outlier-threshold-select"
              value={zThreshold}
              onChange={(e) => setZThreshold(Number(e.target.value))}
              className="font-bold text-amber-600 outline-none cursor-pointer"
            >
              <option value={1.5}>1.5σ (Sensitive)</option>
              <option value={1.8}>1.8σ (Balanced)</option>
              <option value={2.0}>2.0σ (Standard)</option>
              <option value={2.5}>2.5σ (Extreme)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytical disclaimer notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Methodology Note:</strong> Outliers identified below represent statistically unusual performance profiles (e.g., world-class research institutes with low undergraduate enrollment, or rapid institutional turnarounds) requiring qualitative institutional context, rather than data recording errors.
        </p>
      </div>

      {/* QUESTION 1: Research Score Outliers Relative to Overall Score */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
            Question 1
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Institutions with Unusually High Research (RPC) Scores Relative to Overall Standing ({activeYear})
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Institutions whose research productivity deviates significantly from the expected national regression line (Z &ge; {zThreshold})
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scatter with highlighted outliers */}
          <div className="lg:col-span-7 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 15, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="overall_score" name="Overall" tick={{ fontSize: 11 }} label={{ value: 'Overall Score', position: 'insideBottom', offset: -10, fontSize: 11 }} />
                <YAxis dataKey="RPC" name="RPC" tick={{ fontSize: 11 }} label={{ value: 'Research (RPC)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11 }} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-amber-300">{d.name}</p>
                        <p className="text-[11px] text-slate-300">Overall: {d.overall_score} • RPC: {d.RPC}</p>
                        <p className="text-[10px] text-blue-300">Residual: {d.residual > 0 ? `+${d.residual}` : d.residual} pts</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Standard Cohort"
                  data={residualsWithData}
                  fill="#94A3B8"
                  opacity={0.6}
                />
                <Scatter
                  name="Flagged Outliers"
                  data={q1Outliers}
                  fill="#F59E0B"
                  onClick={(entry) => setInspectInstitutionId((entry as any).id)}
                  cursor="pointer"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Outlier cards list */}
          <div className="lg:col-span-5 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 block">Flagged Statistical Anomalies:</span>
            {q1Outliers.map((item) => (
              <div
                key={item.id}
                onClick={() => setInspectInstitutionId(item.id)}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-slate-900">{item.name}</strong>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Z = {item.zScore > 0 ? `+${item.zScore}` : item.zScore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Actual RPC: <strong>{item.RPC}</strong> (Exp: {item.expectedRPC})</span>
                  <span className="font-bold text-amber-700">+{item.residual} pts residual</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUESTION 2 & 3: Research vs Teaching Disparity & Annual Change Spikes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q2: Research vs Teaching Disparity */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              Question 2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Substantially Higher Research than Teaching (RPC - TLR &gt; 20)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Institutions heavily prioritized on laboratory research, scientific patents, and doctoral output
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2 text-center">Rank</th>
                  <th className="pb-2 text-center font-bold text-purple-700">RPC</th>
                  <th className="pb-2 text-center font-bold text-emerald-700">TLR</th>
                  <th className="pb-2 text-right">Disparity Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {q2DisparityOutliers.map((item) => (
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
                      +{item.diff} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Q3: Year-to-Year Score Variation Outliers */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
              Question 3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Unusually Large Year-to-Year Score Variations ({activeYear - 1} → {activeYear})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Institutions experiencing sudden performance leaps or contractions exceeding typical cohort drift
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2 text-center">{activeYear - 1}</th>
                  <th className="pb-2 text-center">{activeYear}</th>
                  <th className="pb-2 text-right">1-Yr Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {q3DeltaOutliers.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-center text-slate-500">{item.prevScore}</td>
                    <td className="py-2.5 text-center font-bold text-slate-800">{item.currScore}</td>
                    <td className="py-2.5 text-right font-black text-blue-700">
                      {item.delta > 0 ? `+${item.delta}` : item.delta} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUESTION 4 & 5: Strong Parameter with Low Rank & High Ranking Volatility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q4: Strong Parameter Score with Relatively Lower Overall Rank */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              Question 4
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Metric Score but Sub-Tier Overall Rank
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Institutions achieving tier-1 scores in a single dimension (RPC/TLR &ge; 60) but ranked outside the Top 20
          </p>

          <div className="space-y-2.5">
            {q4StrongParamPoorRank.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => setInspectInstitutionId(item.id)}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-blue-300 transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-slate-900">{item.name}</strong>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-black">
                    Rank #{item.rank}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-700">{item.strongMetric}</span>
                  <span className="text-slate-500 text-[10px]">{item.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q5: Ranking Volatility */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
              Question 5
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              High Multi-Year Ranking Volatility (Standard Deviation of Rank)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Institutions with high standard deviation (&sigma;) in rank positions across the 9 cycles
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                  <th className="pb-2">Institution</th>
                  <th className="pb-2 text-center">Peak Rank</th>
                  <th className="pb-2 text-center">Lowest Rank</th>
                  <th className="pb-2 text-right">Volatility (&sigma;)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {volatilityList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectInstitutionId(item.id)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="py-2.5 text-center font-bold text-emerald-600">#{item.minRank}</td>
                    <td className="py-2.5 text-center text-slate-500">#{item.maxRank}</td>
                    <td className="py-2.5 text-right font-black text-amber-700">
                      &sigma; = {item.volatilitySD} ({item.swing} ranks swing)
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
