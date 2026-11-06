/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Horizontal Ranking Bar Chart Component
 * Sorted rank-order presentation with rank badges, actual scores, and state indicators.
 */

import React from 'react';
import { Trophy } from 'lucide-react';

interface RankingItem {
  rank: number;
  name: string;
  fullName?: string;
  state?: string;
  Score: number;
  [key: string]: any;
}

interface RankingBarChartProps {
  data: RankingItem[];
  title?: string;
}

export const RankingBarChart: React.FC<RankingBarChartProps> = ({ data, title }) => {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(...data.map((d) => d.Score || 0), 100);

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    if (rank === 2) return 'bg-slate-200 text-slate-800 border-slate-300 font-bold';
    if (rank === 3) return 'bg-amber-50 text-amber-900 border-amber-200 font-bold';
    return 'bg-slate-100 text-slate-600 border-slate-200 font-semibold';
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            {title || 'Institutional Leaderboard'}
          </h4>
          <p className="text-[11px] text-slate-500">
            Sorted rank order with verified composite NIRF scores
          </p>
        </div>
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          Top {data.length} Cohort
        </span>
      </div>

      <div className="space-y-2.5 my-2">
        {data.map((item) => {
          const pct = Math.min(100, Math.max(10, (item.Score / maxScore) * 100));

          return (
            <div key={item.rank} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] border shrink-0 ${getRankBadgeClass(
                      item.rank
                    )}`}
                  >
                    #{item.rank}
                  </span>
                  <span className="font-semibold text-slate-900 truncate" title={item.fullName || item.name}>
                    {item.name}
                  </span>
                  {item.state && (
                    <span className="hidden sm:inline text-[10px] text-slate-400 shrink-0">
                      • {item.state}
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-bold text-blue-700 text-xs sm:text-sm">
                    {item.Score}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">pts</span>
                </div>
              </div>

              {/* Score Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.rank === 1
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : item.rank <= 3
                      ? 'bg-blue-500'
                      : 'bg-slate-400 group-hover:bg-blue-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

