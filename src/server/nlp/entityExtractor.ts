/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Entity Extractor
 * Extracts institutions, categories, parameters, years, states, and numerical bounds.
 * Reuses the grounded institution resolver from src/services/institutionResolver.ts.
 */

import { PreprocessedText, ExtractedEntities } from './types';
import { CATEGORIES, STATES, YEARS } from '../../data/nirfData';
import { resolveInstitutionName, InstitutionResolution } from '../../services/institutionResolver';
import { CategoryType, ParameterKey, Institution } from '../../types';

// Normalized category mapping table
const CATEGORY_MAP: Record<string, CategoryType> = {
  overall: 'Overall',
  engineering: 'Engineering',
  engineer: 'Engineering',
  tech: 'Engineering',
  technical: 'Engineering',
  btech: 'Engineering',
  management: 'Management',
  mba: 'Management',
  business: 'Management',
  'b-school': 'Management',
  bschool: 'Management',
  university: 'University',
  universities: 'University',
  college: 'College',
  colleges: 'College',
  arts: 'College',
  medical: 'Medical',
  medicine: 'Medical',
  mbbs: 'Medical',
  pharmacy: 'Pharmacy',
  pharma: 'Pharmacy',
  law: 'Law',
  legal: 'Law',
  architecture: 'Architecture',
  arch: 'Architecture',
  dental: 'Dental',
  dentistry: 'Dental',
  dentist: 'Dental',
  agriculture: 'Agriculture',
  agri: 'Agriculture',
  research: 'Research',
  'state public university': 'State Public University',
  'state university': 'State Public University',
  'state public': 'State Public University',
};

// Parameter synonyms
const PARAMETER_MAP: Record<string, ParameterKey> = {
  tlr: 'TLR',
  teaching: 'TLR',
  learning: 'TLR',
  resources: 'TLR',
  faculty: 'TLR',
  rpc: 'RPC',
  research: 'RPC',
  publication: 'RPC',
  publications: 'RPC',
  citation: 'RPC',
  citations: 'RPC',
  patent: 'RPC',
  patents: 'RPC',
  go: 'GO',
  graduation: 'GO',
  outcome: 'GO',
  outcomes: 'GO',
  placement: 'GO',
  placements: 'GO',
  salary: 'GO',
  oi: 'OI',
  outreach: 'OI',
  inclusivity: 'OI',
  diversity: 'OI',
  women: 'OI',
  pr: 'PR',
  perception: 'PR',
  reputation: 'PR',
  peer: 'PR',
};

/**
 * Extracts all relevant entities from the preprocessed natural language query.
 */
