import React from 'react';
import {
  X,
  ExternalLink,
  GitCompare,
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { INSTITUTIONS, RANKINGS, PARAMETERS_INFO } from '../../data/nirfData';

export const InstitutionProfileModal: React.FC = () => {
  const {
    inspectInstitutionId,
    setInspectInstitutionId,
    filters,
    addComparisonInstitution,
    setCurrentPage,
  } = useApp();

  if (!inspectInstitutionId) return null;

  const institution = INSTITUTIONS.find((i) => i.institution_id === inspectInstitutionId);
  if (!institution) return null;

  const history = RANKINGS.filter((r) => r.institution_id === inspectInstitutionId).sort(
    (a, b) => a.year - b.year
  );

  const currentRanking =
    history.find((r) => r.year === filters.year) || history[history.length - 1];

  const firstRanking = history[0];
  const rankDelta =
    firstRanking && currentRanking ? firstRanking.rank - currentRanking.rank : 0;

  // Find related peers within ±3 ranks
  const peers = currentRanking
    ? RANKINGS.filter(
        (r) =>
          r.year === currentRanking.year &&
          r.category === currentRanking.category &&
          r.institution_id !== inspectInstitutionId &&
          Math.abs(r.rank - currentRanking.rank) <= 3
      )
        .map((r) => ({
          rank: r.rank,
          score: r.overall_score,
          inst: INSTITUTIONS.find((i) => i.institution_id === r.institution_id),
        }))
        .filter((p) => p.inst !== undefined)
    : [];

  const radarData = currentRanking
    ? [
        { subject: 'TLR', score: currentRanking.TLR, fullMark: 100 },
        { subject: 'RPC', score: currentRanking.RPC, fullMark: 100 },
        { subject: 'GO', score: currentRanking.GO, fullMark: 100 },
        { subject: 'OI', score: currentRanking.OI, fullMark: 100 },
        { subject: 'PR', score: currentRanking.PR, fullMark: 100 },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                {institution.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white">
                {institution.type}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {institution.city}, {institution.state}
              </span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">{institution.institution_name}</h2>
            <p className="text-xs text-slate-300 mt-1">Established {institution.established_year}</p>
          </div>

          <button
            onClick={() => setInspectInstitutionId(null)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metric Highlights in Selected Year */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-700 block">NIRF Rank ({currentRanking?.year || filters.year})</span>
              <div className="text-2xl font-black text-blue-950 mt-1">
                #{currentRanking?.rank ?? 'N/A'}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-medium">
                {rankDelta > 0 ? (
                  <span className="text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +{rankDelta} ranks since {firstRanking?.year}
                  </span>
                ) : rankDelta < 0 ? (
                  <span className="text-rose-600 flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5" /> {rankDelta} ranks since {firstRanking?.year}
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center">
                    <Minus className="w-3.5 h-3.5" /> Steady
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-[11px] font-semibold text-indigo-700 block">Overall Score</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {currentRanking?.overall_score ?? 'N/A'}
                <span className="text-xs font-normal text-slate-500"> /100</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
                Ranked in {currentRanking?.category}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100">
              <span className="text-[11px] font-semibold text-violet-700 block">Research (RPC)</span>
              <div className="text-2xl font-black text-violet-950 mt-1">
                {currentRanking?.RPC ?? 'N/A'}
              </div>
              <span className="text-[11px] text-violet-600 font-medium mt-1 block">Weight: 30%</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 block">Teaching (TLR)</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {currentRanking?.TLR ?? 'N/A'}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Weight: 30%</span>
            </div>
          </div>

          {/* 5 Parameters Detailed Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              NIRF Parameter Breakdown ({currentRanking?.year})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PARAMETERS_INFO.map((param) => {
                const score = (currentRanking as any)?.[param.key] || 0;
                return (
                  <div key={param.key} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>{param.key}</span>
                      <span className="text-slate-400 font-normal">wt: {param.weight}%</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-1">{score}</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score}%`, backgroundColor: param.color }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block truncate">
                      {param.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts: Historical Rank/Score & Radar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Historical Trend */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                Ranking History (2017–2025)
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis reversed domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      formatter={(val: any) => [`Rank #${val}`, 'Rank']}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="#2459D3"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#2459D3' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">Lower value represents higher ranking</p>
            </div>

            {/* Radar Chart */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                5-Parameter Balance Radar
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                    <PolarRadiusAxis domain={[0, 100]} angle={30} tick={{ fontSize: 8 }} />
                    <Radar
                      name={institution.short_name}
                      dataKey="score"
                      stroke="#2459D3"
                      fill="#2459D3"
                      fillOpacity={0.35}
                    />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Related / Peer Institutions */}
          {peers.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Immediate Ranking Cohort (Rank ±3 in {currentRanking?.year})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {peers.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (p.inst) setInspectInstitutionId(p.inst.institution_id);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.inst?.short_name}</p>
                      <p className="text-[10px] text-slate-500">{p.inst?.state}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-blue-700">#{p.rank}</span>
                      <span className="text-[10px] text-slate-400 block">{p.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <a
            href={institution.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            <span>Official Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                addComparisonInstitution(institution.institution_id);
                setCurrentPage('comparison');
                setInspectInstitutionId(null);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Add to Comparison</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
