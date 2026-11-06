/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Chart Selector
 * Selects optimal Recharts visualization based on intent and query result data.
 * Adheres strictly to the rule: Never show a chart when the returned data is insufficient.
 */

import { QueryExecutionResult } from './queryExecutor';
import { StructuredQuery } from './types';
import { ChartType, ChartConfig } from '../../types';

export interface VisualConfiguration {
  chartType?: ChartType;
  chartData?: any[];
  chartConfig?: ChartConfig;
}

/**
 * Determines and formats the visual chart payload from the execution result.
 */
export function selectChart(sq: StructuredQuery, execResult: QueryExecutionResult): VisualConfiguration {
  // 1. Simple factual lookups do not need charts
  if (
    sq.intent === 'rank_lookup' ||
    sq.intent === 'count_query' ||
    sq.intent === 'parameter_definition' ||
    sq.intent === 'dataset_inquiry' ||
    sq.intent === 'out_of_scope' ||
    execResult.isError
  ) {
    return {};
  }

  // 2. If executor already prepared structured chart data, validate and refine
  if (execResult.chartData && execResult.chartData.length > 0 && execResult.chartType && execResult.chartConfig) {
    // Insufficient data checks
    if (execResult.chartType === 'line' && execResult.chartData.length < 2) {
      // Line charts need at least 2 points to draw a meaningful line
      return {};
    }
    if (execResult.chartType === 'scatter' && execResult.chartData.length < 3) {
      return {};
    }

    return {
      chartType: execResult.chartType,
      chartData: execResult.chartData,
      chartConfig: execResult.chartConfig,
    };
  }

  return {};
}

