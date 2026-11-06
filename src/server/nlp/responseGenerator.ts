/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Response Generator
 * Assembles final AIQueryResponse payload containing grounded answers, calculation breakdowns, and visualizations.
 */

import { StructuredQuery } from './types';
import { QueryExecutionResult } from './queryExecutor';
import { VisualConfiguration } from './chartSelector';
import { AIQueryResponse } from '../../types';

/**
 * Generates the full user-facing AIQueryResponse payload
 */
export function generateResponse(
  sq: StructuredQuery,
  execResult: QueryExecutionResult,
  visuals: VisualConfiguration
): AIQueryResponse {
  const response: AIQueryResponse = {
    answer: execResult.summary,
    explanation: execResult.explanation,
    structuredSections: execResult.structuredSections,
    isOutOfScope: execResult.isOutOfScope,
    isDatasetQuery: execResult.isDatasetQuery,
    isError: execResult.isError,
  };

  if (execResult.isDatasetQuery && execResult.data) {
    response.dataSummary = execResult.data;
  }

  if (visuals.chartType && visuals.chartData && visuals.chartData.length > 0) {
    response.chartType = visuals.chartType;
    response.chartData = visuals.chartData;
    response.chartConfig = visuals.chartConfig;
  }

  if (execResult.calculationDetails) {
    response.calculationDetails = execResult.calculationDetails;
  }

  return response;
}

