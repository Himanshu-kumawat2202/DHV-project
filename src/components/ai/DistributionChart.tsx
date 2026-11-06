/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Score Distribution Histogram Component
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';

interface DistributionChartProps {
  data: any[];
  title?: string;
  xKey?: string;
  yKeys?: string[];
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  title,
  xKey = 'name',
  yKeys = ['Institutions'],
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            {title || 'Score Distribution Histogram'}
          </h4>
          <p className="text-[11px] text-slate-500">
            Institutional frequency across 10-point composite score intervals
          </p>
        </div>
      </div>

      <div className="h-60 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 15, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={35}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              formatter={(val: any) => [`${val} Institutions`, 'Frequency']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                borderColor: '#cbd5e1',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar
              dataKey={yKeys[0] || 'Institutions'}
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

