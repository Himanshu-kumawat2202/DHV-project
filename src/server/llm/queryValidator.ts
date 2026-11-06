/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Layer 2: LLM Validation and Query Planning
 * Validates the LLM-extracted query against supported intents, NIRF categories,
 * years, parameters, and official institution records via the institution resolver.
 */

import { LLMQueryUnderstanding } from './types';
import { StructuredQuery, NLPIntent, ExtractedEntities } from '../nlp/types';
import { CategoryType, ParameterKey } from '../../types';
import { resolveInstitutionName } from '../../services/institutionResolver';
import { ConversationContextState } from './types';

const VALID_CATEGORIES: Set<string> = new Set([
  'Overall',
  'Engineering',
  'Management',
  'University',
  'College',
  'Medical',
  'Pharmacy',
  'Law',
  'Architecture',
  'Dental',
  'Agriculture',
  'Research',
  'State Public University',
  'All',
]);

const VALID_PARAMETERS: Set<string> = new Set(['TLR', 'RPC', 'GO', 'OI', 'PR', 'overall_score', 'rank']);

const SUPPORTED_INTENTS: Set<NLPIntent> = new Set([
  'institution_trend',
  'highest_improvers',
  'largest_decliners',
  'score_trend_average',
  'consistently_top_ranked',
  'state_analysis',
  'state_distribution',
  'state_comparison',
  'state_representation_change',
  'new_entrants_by_state',
  'score_distribution',
  'rank_distribution',
  'summary_statistics',
  'score_quartiles',
  'category_score_spread',
  'parameter_correlation',
  'strongest_correlation',
  'correlation_trend_over_years',
  'multivariate_comparison',
  'high_research_low_teaching',
  'high_teaching_low_perception',
  'parameter_gap_analysis',
  'score_up_parameters_down',
  'top_vs_rest_dispersion',
  'year_score_dispersion',
  'parameter_variability',
  'state_score_distribution',
  'ranking_transitions',
  'band_retention',
  'top_10_entry_exit',
  'mobility_summary',
  'outlier_detection',
  'research_teaching_gap_outliers',
  'year_over_year_score_anomalies',
  'ranking_volatility',
  'rank_lookup',
  'score_lookup',
  'institution_compare',
  'top_n',
  'count_query',
  'dataset_inquiry',
  'parameter_definition',
  'clarification_needed',
  'unsupported_or_ambiguous',
  'out_of_scope',
]);

export interface ValidationResult {
  isValid: boolean;
  structuredQuery?: StructuredQuery;
  validationError?: string;
}

