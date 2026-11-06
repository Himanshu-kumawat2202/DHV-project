/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable Parameter Comparison Table Component
 */

import React from 'react';

interface ComparisonTableProps {
  headers: string[];
  rows: Array<Array<string | number>>;
  highlightAdvantage?: boolean;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  headers,
  rows,
  highlightAdvantage = true,
}) => {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="w-full my-4 rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13.5px] sm:text-sm">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 font-semibold border-b border-slate-200">
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className={`py-2.5 px-3.5 ${
                    idx === 0 ? 'text-left' : idx === headers.length - 1 ? 'text-left' : 'text-center'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`transition-colors hover:bg-slate-50/80 ${
                  rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                }`}
              >
                {row.map((cell, cIdx) => {
                  const isFirst = cIdx === 0;
                  const isLast = cIdx === row.length - 1;
                  const isAdvantageCol = highlightAdvantage && isLast && headers.length > 2;

                  return (
                    <td
                      key={cIdx}
                      className={`py-2.5 px-3.5 ${
                        isFirst
                          ? 'font-medium text-slate-900 text-left'
                          : isLast
                          ? 'text-left'
                          : 'text-center font-semibold text-slate-800'
                      }`}
                    >
                      {isAdvantageCol && typeof cell === 'string' && cell.includes('+') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {cell}
                        </span>
                      ) : isAdvantageCol && typeof cell === 'string' && cell === 'Tied' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {cell}
                        </span>
                      ) : (
                        <span>{cell}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

