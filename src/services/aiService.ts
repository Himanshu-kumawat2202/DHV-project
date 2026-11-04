/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Grounded NIRF AI Assistant Service
 * 
 * 1. Scope Classification:
 *    Refuses non-NIRF questions with:
 *    "I can only answer questions about the NIRF ranking data and the analysis in this dashboard."
 * 2. LLM Question Understanding:
 *    Calls the backend API (/api/ai-query) to convert question into structured JSON.
 * 3. Fallback:
 *    If the LLM call fails, displays a clear error message. Never silently uses keyword matching or defaults.
 * 4. Deterministic Execution:
 *    Computes all rankings, scores, correlations, and comparisons in code on real NIRF data (2017–2025).
 */

import { AIQueryResponse } from '../types';
import { executeStructuredQuery } from './aiQueryExecutor';
import { LLMQueryUnderstanding } from '../server/geminiParser';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  responsePayload?: AIQueryResponse;
}

export const SUGGESTED_QUERIES = [
  'Rank of AIIMS Bhopal in 2024',
  'IIT Mandi score in 2023',
  'Rank of MIT in 2024',
  'Correlation of TLR and overall score',
  'Compare IIT Dharwad and IIT Mandi',
  'Trend of IIT Madras from 2017 to 2025',
];

/**
 * Strict Scope Classifier:
 * Classifies every question as IN_SCOPE or OUT_OF_SCOPE.
 */
export function classifyQueryScope(query: string): 'IN_SCOPE' | 'OUT_OF_SCOPE' {
  const q = query.toLowerCase().trim();
  if (!q) return 'OUT_OF_SCOPE';

  // Explicit Out-of-Scope triggers (sports, non-academic trivia, creative writing, recipes, weather, politics)
  const explicitOutPatterns = [
    /\bcapital of\b/i,
    /\bweather\b/i,
    /\brecipe\b/i,
    /\bhow to cook\b/i,
    /\bhow do i cook\b/i,
    /\bhow to make\b/i,
    /\bjoke\b/i,
    /\bpoem\b/i,
    /\bpoetry\b/i,
    /\bstory\b/i,
    /\bsong\b/i,
    /\blyrics\b/i,
    /\bmovie\b/i,
    /\bcricket\b/i,
    /\bipl\b/i,
    /\bfootball\b/i,
    /\bworld cup\b/i,
    /\bindia vs pakistan\b/i,
    /\bpakistan vs india\b/i,
    /\bwho won\b/i,
    /\bwho is elon\b/i,
    /\bwho is trump\b/i,
    /\bwho is narendra modi\b/i,
    /\bpolitics\b/i,
    /\bpresident of\b/i,
    /\bprime minister of\b/i,
    /\bwrite a (python|javascript|code|script|essay|email|letter)\b/i,
    /\bstock price\b/i,
    /\bcrypto\b/i,
    /\bbitcoin\b/i,
  ];

  for (const pattern of explicitOutPatterns) {
    if (pattern.test(q)) {
      return 'OUT_OF_SCOPE';
    }
  }

  // Positive in-scope signals:
  // Must touch upon Indian higher education, NIRF rankings, evaluation parameters, or dashboard analytics
  const inScopeKeywords = [
    'nirf', 'rank', 'ranking', 'score', 'scores', 'cutoff', 'college', 'colleges', 'universit',
    'institut', 'institution', 'iit', 'nit', 'iim', 'iisc', 'aiims', 'iiit', 'iiser', 'niper',
    'bits', 'jnu', 'bhu', 'du', 'delhi university', 'jamia', 'amrita', 'vit', 'manipal', 'thapar',
    'mit', 'tlr', 'rpc', 'go', 'oi', 'pr', 'perception', 'teaching', 'research', 'graduation', 'outreach',
    'citation', 'citations', 'publication', 'publications', 'overall', 'engineering', 'management',
    'pharmacy', 'medical', 'law', 'architecture', 'dental', 'agriculture', 'state public university',
    'top', 'best', 'compare', 'comparison', 'versus', 'vs', 'improver', 'improvers', 'climber',
    'climbers', 'decline', 'decliners', 'trend', 'trajectory', 'correlation', 'outlier', 'outliers',
    'anomaly', 'distribution', 'histogram', 'average', 'mean', 'median', 'standard deviation',
    'variance', 'pca', 'geospatial', 'states', 'state', 'dataset', 'dashboard', 'parameters'
  ];

  const hasSignal = inScopeKeywords.some((kw) => q.includes(kw));
  if (!hasSignal) {
    return 'OUT_OF_SCOPE';
  }

  return 'IN_SCOPE';
}

/**
 * Main query processor:
 * 1. Classifies query scope. If OUT_OF_SCOPE: returns standard refusal message.
 * 2. Calls Gemini API backend for structured question understanding.
 * 3. If LLM call fails, reports a clear error message (never silently falls back to keyword guessing).
 * 4. Executes deterministic calculation on real NIRF data.
 */
export async function processAIQuery(
  query: string,
  history?: ChatMessage[]
): Promise<AIQueryResponse> {
  // 1. Mandatory Scope Classification Gate
  if (classifyQueryScope(query) === 'OUT_OF_SCOPE') {
    return {
      answer: 'I can only answer questions about the NIRF ranking data and the analysis in this dashboard.',
      isOutOfScope: true,
    };
  }

  let structuredQuery: LLMQueryUnderstanding | null = null;

  // 2. Call backend Gemini query parser
  try {
    const formattedHistory = history
      ? history.slice(-6).map((m) => ({ sender: m.sender, text: m.text }))
      : [];

    const res = await fetch('/api/ai-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history: formattedHistory }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        answer: `AI Language Model Error (${res.status}): ${errText || 'The server failed to parse the question.'}`,
        isError: true,
      };
    }

    const data = await res.json();

    if (data.error) {
      return {
        answer: `AI Service Notice: ${data.error}`,
        isError: true,
      };
    }

    if (data.parsedQuery) {
      structuredQuery = data.parsedQuery;
    }
  } catch (err) {
    return {
      answer: `Unable to connect to the AI Query Service: ${err instanceof Error ? err.message : String(err)}. Please check your backend connection and ensure GEMINI_API_KEY is configured in .env.`,
      isError: true,
    };
  }

  if (!structuredQuery) {
    return {
      answer:
        'Could not obtain structured understanding from the AI language model. Please verify your GEMINI_API_KEY in .env and try again.',
      isError: true,
    };
  }

  // 3. Double-check if parser identified question as out of scope
  if (structuredQuery.intent === 'out_of_scope') {
    return {
      answer: 'I can only answer questions about the NIRF ranking data and the analysis in this dashboard.',
      isOutOfScope: true,
    };
  }

  // 4. Execute deterministic calculation on verified real NIRF dataset
  return executeStructuredQuery(structuredQuery, query);
}
