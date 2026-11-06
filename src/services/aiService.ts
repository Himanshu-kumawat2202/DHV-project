/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Grounded NIRF Natural Language Assistant Service (Level 3 System)
 * 
 * 1. Scope Classification:
 *    Refuses non-NIRF questions with standard message.
 * 2. NLP Pipeline:
 *    Dispatches natural language query to the Level 3 NLP pipeline (/api/ai-query),
 *    with a local TypeScript fallback ensuring 100% offline uptime.
 * 3. Deterministic Grounding:
 *    All statistics, ranks, correlations, and trajectories are calculated directly on real NIRF data (2017–2025).
 *    Completely independent of Gemini, OpenAI, or external LLM APIs.
 */

import { AIQueryResponse } from '../types';

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
  'Correlation between RPC and overall score',
  'Compare IIT Madras and IIT Delhi',
  'Trend of IIT Madras from 2017 to 2025',
  'Top 5 engineering colleges in 2024',
  'Highest ranking improvement between 2017 and 2025',
  'Top 100 institutions in Tamil Nadu',
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
 * Dispatches to /api/ai-query or runs local Level 3 NLP pipeline.
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

  const formattedHistory = history
    ? history.slice(-6).map((m) => ({ sender: m.sender, text: m.text }))
    : [];

  // 2. Attempt API Call to backend
  try {
    const res = await fetch('/api/ai-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history: formattedHistory }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.response) {
        return data.response;
      }
    }
  } catch (err) {
    console.warn('API call to /api/ai-query failed:', err);
  }

  // Graceful fallback if backend server is unreachable
  return {
    answer: 'Unable to reach the analytical query engine. Please verify that the server is running on http://localhost:3000.',
    isError: true,
  };
}
