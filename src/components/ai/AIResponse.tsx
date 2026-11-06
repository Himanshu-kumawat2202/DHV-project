/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Master AI Response Presentation Component
 * Delivers clean typography (15-16px, 1.7 line height), structured sections,
 * styled comparison tables, bulleted insight cards, and smart visualizations.
 */

import React, { useState } from 'react';
import { AIQueryResponse } from '../../types';
import { ComparisonTable } from './ComparisonTable';
import { InsightList } from './InsightList';
import { SmartChartSelector } from './SmartChartSelector';
import {
  FileText,
  Table as TableIcon,
  BarChart3,
  Search,
  Lightbulb,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AIResponseProps {
  text: string;
  responsePayload?: AIQueryResponse;
}

export const AIResponse: React.FC<AIResponseProps> = ({ text, responsePayload }) => {
  const [showCalculation, setShowCalculation] = useState(false);

  // If structured sections are explicitly provided in the payload
  const sections = responsePayload?.structuredSections;

  // Helper to parse markdown text when structured sections are not explicitly split
  const parseMarkdownContent = (raw: string) => {
    // Check if raw contains markdown headings like ###
    if (!raw.includes('###')) {
      return {
        hasHeadings: false,
        body: raw,
        parts: [],
      };
    }

    const parts: Array<{ type: 'heading' | 'text' | 'table' | 'bullets'; content: any }> = [];
    const lines = raw.split('\n');
    let currentText = '';
    let tableLines: string[] = [];
    let bulletLines: string[] = [];

    const flushText = () => {
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() });
        currentText = '';
      }
    };

    const flushTable = () => {
      if (tableLines.length >= 2) {
        const headerLine = tableLines[0];
        const headers = headerLine
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        const rows = tableLines.slice(2).map((rowLine) =>
          rowLine
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
        );
        parts.push({ type: 'table', content: { headers, rows } });
        tableLines = [];
      }
    };

    const flushBullets = () => {
      if (bulletLines.length > 0) {
        parts.push({ type: 'bullets', content: bulletLines });
        bulletLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('###')) {
        flushText();
        flushTable();
        flushBullets();
        parts.push({ type: 'heading', content: line.replace(/^###\s*/, '') });
      } else if (line.trim().startsWith('|')) {
        flushText();
        flushBullets();
        tableLines.push(line.trim());
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        flushText();
        flushTable();
        bulletLines.push(line.trim().replace(/^[-*]\s*/, ''));
      } else {
        flushTable();
        flushBullets();
        currentText += (currentText ? '\n' : '') + line;
      }
    }

    flushText();
    flushTable();
    flushBullets();

    return {
      hasHeadings: true,
      parts,
    };
  };

  const parsed = parseMarkdownContent(text);

  return (
    <div className="w-full space-y-4 text-[15px] sm:text-[15.5px] leading-[1.7] text-slate-800 font-normal">
      {/* 1. Explicit Structured Sections (Preferred) */}
      {sections ? (
        <div className="space-y-4">
          {/* Quick Summary */}
          {sections.quickSummary && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Summary</span>
              </div>
              <p
                className="text-slate-900 font-medium"
                dangerouslySetInnerHTML={{
                  __html: sections.quickSummary.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="font-bold text-slate-950">$1</strong>'
                  ),
                }}
              />
            </div>
          )}

          {/* Key Comparison Table */}
          {sections.comparisonTable && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Key Comparison</span>
              </div>
              <ComparisonTable
                headers={sections.comparisonTable.headers}
                rows={sections.comparisonTable.rows}
              />
            </div>
          )}

          {/* Visual Comparison / Chart (Embedded naturally) */}
          {responsePayload?.chartType && responsePayload?.chartData && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Visual Analysis</span>
              </div>
              <SmartChartSelector
                chartType={responsePayload.chartType}
                chartData={responsePayload.chartData}
                chartConfig={responsePayload.chartConfig}
              />
            </div>
          )}

          {/* Detailed Analysis */}
          {sections.detailedAnalysis && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                <span>Detailed Analysis</span>
              </div>
              <p
                className="text-slate-800"
                dangerouslySetInnerHTML={{
                  __html: sections.detailedAnalysis.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="font-bold text-slate-950">$1</strong>'
                  ),
                }}
              />
            </div>
          )}

          {/* Key Insights */}
          {sections.keyInsights && sections.keyInsights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Key Insights</span>
              </div>
              <InsightList insights={sections.keyInsights} />
            </div>
          )}
        </div>
      ) : parsed.hasHeadings ? (
        /* 2. Parsed Markdown Sections */
        <div className="space-y-3.5">
          {parsed.parts.map((p, idx) => {
            if (p.type === 'heading') {
              const hText = String(p.content);
              return (
                <div
                  key={idx}
                  className="pt-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 border-b border-slate-100 pb-1"
                >
                  {hText.toLowerCase().includes('summary') ? (
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  ) : hText.toLowerCase().includes('comparison') || hText.toLowerCase().includes('rank') ? (
                    <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
                  ) : hText.toLowerCase().includes('insight') ? (
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>{hText}</span>
                </div>
              );
            }

            if (p.type === 'table') {
              return (
                <ComparisonTable
                  key={idx}
                  headers={p.content.headers}
                  rows={p.content.rows}
                />
              );
            }

            if (p.type === 'bullets') {
              return <InsightList key={idx} insights={p.content} />;
            }

            return (
              <p
                key={idx}
                className="text-slate-800"
                dangerouslySetInnerHTML={{
                  __html: p.content.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="font-bold text-slate-950">$1</strong>'
                  ),
                }}
              />
            );
          })}

          {/* Embedded Smart Visualization */}
          {responsePayload?.chartType && responsePayload?.chartData && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Visual Analysis</span>
              </div>
              <SmartChartSelector
                chartType={responsePayload.chartType}
                chartData={responsePayload.chartData}
                chartConfig={responsePayload.chartConfig}
              />
            </div>
          )}
        </div>
      ) : (
        /* 3. Fallback Standard Flow */
        <div className="space-y-3.5">
          <p
            className="whitespace-pre-line text-slate-800"
            dangerouslySetInnerHTML={{
              __html: text.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="font-bold text-slate-950">$1</strong>'
              ),
            }}
          />

          {/* Embedded Smart Visualization */}
          {responsePayload?.chartType && responsePayload?.chartData && (
            <div className="pt-2">
              <SmartChartSelector
                chartType={responsePayload.chartType}
                chartData={responsePayload.chartData}
                chartConfig={responsePayload.chartConfig}
              />
            </div>
          )}
        </div>
      )}

      {/* Analytical Context Note (if present) */}
      {responsePayload?.explanation && !sections && (
        <div className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 leading-relaxed mt-2">
          <span className="font-bold text-slate-700 block mb-0.5 text-[11px] uppercase tracking-wider">
            Analytical Context
          </span>
          {responsePayload.explanation}
        </div>
      )}

      {/* Calculation Proof Accordion */}
      {responsePayload?.calculationDetails && (
        <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/50 mt-3">
          <button
            type="button"
            onClick={() => setShowCalculation(!showCalculation)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              Show how this was calculated
            </span>
            {showCalculation ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCalculation && (
            <div className="p-3.5 pt-1 border-t border-slate-200/80 bg-white/70 text-xs space-y-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Formula / Method
                </span>
                <span className="font-mono text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                  {responsePayload.calculationDetails.formula}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="font-semibold text-slate-500">Filters: </span>
                  {responsePayload.calculationDetails.filtersApplied}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Cohort Sample: </span>
                  {responsePayload.calculationDetails.sampleSize}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                Source: {responsePayload.calculationDetails.sourceDataset}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
