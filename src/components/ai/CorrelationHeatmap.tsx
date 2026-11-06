/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive NIRF Parameter Correlation Heatmap Matrix Component
 */

import React, { useState } from 'react';
import { Grid, Info } from 'lucide-react';

interface CorrelationHeatmapProps {
  data: any[];
  title?: string;
  meta?: any;
}

const PARAMETERS = ['TLR', 'RPC', 'GO', 'OI', 'PR', 'Overall Score'];

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  title,
  meta,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    p1: string;
    p2: string;
    val: number;
  } | null>(null);

  // If data is matrix rows
  const matrixData = data && data.length > 0 ? data : [];

  const getCellBg = (val: number) => {
    if (val === 1.0) return 'bg-blue-600 text-white font-bold';
    if (val >= 0.8) return 'bg-blue-500 text-white font-semibold';
    if (val >= 0.6) return 'bg-blue-400 text-white font-medium';
    if (val >= 0.4) return 'bg-blue-200 text-blue-950 font-medium';
    if (val >= 0.2) return 'bg-blue-100 text-blue-900';
    if (val >= 0.0) return 'bg-slate-50 text-slate-700';
    return 'bg-rose-100 text-rose-800 font-medium';
  };

  const getInterpretation = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 0.8) return 'Very Strong Positive Correlation';
    if (abs >= 0.6) return 'Strong Positive Correlation';
    if (abs >= 0.4) return 'Moderate Positive Correlation';
    if (abs >= 0.2) return 'Weak Positive Correlation';
    return 'Negligible Linear Correlation';
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-600" />
            {title || 'NIRF Parameter Correlation Heatmap Matrix'}
          </h4>
          <p className="text-[11px] text-slate-500">
            Pairwise Pearson correlation coefficients (r) across evaluation pillars
          </p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto my-2">
        <div className="min-w-[420px]">
          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {/* Header row corner */}
            <div className="p-2 font-bold text-slate-400 text-center">Pillar</div>
            {PARAMETERS.map((p) => (
              <div
                key={p}
                className="p-1.5 font-bold text-slate-700 text-center bg-slate-50 rounded truncate"
                title={p}
              >
                {p === 'Overall Score' ? 'Overall' : p}
              </div>
            ))}

            {/* Matrix rows */}
            {PARAMETERS.map((rowParam) => {
              const rowObj = matrixData.find((r) => r.parameter === rowParam) || {};

              return (
                <React.Fragment key={rowParam}>
                  <div
                    className="p-1.5 font-bold text-slate-700 text-left flex items-center bg-slate-50 rounded truncate"
                    title={rowParam}
                  >
                    {rowParam === 'Overall Score' ? 'Overall' : rowParam}
                  </div>
                  {PARAMETERS.map((colParam) => {
                    const rawVal =
                      rowParam === colParam ? 1.0 : rowObj[colParam] ?? 0.0;
                    const val = Number(rawVal);

                    return (
                      <div
                        key={colParam}
                        onMouseEnter={() =>
                          setHoveredCell({ p1: rowParam, p2: colParam, val })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`h-9 flex items-center justify-center rounded transition-all cursor-pointer select-none text-[11px] ${getCellBg(
                          val
                        )} hover:scale-105 hover:ring-2 hover:ring-blue-400 hover:z-10`}
                      >
                        {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Cell Info Card */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
        {hoveredCell ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              {hoveredCell.p1} ↔ {hoveredCell.p2}:
            </span>
            <span className="font-bold text-blue-700">
              r = {hoveredCell.val > 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
            </span>
            <span className="text-slate-500">
              ({getInterpretation(hoveredCell.val)})
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11.5px]">
            Hover over any cell to see the pairwise correlation details.
          </span>
        )}
      </div>

      {/* Mandatory Non-Causation Disclaimer */}
      <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-500 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Statistical Note:</strong> Correlation reflects mutual linear association across dataset pillars and must not be interpreted as proof of causation.
        </span>
      </div>
    </div>
  );
};

