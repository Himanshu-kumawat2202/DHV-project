import React, { useState } from 'react';

export interface BoxPlotSummary {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean?: number;
  stdDev?: number;
  iqr?: number;
  count?: number;
  color?: string;
}

export interface BoxPlotChartProps {
  data: BoxPlotSummary[];
  title?: string;
  subtitle?: string;
  height?: number;
  yDomain?: [number, number];
  orientation?: 'vertical' | 'horizontal'; // vertical: Y is score, X is categories
  className?: string;
}

export const BoxPlotChart: React.FC<BoxPlotChartProps> = ({
  data,
  title,
  subtitle,
  height = 360,
  yDomain,
  orientation = 'vertical',
  className = '',
}) => {
  const [hoveredBox, setHoveredBox] = useState<{
    summary: BoxPlotSummary;
    x: number;
    y: number;
  } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-slate-400">
        No summary data available.
      </div>
    );
  }

  // Calculate global domain if not provided
  const allMins = data.map((d) => d.min);
  const allMaxs = data.map((d) => d.max);
  const globalMin = yDomain ? yDomain[0] : Math.floor(Math.min(...allMins) - 5);
  const globalMax = yDomain ? yDomain[1] : Math.ceil(Math.max(...allMaxs) + 5);
  const range = globalMax - globalMin || 1;

  if (orientation === 'horizontal') {
    // Horizontal Box Plot (e.g. for single cohort summary)
    const paddingLeft = 100;
    const paddingRight = 40;
    const svgWidth = 600;
    const svgHeight = Math.max(160, data.length * 80 + 50);

    const scaleX = (val: number) => {
      const clamped = Math.max(globalMin, Math.min(globalMax, val));
      return paddingLeft + ((clamped - globalMin) / range) * (svgWidth - paddingLeft - paddingRight);
    };

    // Generate ticks
    const tickStep = range > 60 ? 10 : 5;
    const ticks: number[] = [];
    const firstTick = Math.ceil(globalMin / tickStep) * tickStep;
    for (let t = firstTick; t <= globalMax; t += tickStep) {
      ticks.push(t);
    }

    return (
      <div className={`w-full relative select-none ${className}`}>
        {title && (
          <div className="mb-2">
            <h4 className="text-xs font-bold text-slate-800">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[500px]"
            style={{ maxHeight: height }}
          >
            {/* Gridlines */}
            {ticks.map((t) => {
              const x = scaleX(t);
              return (
                <g key={`grid-h-${t}`}>
                  <line
                    x1={x}
                    y1={20}
                    x2={x}
                    y2={svgHeight - 35}
                    stroke="#F1F5F9"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={x}
                    y={svgHeight - 18}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#64748B"
                    fontWeight={500}
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Axis line */}
            <line
              x1={paddingLeft}
              y1={svgHeight - 35}
              x2={svgWidth - paddingRight}
              y2={svgHeight - 35}
              stroke="#CBD5E1"
            />

            {/* Box plots */}
            {data.map((item, idx) => {
              const cy = 40 + idx * 75;
              const boxHeight = 28;
              const xMin = scaleX(item.min);
              const xQ1 = scaleX(item.q1);
              const xMed = scaleX(item.median);
              const xQ3 = scaleX(item.q3);
              const xMax = scaleX(item.max);
              const xMean = item.mean !== undefined ? scaleX(item.mean) : null;
              const color = item.color || '#2563EB';

              return (
                <g
                  key={item.label}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredBox({
                      summary: item,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredBox(null)}
                >
                  {/* Category label */}
                  <text
                    x={paddingLeft - 12}
                    y={cy + 4}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight={700}
                    fill="#1E293B"
                  >
                    {item.label}
                  </text>

                  {/* Whisker line from Min to Max */}
                  <line
                    x1={xMin}
                    y1={cy}
                    x2={xMax}
                    y2={cy}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />

                  {/* Min whisker cap */}
                  <line
                    x1={xMin}
                    y1={cy - boxHeight / 3}
                    x2={xMin}
                    y2={cy + boxHeight / 3}
                    stroke={color}
                    strokeWidth={2}
                  />

                  {/* Max whisker cap */}
                  <line
                    x1={xMax}
                    y1={cy - boxHeight / 3}
                    x2={xMax}
                    y2={cy + boxHeight / 3}
                    stroke={color}
                    strokeWidth={2}
                  />

                  {/* Box (Q1 to Q3) */}
                  <rect
                    x={xQ1}
                    y={cy - boxHeight / 2}
                    width={Math.max(2, xQ3 - xQ1)}
                    height={boxHeight}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeWidth={2}
                    rx={3}
                    className="transition-all duration-200 group-hover:fill-opacity-30"
                  />

                  {/* Median line */}
                  <line
                    x1={xMed}
                    y1={cy - boxHeight / 2}
                    x2={xMed}
                    y2={cy + boxHeight / 2}
                    stroke="#1E3A8A"
                    strokeWidth={3}
                  />

                  {/* Mean marker (Diamond) */}
                  {xMean !== null && (
                    <polygon
                      points={`${xMean},${cy - 7} ${xMean + 5},${cy} ${xMean},${cy + 7} ${xMean - 5},${cy}`}
                      fill="#DC2626"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Values text labels */}
                  <text x={xMin} y={cy - 18} textAnchor="middle" fontSize={9} fill="#64748B" fontWeight={600}>
                    {item.min}
                  </text>
                  <text x={xMed} y={cy + 24} textAnchor="middle" fontSize={10} fill="#1E3A8A" fontWeight={800}>
                    M:{item.median}
                  </text>
                  <text x={xMax} y={cy - 18} textAnchor="middle" fontSize={9} fill="#64748B" fontWeight={600}>
                    {item.max}
                  </text>
                  {item.mean !== undefined && (
                    <text x={xMean!} y={cy - 18} textAnchor="middle" fontSize={9} fill="#DC2626" fontWeight={700}>
                      μ:{item.mean}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-2 border border-blue-600 bg-blue-100 rounded-xs" />
            Box (IQR: Q1 to Q3)
          </span>
          <span className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="w-2.5 h-1 bg-blue-900 rounded-full" />
            Median
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-600">
            <span className="w-2.5 h-2.5 bg-rose-600 rotate-45 inline-block" />
            Mean
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-3 border-t-2 border-slate-400" />
            Whiskers (Min & Max)
          </span>
        </div>

        {/* Tooltip */}
        {hoveredBox && (
          <div
            className="fixed z-50 pointer-events-none bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1.5 min-w-[210px]"
            style={{
              left: Math.min(window.innerWidth - 230, Math.max(10, hoveredBox.x - 100)),
              top: Math.max(10, hoveredBox.y - 120),
            }}
          >
            <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex justify-between items-center">
              <span>{hoveredBox.summary.label}</span>
              {hoveredBox.summary.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  N = {hoveredBox.summary.count}
                </span>
              )}
            </div>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Maximum:</span>
                <span className="font-bold text-emerald-700">{hoveredBox.summary.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Q3 (75th %tile):</span>
                <span className="font-semibold text-slate-800">{hoveredBox.summary.q3}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Median (50th):</span>
                <span className="font-bold text-blue-700">{hoveredBox.summary.median}</span>
              </div>
              {hoveredBox.summary.mean !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean:</span>
                  <span className="font-bold text-rose-600">{hoveredBox.summary.mean}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Q1 (25th %tile):</span>
                <span className="font-semibold text-slate-800">{hoveredBox.summary.q1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Minimum:</span>
                <span className="font-bold text-slate-700">{hoveredBox.summary.min}</span>
              </div>
              <div className="pt-1 border-t border-slate-100 flex justify-between font-bold text-amber-800">
                <span>IQR (Q3 − Q1):</span>
                <span>{(hoveredBox.summary.q3 - hoveredBox.summary.q1).toFixed(2)} pts</span>
              </div>
              {hoveredBox.summary.stdDev !== undefined && (
                <div className="flex justify-between text-purple-700 font-semibold">
                  <span>Std Dev (σ):</span>
                  <span>{hoveredBox.summary.stdDev}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vertical orientation (for multiple categories on X-axis)
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 65;
  const svgWidth = Math.max(680, data.length * 62);
  const svgHeight = height;

  const scaleY = (val: number) => {
    const clamped = Math.max(globalMin, Math.min(globalMax, val));
    return (
      svgHeight -
      paddingBottom -
      ((clamped - globalMin) / range) * (svgHeight - paddingTop - paddingBottom)
    );
  };

  const tickStep = range > 60 ? 10 : 5;
  const ticks: number[] = [];
  const firstTick = Math.ceil(globalMin / tickStep) * tickStep;
  for (let t = firstTick; t <= globalMax; t += tickStep) {
    ticks.push(t);
  }

  const categoryWidth = (svgWidth - paddingLeft - paddingRight) / data.length;

  return (
    <div className={`w-full relative select-none ${className}`}>
      {title && (
        <div className="mb-2">
          <h4 className="text-xs font-bold text-slate-800">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      )}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[550px]"
          style={{ maxHeight: height }}
        >
          {/* Y-axis gridlines */}
          {ticks.map((t) => {
            const y = scaleY(t);
            return (
              <g key={`grid-v-${t}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="#64748B"
                  fontWeight={500}
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Left Y Axis line */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={svgHeight - paddingBottom}
            stroke="#CBD5E1"
          />

          {/* Bottom X Axis line */}
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            stroke="#CBD5E1"
          />

          {/* Box plots for each category */}
          {data.map((item, idx) => {
            const cx = paddingLeft + idx * categoryWidth + categoryWidth / 2;
            const boxWidth = Math.min(32, categoryWidth * 0.6);
            const yMin = scaleY(item.min);
            const yQ1 = scaleY(item.q1);
            const yMed = scaleY(item.median);
            const yQ3 = scaleY(item.q3);
            const yMax = scaleY(item.max);
            const yMean = item.mean !== undefined ? scaleY(item.mean) : null;
            const color = item.color || '#2563EB';

            return (
              <g
                key={item.label}
                className="cursor-pointer group"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredBox({
                    summary: item,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredBox(null)}
              >
                {/* Whisker line from Min to Max */}
                <line
                  x1={cx}
                  y1={yMin}
                  x2={cx}
                  y2={yMax}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />

                {/* Min whisker cap */}
                <line
                  x1={cx - boxWidth / 3}
                  y1={yMin}
                  x2={cx + boxWidth / 3}
                  y2={yMin}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Max whisker cap */}
                <line
                  x1={cx - boxWidth / 3}
                  y1={yMax}
                  x2={cx + boxWidth / 3}
                  y2={yMax}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Box (Q1 to Q3) */}
                <rect
                  x={cx - boxWidth / 2}
                  y={yQ3}
                  width={boxWidth}
                  height={Math.max(2, yQ1 - yQ3)}
                  fill={color}
                  fillOpacity={0.18}
                  stroke={color}
                  strokeWidth={2}
                  rx={3}
                  className="transition-all duration-200 group-hover:fill-opacity-35"
                />

                {/* Median line */}
                <line
                  x1={cx - boxWidth / 2}
                  y1={yMed}
                  x2={cx + boxWidth / 2}
                  y2={yMed}
                  stroke="#1E3A8A"
                  strokeWidth={3}
                />

                {/* Mean marker if present */}
                {yMean !== null && (
                  <polygon
                    points={`${cx},${yMean - 4} ${cx + 4},${yMean} ${cx},${yMean + 4} ${cx - 4},${yMean}`}
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                )}

                {/* Category label rotated */}
                <text
                  x={cx}
                  y={svgHeight - paddingBottom + 16}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight={600}
                  fill="#1E293B"
                  transform={`rotate(-35, ${cx}, ${svgHeight - paddingBottom + 16})`}
                >
                  {item.label}
                </text>

                {/* Median value text */}
                <text
                  x={cx}
                  y={yQ3 - 5}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#1E3A8A"
                  fontWeight={700}
                >
                  {item.median}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-3 h-2 border border-blue-600 bg-blue-100 rounded-xs" />
          Box: IQR (Q1 to Q3)
        </span>
        <span className="flex items-center gap-1.5 font-bold text-blue-900">
          <span className="w-2.5 h-1 bg-blue-900 rounded-full" />
          Bold line: Median
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="w-3 border-t-2 border-slate-400" />
          Whiskers: Min to Max
        </span>
      </div>

      {/* Hover tooltip */}
      {hoveredBox && (
        <div
          className="fixed z-50 pointer-events-none bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs space-y-1.5 min-w-[210px]"
          style={{
            left: Math.min(window.innerWidth - 230, Math.max(10, hoveredBox.x - 100)),
            top: Math.max(10, hoveredBox.y - 130),
          }}
        >
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex justify-between items-center">
            <span>{hoveredBox.summary.label}</span>
            {hoveredBox.summary.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                N = {hoveredBox.summary.count}
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Maximum:</span>
              <span className="font-bold text-emerald-700">{hoveredBox.summary.max}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Q3 (75th %tile):</span>
              <span className="font-semibold text-slate-800">{hoveredBox.summary.q3}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Median (50th):</span>
              <span className="font-bold text-blue-700">{hoveredBox.summary.median}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Q1 (25th %tile):</span>
              <span className="font-semibold text-slate-800">{hoveredBox.summary.q1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Minimum:</span>
              <span className="font-bold text-slate-700">{hoveredBox.summary.min}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex justify-between font-bold text-amber-800">
              <span>IQR (Spread):</span>
              <span>{(hoveredBox.summary.q3 - hoveredBox.summary.q1).toFixed(2)} pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

