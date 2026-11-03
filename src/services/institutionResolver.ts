/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Grounded NIRF Institution Name Resolution Engine
 * Resolves natural language institution names using premier aliases, exact IDs, acronyms, and fuzzy matching.
 * 
 * Rules:
 * 1. Clear single match -> returns 'exact' resolution.
 * 2. Several close matches (e.g. 'MIT') -> returns 'ambiguous' resolution with matched candidates.
 * 3. No match -> returns 'not_found' resolution with closest name suggestions.
 * 4. NEVER fall back to the top-ranked institution (IIT Madras).
 */

import { INSTITUTIONS, RANKINGS } from '../data/nirfData';
import { Institution, RankingRecord } from '../types';

export type InstitutionResolution =
  | {
      status: 'exact';
      institution: Institution;
      confidence: number;
    }
  | {
      status: 'ambiguous';
      input: string;
      matches: Institution[];
    }
  | {
      status: 'not_found';
      input: string;
      suggestions: Institution[];
    };

// Map of canonical IDs for instant lookup
const ID_MAP = new Map<string, Institution>(INSTITUTIONS.map((i) => [i.institution_id, i]));

// Premier and common aliases mapped directly to official institution IDs
const PREMIER_ALIASES: Record<string, string> = {
  // AIIMS
  'aiims bhopal': 'all-india-institute-of-medical-sciences-bhopa',
  'aiims new delhi': 'all-india-institute-of-medical-sciences-new-delhi',
  'aiims delhi': 'all-india-institute-of-medical-sciences-new-delhi',
  'aiims jodhpur': 'all-india-institute-of-medical-sciences-jodhpur',
  'aiims rishikesh': 'all-india-institute-of-medical-sciences-rishikesh',
  'aiims bhubaneswar': 'all-india-institute-of-medical-sciences-bhubaneswar',
  'aiims patna': 'all-india-institute-of-medical-sciences-patna',
  'aiims nagpur': 'all-india-institute-of-medical-sciences-nagpur',
  'aiims raipur': 'all-india-institute-of-medical-sciences-raipur',

  // IITs
  'iit mandi': 'iit-mandi',
  'iit dharwad': 'indian-institute-of-technology-dharwad',
  'iit madras': 'iit-madras',
  'iit bombay': 'iit-bombay',
  'iit delhi': 'iit-delhi',
  'iit kanpur': 'iit-kanpur',
  'iit kharagpur': 'iit-kharagpur',
  'iit roorkee': 'iit-roorkee',
  'iit guwahati': 'iit-guwahati',
  'iit hyderabad': 'iit-hyderabad',
  'iit bhu': 'indian-institute-of-technology-banaras-hindu-u',
  'iit varanasi': 'indian-institute-of-technology-banaras-hindu-u',
  'iit tirupati': 'indian-institute-of-technology-tirupati',
  'iit palakkad': 'indian-institute-of-technology-palakkad',
  'iit goa': 'indian-institute-of-technology-goa',
  'iit jammu': 'indian-institute-of-technology-jammu',
  'iit bhilai': 'indian-institute-of-technology-bhilai',
  'iit patna': 'indian-institute-of-technology-patna',
  'iit gandhinagar': 'indian-institute-of-technology-gandhinagar',
  'iit ropar': 'indian-institute-of-technology-ropar',
  'iit indore': 'indian-institute-of-technology-indore',
  'iit ism dhanbad': 'indian-institute-of-technology-indian-school-of-m',
  'iit dhanbad': 'indian-institute-of-technology-indian-school-of-m',

  // IISc & Central Universities
  'iisc': 'iisc-bangalore',
  'iisc bangalore': 'iisc-bangalore',
  'iisc bengaluru': 'iisc-bangalore',
  'indian institute of science': 'iisc-bangalore',
  'jnu': 'jawaharlal-nehru-university',
  'bhu': 'banaras-hindu-university',
  'du': 'university-of-delhi',
  'delhi university': 'university-of-delhi',
  'university of delhi': 'university-of-delhi',
  'jamia': 'jamia-millia-islamia',
  'jamia millia': 'jamia-millia-islamia',
  'jamia millia islamia': 'jamia-millia-islamia',
  'amrita': 'amrita-vishwa-vidyapeetham',
  'amrita vishwa vidyapeetham': 'amrita-vishwa-vidyapeetham',
  'bits': 'birla-institute-of-technology-science-pilani',
  'bits pilani': 'birla-institute-of-technology-science-pilani',
  'vit': 'vellore-institute-of-technology',
  'vit vellore': 'vellore-institute-of-technology',
  'thapar': 'thapar-institute-of-engineering-technology',
  'manipal': 'manipal-academy-of-higher-education',
};

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Dice's coefficient / token similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Exact substring containment bonus
  if (s2.includes(s1) || s1.includes(s2)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return 0.85 + 0.15 * (minLen / maxLen);
  }

  const tokens1 = new Set(s1.split(' ').filter((w) => w.length > 1));
  const tokens2 = new Set(s2.split(' ').filter((w) => w.length > 1));

  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let common = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) common++;
  });

  return (2 * common) / (tokens1.size + tokens2.size);
}

