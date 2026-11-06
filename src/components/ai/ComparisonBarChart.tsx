/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Grouped Horizontal Bar Chart for Head-to-Head Institution Comparison
 * Provides primary horizontal parameter bars with an interactive toggle for secondary radar visualization.
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { BarChart3, Radar as RadarIcon } from 'lucide-react';

interface ComparisonBarChartProps {
  data: any[];
  yKeys: string[];
  title?: string;
  alternateData?: any[];
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  data,
  yKeys,
  title,
  alternateData,
}) => {
  const [viewMode, setViewMode] = useState<'bar' | 'radar'>('bar');

  const inst1Name = yKeys[0] || 'Institution 1';
  const inst2Name = yKeys[1] || 'Institution 2';

  // Distinct contrast colors
  const color1 = '#2563EB'; // Royal Blue
  const color2 = '#0D9488'; // Vibrant Teal / Emerald

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
            {title || `${inst1Name} vs ${inst2Name}`}
          </h4>
          <p className="text-[11px] text-slate-500">
            Side-by-side pillar scores across official NIRF metrics
          </p>
        </div>

        {/* View Mode Toggle: Grouped Bar (Default) vs Radar */}
        {alternateData && alternateData.length > 0 && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'bar'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grouped Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'radar'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <RadarIcon className="w-3.5 h-3.5" />
              <span>Radar View</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-64 sm:h-72 w-full">
        {viewMode === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 25, bottom: 5, left: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                type="category"
                dataKey="parameter"
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                width={85}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                formatter={(val: any, name: any) => [`${val} pts`, name]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  borderColor: '#cbd5e1',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 8, fontSize: 11, fontWeight: 600 }}
              />
              <Bar
                dataKey={inst1Name}
                fill={color1}
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey={inst2Name}
                fill={color2}
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={alternateData || data}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="parameter"
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
              <Radar
                name={inst1Name}
                dataKey={inst1Name}
                stroke={color1}
                fill={color1}
                fillOpacity={0.3}
              />
              <Radar
                name={inst2Name}
                dataKey={inst2Name}
                stroke={color2}
                fill={color2}
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

