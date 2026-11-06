import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LabelList,
  Label,
} from 'recharts';

export interface GroupedBarSeries {
  key: string;
  name: string;
  color: string;
}

export interface GroupedBarChartProps {
  data: Array<any>;
  xAxisKey?: string; // key for x-axis category
  series: GroupedBarSeries[];
  height?: number | string;
  barSize?: number;
  yAxisDomain?: [number | string, number | string];
  xAxisLabel?: string;
  yAxisLabel?: string;
  valueFormatter?: (val: any) => string;
  showValueLabels?: boolean;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data,
  xAxisKey = 'category',
  series,
  height = 300,
  barSize = 18,
  yAxisDomain = [0, 100],
  xAxisLabel,
  yAxisLabel,
  valueFormatter = (v) => `${v}`,
  showValueLabels = false,
  className = '',
  margin = { top: 20, right: 20, left: 0, bottom: 20 },
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 min-w-[190px] z-50">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
            {label}
          </div>
          <div className="space-y-1 text-[11px] pt-0.5">
            {payload.map((entry: any, i: number) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-900">
                  {valueFormatter(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 11, fontWeight: 600, fill: '#1E293B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          >
            {xAxisLabel && (
              <Label
                value={xAxisLabel}
                offset={-10}
                position="insideBottom"
                style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B', fontWeight: 600 }}
              />
            )}
          </XAxis>
          <YAxis
            domain={yAxisDomain}
            tick={{ fontSize: 10, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
            width={35}
          >
            {yAxisLabel && (
              <Label
                value={yAxisLabel}
                angle={-90}
                position="insideLeft"
                style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B', fontWeight: 600 }}
              />
            )}
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
            iconType="circle"
            iconSize={8}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              barSize={barSize}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {showValueLabels && (
                <LabelList
                  dataKey={s.key}
                  position="top"
                  style={{ fontSize: 9, fontWeight: 700, fill: s.color }}
                  formatter={valueFormatter}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

