/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable Key Insights List Component
 */

import React from 'react';
import { Lightbulb, CheckCircle2, TrendingUp, Award, Compass } from 'lucide-react';

interface InsightListProps {
  insights: string[];
}

export const InsightList: React.FC<InsightListProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  const getIcon = (idx: number, text: string) => {
    if (text.toLowerCase().includes('rank') || text.toLowerCase().includes('lead')) {
      return <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }
    if (text.toLowerCase().includes('trend') || text.toLowerCase().includes('growth') || text.toLowerCase().includes('score')) {
      return <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
    if (text.toLowerCase().includes('note') || text.toLowerCase().includes('causation')) {
      return <Compass className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="my-3 space-y-2">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-[14px] leading-relaxed text-slate-800"
        >
          {getIcon(idx, insight)}
          <div className="flex-1">
            <span
              dangerouslySetInnerHTML={{
                __html: insight
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>'),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

