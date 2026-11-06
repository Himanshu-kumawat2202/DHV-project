import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
  Label,
} from 'recharts';

export interface TooltipField {
  label: string;
  key: string;
  format?: (val: any, entry: any) => React.ReactNode;
  prefix?: string;
  suffix?: string;
}

export interface HorizontalBarChartProps {
  data: Array<any>;
  dataKey?: string; // value key, default 'value'
  labelKey?: string; // category key, default 'label'
  height?: number | string;
  barSize?: number;
  barColor?: string;
  getBarColor?: (entry: any, index: number) => string;
  domain?: [number | string, number | string];
  reversed?: boolean; // if true, higher is closer to left or inverted domain
  xAxisLabel?: string;
  yAxisWidth?: number;
  valueFormatter?: (val: any) => string;
  showValueLabel?: boolean;
  valueLabelPosition?: 'right' | 'insideRight';
  tooltipTitleKey?: string;
  tooltipFields?: TooltipField[];
  customTooltip?: React.FC<any>;
  onClickBar?: (entry: any) => void;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  dataKey = 'value',
  labelKey = 'label',
  height = 300,
  barSize = 18,
  barColor = '#2563EB',
  getBarColor,
  domain,
  reversed = false,
  xAxisLabel,
  yAxisWidth = 130,
  valueFormatter = (v) => `${v}`,
  showValueLabel = true,
  valueLabelPosition = 'right',
  tooltipTitleKey,
  tooltipFields = [],
  customTooltip,
  onClickBar,
  className = '',
  margin = { top: 10, right: 45, left: 10, bottom: 20 },
}) => {
  const DefaultTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const title = tooltipTitleKey ? entry[tooltipTitleKey] : entry[labelKey];
      const val = entry[dataKey];

      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1.5 min-w-[200px] z-50">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between gap-2">
            <span className="truncate max-w-[220px]" title={title}>
              {title}
            </span>
            {entry.category && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {entry.category}
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-slate-600 pt-0.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Value:</span>
              <span className="font-bold text-blue-700">{valueFormatter(val)}</span>
            </div>
            {tooltipFields.map((f, i) => {
              const rawVal = entry[f.key];
              const formatted = f.format
                ? f.format(rawVal, entry)
                : `${f.prefix || ''}${rawVal ?? 'N/A'}${f.suffix || ''}`;
              return (
                <div key={i} className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">{f.label}:</span>
                  <span className="font-semibold text-slate-800">{formatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const TooltipComponent = customTooltip || DefaultTooltip;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={margin}
          barSize={barSize}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
          <XAxis
            type="number"
            domain={domain || (reversed ? [100, 1] : [0, 'auto'])}
            reversed={reversed}
            tick={{ fontSize: 10, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          >
            {xAxisLabel && (
              <Label
                value={xAxisLabel}
                offset={-12}
                position="insideBottom"
                style={{ textAnchor: 'middle', fontSize: 10, fill: '#64748B', fontWeight: 600 }}
              />
            )}
          </XAxis>
          <YAxis
            type="category"
            dataKey={labelKey}
            width={yAxisWidth}
            tick={{ fontSize: 11, fontWeight: 600, fill: '#1E293B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          />
          <Tooltip content={<TooltipComponent />} cursor={{ fill: '#F8FAFC' }} />
          <Bar
            dataKey={dataKey}
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={800}
            onClick={(d: any) => onClickBar && onClickBar(d?.payload || d)}
            className={onClickBar ? 'cursor-pointer' : ''}
          >
            {showValueLabel && (
              <LabelList
                dataKey={dataKey}
                position={valueLabelPosition}
                offset={6}
                style={{ fontSize: 10, fontWeight: 700, fill: '#1E293B' }}
                formatter={valueFormatter}
              />
            )}
            {data.map((entry, index) => {
              const fill = getBarColor ? getBarColor(entry, index) : (entry.color || barColor);
              return <Cell key={`bar-cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

