/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Preprocessor
 * Normalizes input queries, standardizes terminology, and extracts numerical anchors.
 */

import { PreprocessedText } from './types';
import { YEARS } from '../../data/nirfData';

// Common synonyms mapping to canonical NIRF terminology
const SYNONYM_REPLACEMENTS: [RegExp, string][] = [
  [/\bvs\.?\b/gi, 'versus'],
  [/\bcompared to\b/gi, 'versus'],
  [/\bcompare with\b/gi, 'versus'],
  [/\branking progression\b/gi, 'ranking trend'],
  [/\brank progression\b/gi, 'ranking trend'],
  [/\brank trajectory\b/gi, 'ranking trend'],
  [/\bperformance over time\b/gi, 'ranking trend'],
  [/\bover the years\b/gi, 'trend'],
  [/\bacross years\b/gi, 'trend'],
  [/\bfrom (\d{4})\s*-\s*(\d{4})\b/gi, 'from $1 to $2'],
  [/\b(\d{4})\s*-\s*(\d{4})\b/gi, 'between $1 and $2'],
  [/\btop\s*-\s*(\d+)\b/gi, 'top $1'],
  [/\bfirst\s*(\d+)\b/gi, 'top $1'],
  [/\bbest\s*(\d+)\b/gi, 'top $1'],
  [/\bhighest climbing\b/gi, 'highest improvement'],
  [/\bbiggest improver\b/gi, 'highest improvement'],
  [/\bmost improved\b/gi, 'highest improvement'],
  [/\bbiggest drop\b/gi, 'largest decline'],
  [/\bbiggest decline\b/gi, 'largest decline'],
  [/\bmost declined\b/gi, 'largest decline'],
  [/\blargest fall\b/gi, 'largest decline'],
  [/\banomalies\b/gi, 'outliers'],
  [/\banomaly\b/gi, 'outlier'],
  [/\bvariation\b/gi, 'variability'],
  [/\bspread\b/gi, 'dispersion'],
  [/\bstate-wise\b/gi, 'state wise'],
  [/\bstatewise\b/gi, 'state wise'],
  [/\bgeo-spatial\b/gi, 'geographical'],
  [/\bgeospatial\b/gi, 'geographical'],
];

/**
 * Basic Porter-like suffix stripper for robust keyword matching
 */
export function simpleStem(token: string): string {
  let s = token.toLowerCase();
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('ing') && s.length > 5) return s.slice(0, -3);
  if (s.endsWith('tion') && s.length > 6) return s.slice(0, -4);
  if (s.endsWith('ions') && s.length > 6) return s.slice(0, -4);
  if (s.endsWith('ment') && s.length > 6) return s.slice(0, -4);
  if (s.endsWith('ness') && s.length > 6) return s.slice(0, -4);
  if (s.endsWith('ers') && s.length > 5) return s.slice(0, -3);
  if (s.endsWith('ed') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('es') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

/**
 * Preprocesses a raw natural language query
 */
export function preprocessQuery(query: string): PreprocessedText {
  const originalText = query || '';
  let normalized = originalText.trim().toLowerCase();

  // Apply canonical synonym replacements
  for (const [pattern, replacement] of SYNONYM_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Remove trailing question marks, exclamation marks, or stray punctuation, but keep hyphens in names
  const cleaned = normalized.replace(/[?!;:`"'\(\)]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract raw tokens
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const stemmedTokens = tokens.map(simpleStem);

  // Extract all 4-digit years mentioned (e.g. 2012, 2017, 2024, 2028)
  const yearRegex = /\b(19\d{2}|20\d{2})\b/g;
  const yearsDetected: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = yearRegex.exec(cleaned)) !== null) {
    const yr = parseInt(match[1], 10);
    if (!yearsDetected.includes(yr)) {
      yearsDetected.push(yr);
    }
  }

  // Extract other numerical values (e.g. 5 for top 5, 10 for top 10)
  const numbers: number[] = [];
  const numRegex = /\b\d+\b/g;
  while ((match = numRegex.exec(cleaned)) !== null) {
    const n = parseInt(match[0], 10);
    if (!yearsDetected.includes(n)) {
      numbers.push(n);
    }
  }

  return {
    originalText,
    normalizedText: cleaned,
    tokens,
    stemmedTokens,
    numbers,
    yearsDetected: yearsDetected.sort((a, b) => a - b),
  };
}
