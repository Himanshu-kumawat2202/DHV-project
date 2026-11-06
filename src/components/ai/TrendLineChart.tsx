/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable Performance Trajectory Line Chart Component
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrendLineChartProps {
  data: any[];
  yKeys?: string[];
  title?: string;
  xKey?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  yKeys = ['Overall Score'],
  title,
  xKey = 'year',
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            {title || 'Performance Trajectory Across NIRF Editions'}
          </h4>
          <p className="text-[11px] text-slate-500">
            Multi-year longitudinal score trajectory with exact evaluation milestones
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              domain={['auto', 'auto']}
              width={42}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              formatter={(val: any, name: any) => [`${val} pts`, name]}
              labelFormatter={(label) => `NIRF Edition: ${label}`}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                borderColor: '#cbd5e1',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            {yKeys.length > 1 && (
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            )}
            {yKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={idx === 0 ? '#2563EB' : '#0D9488'}
                strokeWidth={3}
                dot={{ r: 4.5, fill: idx === 0 ? '#2563EB' : '#0D9488', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 6.5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

