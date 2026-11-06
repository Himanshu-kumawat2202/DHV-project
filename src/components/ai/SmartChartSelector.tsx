/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Smart Chart Selector Engine
 * Dynamically selects and renders the optimal specialized visualization component
 * based on analytical intent and structured data dimensions.
 */

import React from 'react';
import { ChartType, ChartConfig } from '../../types';
import { ComparisonBarChart } from './ComparisonBarChart';
import { RankingBarChart } from './RankingBarChart';
import { TrendLineChart } from './TrendLineChart';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { DistributionChart } from './DistributionChart';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

interface SmartChartSelectorProps {
  chartType: ChartType;
  chartData: any[];
  chartConfig?: ChartConfig;
}

export const SmartChartSelector: React.FC<SmartChartSelectorProps> = ({
  chartType,
  chartData,
  chartConfig,
}) => {
  if (!chartData || chartData.length === 0) return null;

  // 1. Grouped Horizontal Bar Chart for Institution Comparisons
  if (chartType === 'grouped_bar') {
    return (
      <ComparisonBarChart
        data={chartData}
        yKeys={chartConfig?.yKeys || []}
        title={chartConfig?.title}
        alternateData={chartConfig?.alternateData}
      />
    );
  }

  // 2. Horizontal Ranking Bar Chart for Top N Institutions
  if (chartType === 'ranking_bar') {
    return <RankingBarChart data={chartData} title={chartConfig?.title} />;
  }

  // 3. Multi-year Trajectory Line Chart
  if (chartType === 'line') {
    return (
      <TrendLineChart
        data={chartData}
        yKeys={chartConfig?.yKeys}
        title={chartConfig?.title}
        xKey={chartConfig?.xKey}
      />
    );
  }

  // 4. Parameter Correlation Heatmap Matrix
  if (chartType === 'heatmap') {
    return (
      <CorrelationHeatmap
        data={chartData}
        title={chartConfig?.title}
        meta={chartConfig?.meta}
      />
    );
  }

  // 5. Score Distribution Histogram
  if (chartType === 'distribution') {
    return (
      <DistributionChart
        data={chartData}
        title={chartConfig?.title}
        xKey={chartConfig?.xKey}
        yKeys={chartConfig?.yKeys}
      />
    );
  }

  // 6. Horizontal Bar Chart (e.g. State-wise distributions)
  if (chartType === 'horizontal_bar' || chartConfig?.orientation === 'horizontal') {
    return (
      <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
            {chartConfig?.title || 'Distribution Overview'}
          </h4>
        </div>
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 25, bottom: 5, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey={chartConfig?.xKey || 'name'}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  borderColor: '#cbd5e1',
                }}
              />
              <Bar
                dataKey={chartConfig?.yKeys?.[0] || 'Institutions'}
                fill="#2563EB"
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 7. Bivariate Scatter Plot
  if (chartType === 'scatter') {
    return (
      <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
            {chartConfig?.title || 'Correlation Scatter Plot'}
          </h4>
        </div>
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 15, bottom: 15, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey={chartConfig?.xKey || 'RPC'}
                name={chartConfig?.xKey || 'Parameter'}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                dataKey="Overall Score"
                name="Score"
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[40, 100]}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Scatter name="Institutions" data={chartData} fill="#2563EB" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 8. Standard Fallback Bar Chart
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
          {chartConfig?.title || 'Data Visualization'}
        </h4>
      </div>
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} margin={{ top: 10, right: 15, bottom: 25, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={chartConfig?.xKey || 'name'}
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={35} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            {(chartConfig?.yKeys || ['Score']).map((key, kIdx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={kIdx === 0 ? '#2563EB' : '#0D9488'}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