export function validateAndPlanQuery(
  understanding: LLMQueryUnderstanding,
  originalQuery: string,
  historyContext?: Partial<ConversationContextState>
): ValidationResult {
  // 1. Intent Validation
  if (!SUPPORTED_INTENTS.has(understanding.intent)) {
    return {
      isValid: false,
      validationError: `Unsupported intent: "${understanding.intent}"`,
    };
  }

  // Handle explicit out of scope
  if (understanding.intent === 'out_of_scope') {
    return {
      isValid: true,
      structuredQuery: {
        intent: 'out_of_scope',
        confidence: 1.0,
        entities: {
          institutions: [],
          category: null,
          years: [],
          parameters: [],
        },
        reasoning: understanding.reasoning || 'Query is outside the scope of NIRF data.',
      },
    };
  }

  // 2. Category Validation & Context Inheritance
  let category: CategoryType | 'All' | null = null;
  if (understanding.category) {
    if (VALID_CATEGORIES.has(understanding.category)) {
      category = understanding.category;
    } else {
      return {
        isValid: false,
        validationError: `Invalid category "${understanding.category}". Valid options: ${Array.from(VALID_CATEGORIES).join(', ')}`,
      };
    }
  } else if (historyContext?.lastCategory) {
    category = historyContext.lastCategory;
  }

  // 3. Years Validation & Context Inheritance
  let years: number[] = [];
  if (understanding.years && understanding.years.length > 0) {
    years = [...understanding.years];
  } else if (understanding.year) {
    years = [understanding.year];
  } else if (historyContext?.lastYear) {
    years = [historyContext.lastYear];
  }

  // Check year bounds (2017 to 2025)
  for (const yr of years) {
    if (yr < 2017 || yr > 2025) {
      return {
        isValid: true,
        structuredQuery: {
          intent: 'unsupported_or_ambiguous',
          confidence: 0.9,
          entities: { institutions: [], category, years: [yr], parameters: [] },
          reasoning: `Year ${yr} is out of dataset bounds. NIRF data is available from 2017 to 2025.`,
          needsClarification: true,
          clarificationPrompt: `The NIRF dataset covers annual editions from 2017 to 2025. Data for year ${yr} is not available. Please specify a year between 2017 and 2025.`,
        },
      };
    }
  }

  // 4. Parameter Validation
  const parameters: ParameterKey[] = [];
  for (const p of understanding.parameters || []) {
    const pUpper = p.toUpperCase();
    if (VALID_PARAMETERS.has(pUpper)) {
      parameters.push(pUpper as ParameterKey);
    }
  }
  if (parameters.length === 0 && historyContext?.lastParameter) {
    parameters.push(historyContext.lastParameter);
  }

  // 5. Institution Resolution & Disambiguation
  let rawInstitutions = [...(understanding.institutions || [])];

  // If follow-up lacks institutions but requires one, check context
  if (rawInstitutions.length === 0 && historyContext?.lastInstitution) {
    if (understanding.intent === 'rank_lookup' || understanding.intent === 'score_lookup' || understanding.intent === 'institution_trend') {
      rawInstitutions = [historyContext.lastInstitution];
    }
  }

  const resolvedInstitutions: ExtractedEntities['institutions'] = [];

  for (const rawName of rawInstitutions) {
    const resolution = resolveInstitutionName(rawName);

    if (resolution.status === 'exact') {
      resolvedInstitutions.push({
        raw: rawName,
        resolvedId: resolution.institution.institution_id,
        name: resolution.institution.institution_name,
        shortName: resolution.institution.short_name,
        isAmbiguous: false,
      });
    } else if (resolution.status === 'ambiguous') {
      const candidates = resolution.matches;
      return {
        isValid: true,
        structuredQuery: {
          intent: 'clarification_needed',
          confidence: 0.8,
          entities: {
            institutions: [
              {
                raw: rawName,
                isAmbiguous: true,
                candidates,
              },
            ],
            category,
            years,
            parameters,
          },
          reasoning: `Found multiple matching institutions for "${rawName}". Disambiguation required.`,
          needsClarification: true,
          clarificationPrompt: `I found multiple institutions matching "${rawName}":\n${candidates
            .map((c, idx) => `${idx + 1}. ${c.short_name} (${c.institution_name}, ${c.state})`)
            .join('\n')}\n\nPlease specify which institution you meant.`,
        },
      };
    } else {
      // Not found
      const suggestions = resolution.suggestions;
      return {
        isValid: true,
        structuredQuery: {
          intent: 'unsupported_or_ambiguous',
          confidence: 0.9,
          entities: {
            institutions: [
              {
                raw: rawName,
                isAmbiguous: false,
              },
            ],
            category,
            years,
            parameters,
          },
          reasoning: `Institution "${rawName}" not found in NIRF dataset.`,
          needsClarification: true,
          clarificationPrompt: suggestions.length > 0
            ? `I could not find '${rawName}' in the NIRF data. Did you mean:\n${suggestions
                .map((s, idx) => `${idx + 1}. ${s.short_name} (${s.state})`)
                .join('\n')}`
            : `I couldn't find '${rawName}' in the NIRF data. Please verify the name or check our Explore Institutions tab.`,
        },
      };
    }
  }

  // 6. Entity Requirements for Specific Intents
  if (understanding.intent === 'institution_compare') {
    if (resolvedInstitutions.length < 2) {
      // Check if context can provide the first institution
      if (resolvedInstitutions.length === 1 && historyContext?.lastInstitution && historyContext.lastInstitution !== resolvedInstitutions[0].shortName) {
        const prevRes = resolveInstitutionName(historyContext.lastInstitution);
        if (prevRes.status === 'exact') {
          resolvedInstitutions.unshift({
            raw: historyContext.lastInstitution,
            resolvedId: prevRes.institution.institution_id,
            name: prevRes.institution.institution_name,
            shortName: prevRes.institution.short_name,
            isAmbiguous: false,
          });
        }
      }

      if (resolvedInstitutions.length < 2) {
        return {
          isValid: true,
          structuredQuery: {
            intent: 'clarification_needed',
            confidence: 0.8,
            entities: { institutions: resolvedInstitutions, category, years, parameters },
            reasoning: 'Institution comparison requires two institutions.',
            needsClarification: true,
            clarificationPrompt: 'Please specify two institutions to compare (e.g., "Compare IIT Madras and IISc Bangalore in 2024").',
          },
        };
      }
    }
  }

  // Construct final validated AST StructuredQuery
  const entities: ExtractedEntities = {
    institutions: resolvedInstitutions,
    category,
    years,
    state: understanding.state || undefined,
    comparisonState: understanding.comparisonState || undefined,
    parameters,
    topN: understanding.topN || undefined,
  };

  if (years.length >= 2) {
    const sorted = [...years].sort((a, b) => a - b);
    entities.yearRange = { startYear: sorted[0], endYear: sorted[sorted.length - 1] };
  }

  return {
    isValid: true,
    structuredQuery: {
      intent: understanding.intent,
      confidence: 0.95,
      entities,
      reasoning: understanding.reasoning || `LLM query validated for ${understanding.intent}.`,
      needsClarification: understanding.requires_clarification,
      clarificationPrompt: understanding.clarificationPrompt || undefined,
    },
  };
}