/**
 * Resolves an institution name entered by a user into an official NIRF dataset record.
 */
export function resolveInstitutionName(rawName: string): InstitutionResolution {
  const input = rawName.trim();
  const norm = normalizeString(input);

  if (!norm) {
    return { status: 'not_found', input, suggestions: [] };
  }

  // 1. Direct ID lookup
  if (ID_MAP.has(norm)) {
    return { status: 'exact', institution: ID_MAP.get(norm)!, confidence: 1.0 };
  }

  // 2. Premier aliases lookup
  if (PREMIER_ALIASES[norm] && ID_MAP.has(PREMIER_ALIASES[norm])) {
    return { status: 'exact', institution: ID_MAP.get(PREMIER_ALIASES[norm])!, confidence: 1.0 };
  }

  // 3. Exact short_name or institution_name match
  const exactShort = INSTITUTIONS.find((i) => normalizeString(i.short_name) === norm);
  if (exactShort) {
    return { status: 'exact', institution: exactShort, confidence: 1.0 };
  }

  const exactFull = INSTITUTIONS.find((i) => normalizeString(i.institution_name) === norm);
  if (exactFull) {
    return { status: 'exact', institution: exactFull, confidence: 1.0 };
  }

  // 4. Short Acronym check (e.g. "MIT", "BITS", "NIT")
  // If the query is an acronym (<= 5 letters), match whole word occurrences
  if (norm.length <= 5) {
    const acronymMatches = INSTITUTIONS.filter((i) => {
      const words = (i.short_name + ' ' + i.institution_name).toLowerCase().split(/[\s,.-]+/);
      return words.includes(norm);
    });

    // Deduplicate by institution_name
    const uniqueMatches: Institution[] = [];
    const seen = new Set<string>();
    for (const m of acronymMatches) {
      if (!seen.has(m.institution_name)) {
        seen.add(m.institution_name);
        uniqueMatches.push(m);
      }
    }

    if (uniqueMatches.length > 1) {
      return { status: 'ambiguous', input, matches: uniqueMatches.slice(0, 6) };
    }
    if (uniqueMatches.length === 1) {
      return { status: 'exact', institution: uniqueMatches[0], confidence: 0.95 };
    }
  }

  // 5. Scored candidate matching across all institutions
  const candidates: Array<{ inst: Institution; score: number }> = [];

  for (const inst of INSTITUTIONS) {
    const scoreShort = calculateSimilarity(norm, inst.short_name);
    const scoreFull = calculateSimilarity(norm, inst.institution_name);
    const scoreId = calculateSimilarity(norm, inst.institution_id);
    const bestScore = Math.max(scoreShort, scoreFull, scoreId);

    if (bestScore > 0.4) {
      candidates.push({ inst, score: bestScore });
    }
  }

  // Deduplicate candidates by institution_name (picking best score)
  const uniqueMap = new Map<string, { inst: Institution; score: number }>();
  for (const c of candidates) {
    const existing = uniqueMap.get(c.inst.institution_name);
    if (!existing || c.score > existing.score) {
      uniqueMap.set(c.inst.institution_name, c);
    }
  }
  const uniqueCandidates = Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);

  if (uniqueCandidates.length === 0) {
    return { status: 'not_found', input, suggestions: [] };
  }

  const top1 = uniqueCandidates[0];
  const top2 = uniqueCandidates[1];

  // If top candidate is very confident and has clear margin
  if (top1.score >= 0.8 && (!top2 || top1.score - top2.score >= 0.15)) {
    return { status: 'exact', institution: top1.inst, confidence: top1.score };
  }

  // If multiple candidates have high, close scores (ambiguous)
  if (top1.score >= 0.65 && top2 && top1.score - top2.score < 0.15) {
    const closeMatches = uniqueCandidates
      .filter((c) => c.score >= 0.6 && top1.score - c.score <= 0.15)
      .map((c) => c.inst)
      .slice(0, 5);
    return { status: 'ambiguous', input, matches: closeMatches };
  }

  // If top match is moderately good (>= 0.7) and margin >= 0.1
  if (top1.score >= 0.7 && (!top2 || top1.score - top2.score >= 0.1)) {
    return { status: 'exact', institution: top1.inst, confidence: top1.score };
  }

  // Otherwise, not found with closest suggestions
  return {
    status: 'not_found',
    input,
    suggestions: uniqueCandidates.slice(0, 3).map((c) => c.inst),
  };
}