export function extractEntities(p: PreprocessedText): ExtractedEntities {
  const norm = p.normalizedText;

  // 1. EXTRACT YEARS & YEAR RANGES
  const years = [...p.yearsDetected];
  let yearRange: { startYear: number; endYear: number } | undefined;

  // Check for explicit range patterns: "from 2017 to 2025", "between 2019 and 2023"
  const rangeMatch =
    norm.match(/(?:from|between)\s+(201[7-9]|202[0-5])\s+(?:to|and)\s+(201[7-9]|202[0-5])/i) ||
    norm.match(/(201[7-9]|202[0-5])\s*(?:to|-)\s*(201[7-9]|202[0-5])/i);

  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1], 10);
    const y2 = parseInt(rangeMatch[2], 10);
    yearRange = {
      startYear: Math.min(y1, y2),
      endYear: Math.max(y1, y2),
    };
  } else if (years.length >= 2) {
    yearRange = {
      startYear: Math.min(...years),
      endYear: Math.max(...years),
    };
  }

  // 2. EXTRACT CATEGORY
  let category: CategoryType | 'All' | null = null;
  // Sort category keys by length descending to match multi-word phrases first
  const catKeys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const k of catKeys) {
    const pattern = new RegExp(`\\b${k}\\b`, 'i');
    if (pattern.test(norm)) {
      category = CATEGORY_MAP[k];
      break;
    }
  }

  // If no known category was matched, check for explicit unknown category mentions:
  // e.g. "in robotics", "in category xyz", "xyz category"
  if (!category) {
    const explicitCatMatch =
      norm.match(/(?:in\s+category\s+|category\s+)([a-z]+)/i) ||
      norm.match(/\bin\s+([a-z]+)\s+(?:201\d|202\d)\b/i);

    if (explicitCatMatch) {
      const cand = explicitCatMatch[1].trim();
      // Ensure candidate is not a state, parameter, or year word
      const isState = STATES.some((s) => s.toLowerCase() === cand.toLowerCase());
      const isParam = ['tlr', 'rpc', 'go', 'oi', 'pr', 'overall'].includes(cand.toLowerCase());
      if (!isState && !isParam && cand.length > 3) {
        category = (cand.charAt(0).toUpperCase() + cand.slice(1)) as any;
      }
    }
  }

  // 3. EXTRACT NIRF PARAMETERS
  const foundParams: ParameterKey[] = [];
  for (const [paramWord, paramKey] of Object.entries(PARAMETER_MAP)) {
    const pattern = new RegExp(`\\b${paramWord}\\b`, 'i');
    if (pattern.test(norm) && !foundParams.includes(paramKey)) {
      foundParams.push(paramKey);
    }
  }

  // 4. EXTRACT STATES (Supports single state and state comparison)
  let foundState: string | undefined;
  let compState: string | undefined;

  // Sort states by length descending (e.g. "Andaman and Nicobar" before "Andhra Pradesh")
  const sortedStates = [...STATES].sort((a, b) => b.length - a.length);
  for (const s of sortedStates) {
    const pattern = new RegExp(`\\b${s.toLowerCase()}\\b`, 'i');
    if (pattern.test(norm)) {
      if (!foundState) {
        foundState = s;
      } else if (!compState && foundState.toLowerCase() !== s.toLowerCase()) {
        compState = s;
      }
    }
  }

  // 5. EXTRACT TOP-N NUMERICAL BOUNDS
  let topN: number | undefined;
  const topMatch = norm.match(/\btop\s*(\d{1,3})\b/i);
  if (topMatch) {
    topN = parseInt(topMatch[1], 10);
  } else if (/\btop\b/i.test(norm) && p.numbers.length > 0) {
    topN = p.numbers[0];
  }

  // 6. EXTRACT INSTITUTION(S)
  const institutions: ExtractedEntities['institutions'] = [];

  // Patterns indicating comparison of two institutions:
  // "compare X and Y", "X versus Y", "difference between X and Y"
  const compRegexes = [
    /(?:compare|comparison\s+between)\s+(.+?)\s+(?:and|versus|with)\s+(.+?)(?:\s+in\s+|\s+for\s+|$)/i,
    /(?:difference\s+between)\s+(.+?)\s+(?:and)\s+(.+?)(?:\s+in\s+|\s+for\s+|$)/i,
    /(.+?)\s+versus\s+(.+?)(?:\s+in\s+|\s+for\s+|$)/i,
  ];

  let comparisonInstitutionsFound = false;
  for (const regex of compRegexes) {
    const match = norm.match(regex);
    if (match) {
      const candidate1 = cleanInstitutionCandidate(match[1]);
      const candidate2 = cleanInstitutionCandidate(match[2]);

      // If both candidates are actual states (e.g. Tamil Nadu vs Karnataka), let state extraction handle comparison
      const cleanCand = (c: string) => c.toLowerCase().replace(/\b(institutions?|colleges?|universities?|state)\b/g, '').trim();
      const isState1 = STATES.some((s) => s.toLowerCase() === cleanCand(candidate1));
      const isState2 = STATES.some((s) => s.toLowerCase() === cleanCand(candidate2));
      if ((isState1 && isState2) || (foundState && compState)) {
        break;
      }

      const res1 = resolveInstitutionName(candidate1);
      const res2 = resolveInstitutionName(candidate2);

      if (res1.status !== 'not_found' || res2.status !== 'not_found') {
        institutions.push(formatResolvedInstitution(candidate1, res1));
        institutions.push(formatResolvedInstitution(candidate2, res2));
        comparisonInstitutionsFound = true;
        break;
      }
    }
  }

  if (!comparisonInstitutionsFound) {
    // Single institution pattern search
    // Check known premier phrases, IITs, NITs, AIIMS, Universities
    const instPatterns = [
      /\b(iit\s+[a-z]+)\b/i,
      /\b(nit\s+[a-z]+)\b/i,
      /\b(iiit\s+[a-z]+)\b/i,
      /\b(aiims\s+[a-z]+)\b/i,
      /\b(iim\s+[a-z]+)\b/i,
      /\b(iisc(?:\s+bangalore|\s+bengaluru)?)\b/i,
      /\b(bits(?:\s+pilani)?)\b/i,
      /\b(vit(?:\s+vellore)?)\b/i,
      /\b(jnu|bhu|du|amrita|manipal|thapar|anna\s+university|jadavpur\s+university)\b/i,
      /\b(university\s+of\s+[a-z]+)\b/i,
      /\b(delhi\s+university|aligarh\s+muslim\s+university|jamia(?:\s+millia)?)\b/i,
      /\b(mit)\b/i,
    ];

    let foundInstPhrase = '';
    for (const pat of instPatterns) {
      const m = norm.match(pat);
      if (m) {
        foundInstPhrase = m[1];
        break;
      }
    }

    // If no regex hit, inspect phrases around "rank of X", "trend of X", "score of X", "how has X performed"
    if (!foundInstPhrase) {
      const targetPhraseMatch =
        norm.match(/(?:rank|score|trend|trajectory|performance|progression)\s+of\s+([a-z0-9\s\.\-]+?)(?:\s+in|\s+between|\s+from|\s+for|$)/i) ||
        norm.match(/(?:how\s+has)\s+([a-z0-9\s\.\-]+?)\s+(?:performed|changed|ranked|moved)/i) ||
        norm.match(/(?:tell\s+me\s+about)\s+([a-z0-9\s\.\-]+?)(?:\s+in|\s+between|\s+from|\s+for|$)/i) ||
        norm.match(/(?:where\s+does)\s+([a-z0-9\s\.\-]+?)\s+(?:stand|rank)/i);

      if (targetPhraseMatch) {
        foundInstPhrase = cleanInstitutionCandidate(targetPhraseMatch[1]);
      }
    }

    if (foundInstPhrase) {
      const res = resolveInstitutionName(foundInstPhrase);
      institutions.push(formatResolvedInstitution(foundInstPhrase, res));
    }
  }

  // 7. DETERMINE METRIC
  let metric: ExtractedEntities['metric'] = 'all';
  if (foundParams.length === 1) {
    metric = foundParams[0];
  } else if (/\brank\b/i.test(norm)) {
    metric = 'rank';
  } else if (/\bscore\b/i.test(norm)) {
    metric = 'score';
  }

  return {
    institutions,
    category,
    years,
    yearRange,
    state: foundState,
    comparisonState: compState,
    parameters: foundParams,
    topN,
    metric,
  };
}

function cleanInstitutionCandidate(raw: string): string {
  return raw
    .replace(/\b(ranking|rank|score|trend|trajectory|performance|in|for|from|between)\b/gi, '')
    .trim();
}

function formatResolvedInstitution(raw: string, res: InstitutionResolution): ExtractedEntities['institutions'][0] {
  if (res.status === 'exact') {
    return {
      raw,
      resolvedId: res.institution.institution_id,
      name: res.institution.institution_name,
      shortName: res.institution.short_name,
      isAmbiguous: false,
    };
  }
  if (res.status === 'ambiguous') {
    return {
      raw,
      isAmbiguous: true,
      candidates: res.matches,
    };
  }
  return {
    raw,
    isAmbiguous: false,
  };
}
