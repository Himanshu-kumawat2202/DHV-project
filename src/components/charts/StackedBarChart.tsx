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
} from 'recharts';

export interface StackedBarItem {
  category: string;
  entered: number;
  exited: number;
  net?: number;
  [key: string]: any;
}

export interface StackedBarChartProps {
  data: StackedBarItem[];
  height?: number | string;
  barSize?: number;
  enteredColor?: string;
  exitedColor?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  height = 260,
  barSize = 36,
  enteredColor = '#10B981',
  exitedColor = '#F43F5E',
  title,
  subtitle,
  className = '',
  margin = { top: 20, right: 25, left: 10, bottom: 20 },
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload as StackedBarItem;
      const net = (entry.net !== undefined) ? entry.net : (entry.entered - entry.exited);
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-2 min-w-[200px] z-50">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
            {label}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-emerald-700">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Entered Top 10:
              </span>
              <span className="font-extrabold text-sm">+{entry.entered}</span>
            </div>
            <div className="flex justify-between items-center text-rose-700">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Exited Top 10:
              </span>
              <span className="font-extrabold text-sm">−{entry.exited}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-black text-slate-800">
              <span>Net Movement:</span>
              <span className={net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {net >= 0 ? `+${net}` : net} institutions
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      {title && (
        <div className="mb-2">
          <h4 className="text-xs font-bold text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#CBD5E1' }}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="entered"
            name="Entered Top 10"
            fill={enteredColor}
            barSize={barSize}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
          >
            <LabelList
              dataKey="entered"
              position="top"
              style={{ fontSize: 10, fontWeight: 800, fill: '#047857' }}
              formatter={(v: any) => `+${v}`}
            />
          </Bar>
          <Bar
            dataKey="exited"
            name="Exited Top 10"
            fill={exitedColor}
            barSize={barSize}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
          >
            <LabelList
              dataKey="exited"
              position="top"
              style={{ fontSize: 10, fontWeight: 800, fill: '#BE123C' }}
              formatter={(v: any) => `−${v}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

