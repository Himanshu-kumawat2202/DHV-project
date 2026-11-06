/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 Natural Language Query Processing System: Types & Interfaces
 */

import { CategoryType, ParameterKey, AIQueryResponse, Institution, RankingRecord } from '../../types';

export type NLPIntent =
  // Domain A: Time-Series & Trends
  | 'institution_trend'
  | 'highest_improvers'
  | 'largest_decliners'
  | 'score_trend_average'
  | 'consistently_top_ranked'

  // Domain B: Geospatial & Regional Analysis
  | 'state_analysis'
  | 'state_distribution'
  | 'state_comparison'
  | 'state_representation_change'
  | 'new_entrants_by_state'

  // Domain C: Univariate Analysis
  | 'score_distribution'
  | 'rank_distribution'
  | 'summary_statistics'
  | 'score_quartiles'
  | 'category_score_spread'

  // Domain D: Bivariate & Correlation Analysis
  | 'parameter_correlation'
  | 'strongest_correlation'
  | 'correlation_trend_over_years'

  // Domain E: Multivariate Analysis
  | 'multivariate_comparison'
  | 'high_research_low_teaching'
  | 'high_teaching_low_perception'
  | 'parameter_gap_analysis'
  | 'score_up_parameters_down'

  // Domain F: Distribution & Statistical Comparison
  | 'top_vs_rest_dispersion'
  | 'year_score_dispersion'
  | 'parameter_variability'
  | 'state_score_distribution'

  // Domain G: Ranking Transitions & Institutional Mobility
  | 'ranking_transitions'
  | 'band_retention'
  | 'top_10_entry_exit'
  | 'mobility_summary'

  // Domain H: Outlier Detection & Performance Gaps
  | 'outlier_detection'
  | 'research_teaching_gap_outliers'
  | 'year_over_year_score_anomalies'
  | 'ranking_volatility'

  // Standard Lookups & Core Queries
  | 'rank_lookup'
  | 'score_lookup'
  | 'institution_compare'
  | 'top_n'
  | 'count_query'
  | 'dataset_inquiry'
  | 'parameter_definition'
  | 'clarification_needed'
  | 'unsupported_or_ambiguous'
  | 'out_of_scope';

export interface PreprocessedText {
  originalText: string;
  normalizedText: string;
  tokens: string[];
  stemmedTokens: string[];
  numbers: number[];
  yearsDetected: number[];
}

export interface ExtractedEntities {
  institutions: Array<{
    raw: string;
    resolvedId?: string;
    name?: string;
    shortName?: string;
    isAmbiguous?: boolean;
    candidates?: Institution[];
  }>;
  category: CategoryType | 'All' | null;
  years: number[];
  yearRange?: { startYear: number; endYear: number };
  state?: string;
  comparisonState?: string;
  parameters: ParameterKey[];
  topN?: number;
  metric?: 'rank' | 'score' | 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR' | 'all';
}

export interface StructuredQuery {
  intent: NLPIntent;
  confidence: number;
  entities: ExtractedEntities;
  reasoning: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
}

export interface NLPExecutionResult {
  success: boolean;
  intent: NLPIntent;
  query: StructuredQuery;
  response: AIQueryResponse;
  executionTimeMs: number;
  source?: 'hybrid_llm' | 'deterministic';
  llmStatus?: {
    configured: boolean;
    queryUnderstandingUsed: boolean;
    explanationUsed: boolean;
    error?: string;
  };
}

