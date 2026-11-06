/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Pipeline Entry Point
 * Complete rule-based and statistical natural language query system for NIRF Insights.
 * Fully offline, grounded, and independent of external LLM APIs.
 */

import { preprocessQuery } from './preprocessor';
import { extractEntities } from './entityExtractor';
import { classifyIntent } from './intentClassifier';
import { parseQuery } from './queryParser';
import { executeNLPQuery } from './queryExecutor';
import { selectChart } from './chartSelector';
import { generateResponse } from './responseGenerator';
import { StructuredQuery, NLPExecutionResult } from './types';
import { AIQueryResponse } from '../../types';
import {
  isLLMConfigured,
  interpretQueryWithLLM,
  validateAndPlanQuery,
  explainResultsWithLLM,
  extractContextFromHistory,
  updateSessionContext,
  getSessionContext,
} from '../llm/index';

export * from './types';
export * from './preprocessor';
export * from './entityExtractor';
export * from './intentClassifier';
export * from './queryParser';
export * from './queryExecutor';
export * from './chartSelector';
export * from './responseGenerator';

export interface NLPProcessOptions {
  skipLLM?: boolean;
  sessionId?: string;
}

/**
 * Main pipeline coordinator: Processes a natural language question into verified analysis and response.
 * Uses a hybrid LLM + Deterministic Architecture:
 * - Layer 1: LLM Query Understanding (with context inheritance)
 * - Layer 2: Strict Validation & Query Planning against official NIRF records
 * - Layer 3: Deterministic Query Execution on verified NIRF dataset
 * - Layer 4: LLM Response Explanation Synthesis (preserving exact numbers)
 * - Layer 5: Fallback to complete deterministic rule-based NLP engine if LLM fails
 */
export async function processNaturalLanguageQuery(
  rawQuery: string,
  history?: Array<{ sender: string; text: string }>,
  options?: NLPProcessOptions
): Promise<NLPExecutionResult> {
  const startTime = Date.now();
  let source: 'hybrid_llm' | 'deterministic' = 'deterministic';
  let queryUnderstandingUsed = false;
  let explanationUsed = false;
  let llmError: string | undefined;

  // 1. Conversational Context Resolution
  const historyContext = extractContextFromHistory(history);
  if (options?.sessionId) {
    const sessionContext = getSessionContext(options.sessionId);
    if (sessionContext) {
      Object.assign(historyContext, sessionContext);
    }
  }

  let structuredQuery: StructuredQuery | null = null;

  // 2. Layer 1 & 2: LLM Question Understanding & Validation
  const canUseLLM = isLLMConfigured() && !options?.skipLLM;

  if (canUseLLM) {
    try {
      const llmInterpret = await interpretQueryWithLLM(rawQuery, history);
      if (llmInterpret.success && llmInterpret.understanding) {
        const valResult = validateAndPlanQuery(llmInterpret.understanding, rawQuery, historyContext);
        if (valResult.isValid && valResult.structuredQuery) {
          structuredQuery = valResult.structuredQuery;
          source = 'hybrid_llm';
          queryUnderstandingUsed = true;
        } else {
          llmError = valResult.validationError || 'LLM validation failed';
        }
      } else {
        llmError = llmInterpret.error || 'LLM interpretation failed';
      }
    } catch (err: unknown) {
      llmError = err instanceof Error ? err.message : String(err);
    }
  }

  // 3. Deterministic NLP Fallback if LLM is not configured, skipped, or failed
  if (!structuredQuery) {
    source = 'deterministic';
    const preprocessed = preprocessQuery(rawQuery);
    const entities = extractEntities(preprocessed);

    // Apply conversational context inheritance if entities were omitted in a follow-up
    if (!entities.category && historyContext.lastCategory) {
      entities.category = historyContext.lastCategory;
    }
    if (entities.years.length === 0 && historyContext.lastYear) {
      entities.years = [historyContext.lastYear];
    }
    if (entities.parameters.length === 0 && historyContext.lastParameter) {
      entities.parameters = [historyContext.lastParameter];
    }

    const intentResult = classifyIntent(preprocessed, entities);

    // If this is an elliptical follow-up query without an explicit new intent trigger, inherit prior intent
    const isEllipticalFollowUp =
      /^(what|how)\s+about\b/i.test(rawQuery.trim()) ||
      /^(and\s+for|what\s+of|and\s+in)\b/i.test(rawQuery.trim());

    if (isEllipticalFollowUp && historyContext.lastIntent) {
      if (
        (historyContext.lastIntent === 'parameter_correlation' && entities.parameters.length > 0) ||
        (historyContext.lastIntent === 'rank_lookup' && entities.institutions.length > 0) ||
        (historyContext.lastIntent === 'score_lookup' && (entities.institutions.length > 0 || entities.parameters.length > 0)) ||
        (historyContext.lastIntent === 'institution_trend' && entities.institutions.length > 0)
      ) {
        intentResult.intent = historyContext.lastIntent;
      }
    }

    structuredQuery = parseQuery(preprocessed, entities, intentResult);
  }

  // 4. Layer 3: Deterministic Data Execution on real verified NIRF dataset
  const execResult = executeNLPQuery(structuredQuery, rawQuery);

  // 5. Visual Chart Selection
  const visuals = selectChart(structuredQuery, execResult);

  // 6. Grounded Response & Metadata Assembly
  const response: AIQueryResponse = generateResponse(structuredQuery, execResult, visuals);

  // 7. Layer 4: LLM Response Explanation Synthesis
  if (canUseLLM && !execResult.isOutOfScope && !execResult.isError && execResult.data) {
    try {
      const explResult = await explainResultsWithLLM(rawQuery, execResult, structuredQuery);
      if (explResult.success && explResult.explanation) {
        response.explanation = explResult.explanation;
        explanationUsed = true;
      }
    } catch {
      // Retain deterministic explanation if LLM explainer encounters an issue
    }
  }

  // 8. Update Conversational Context for subsequent turns
  if (options?.sessionId || history) {
    const contextUpdate: Record<string, any> = {};
    if (structuredQuery.entities.institutions.length > 0) {
      contextUpdate.lastInstitution = structuredQuery.entities.institutions[0].shortName || structuredQuery.entities.institutions[0].raw;
      contextUpdate.lastInstitutions = structuredQuery.entities.institutions.map((i) => i.shortName || i.raw);
    }
    if (structuredQuery.entities.category) {
      contextUpdate.lastCategory = structuredQuery.entities.category;
    }
    if (structuredQuery.entities.years.length > 0) {
      contextUpdate.lastYear = structuredQuery.entities.years[0];
      contextUpdate.lastYears = structuredQuery.entities.years;
    }
    if (structuredQuery.entities.parameters.length > 0) {
      contextUpdate.lastParameter = structuredQuery.entities.parameters[0];
      contextUpdate.lastParameters = structuredQuery.entities.parameters;
    }
    if (structuredQuery.intent) {
      contextUpdate.lastIntent = structuredQuery.intent;
    }

    if (options?.sessionId) {
      updateSessionContext(options.sessionId, contextUpdate);
    }
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    success: !execResult.isError && !execResult.isOutOfScope,
    intent: structuredQuery.intent,
    query: structuredQuery,
    response,
    executionTimeMs,
    source,
    llmStatus: {
      configured: canUseLLM,
      queryUnderstandingUsed,
      explanationUsed,
      error: llmError,
    },
  };
}