/**
 * Checks data availability for an institution across NIRF years and categories.
 */
export function checkDataAvailability(
  institutionId: string,
  requestedYear?: number,
  requestedCategory?: string | null
): {
  available: boolean;
  targetCategory: string;
  targetYear: number;
  exactRecord?: RankingRecord;
  sameYearOtherCategories: RankingRecord[];
  allAppearances: RankingRecord[];
  summaryMessage: string;
} {
  const allAppearances = RANKINGS.filter((r) => r.institution_id === institutionId);
  const targetYear = requestedYear || 2024;
  const targetCategory = requestedCategory || 'Overall';

  const exactRecord = allAppearances.find(
    (r) => r.year === targetYear && (requestedCategory === 'All' || r.category === targetCategory)
  );

  const sameYearOtherCategories = allAppearances.filter(
    (r) => r.year === targetYear && r.category !== targetCategory
  );

  if (exactRecord) {
    return {
      available: true,
      targetCategory,
      targetYear,
      exactRecord,
      sameYearOtherCategories,
      allAppearances,
      summaryMessage: '',
    };
  }

  // If exact record not found, build detailed availability explanation
  let summaryMessage = '';
  const inst = ID_MAP.get(institutionId);
  const instName = inst?.short_name || institutionId;

  if (sameYearOtherCategories.length > 0) {
    const otherDetails = sameYearOtherCategories
      .map((r) => `Rank #${r.rank} in ${r.category} (Score: ${r.overall_score})`)
      .join(', ');
    summaryMessage = `${instName} has no ${targetCategory} ranking in ${targetYear}. It was ranked ${otherDetails} in ${targetYear}.`;
  } else if (allAppearances.length > 0) {
    const uniqueYears = Array.from(new Set(allAppearances.map((r) => r.year))).sort((a, b) => a - b);
    const catsAndYears = allAppearances
      .map((r) => `${r.category} in ${r.year} (Rank #${r.rank})`)
      .slice(0, 4)
      .join(', ');
    summaryMessage = `${instName} has no ranking records in ${targetYear}. However, it appears in: ${catsAndYears} (Years: ${uniqueYears.join(', ')}).`;
  } else {
    summaryMessage = `${instName} has no published ranking records in the NIRF dataset.`;
  }

  return {
    available: false,
    targetCategory,
    targetYear,
    sameYearOtherCategories,
    allAppearances,
    summaryMessage,
  };
}

