/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Intent Classifier
 * Rule-based and statistical feature classifier covering all 8 analytical domains without external LLMs.
 */

import { PreprocessedText, ExtractedEntities, NLPIntent } from './types';

// Explicit non-academic / out-of-scope triggers
const EXPLICIT_OUT_OF_SCOPE_REGEX = [
  /\b(capital of|weather|recipe|how to cook|how to make|make coffee|joke|poem|poetry|story|song|lyrics|movie|actor|cricket|ipl|football|world cup|india vs pakistan|who is elon|who is trump|who is narendra modi|politics|president of|prime minister of|stock price|crypto|bitcoin|forex)\b/i,
  /\bwrite a (python|javascript|code|script|essay|email|letter|poem)\b/i,
];

// In-scope keyword anchors
const IN_SCOPE_ANCHORS = [
  'nirf', 'rank', 'ranking', 'score', 'cutoff', 'college', 'university', 'institute', 'institution',
  'iit', 'nit', 'iim', 'iisc', 'aiims', 'iiit', 'bits', 'jnu', 'bhu', 'du', 'amrita', 'vit', 'manipal',
  'thapar', 'tlr', 'rpc', 'go', 'oi', 'pr', 'teaching', 'research', 'graduation', 'outreach', 'perception',
  'engineering', 'management', 'pharmacy', 'medical', 'law', 'architecture', 'dental', 'agriculture',
  'overall', 'top', 'best', 'compare', 'trend', 'correlation', 'outlier', 'distribution', 'median',
  'state', 'mobility', 'transition', 'band', 'gap', 'variability', 'dispersion', 'improvement', 'decline'
];

export interface IntentClassificationResult {
  intent: NLPIntent;
  confidence: number;
  reasoning: string;
}

/**
 * Classifies the analytical intent of the query using structured linguistic features and entity context.
 */
export function classifyIntent(p: PreprocessedText, entities: ExtractedEntities): IntentClassificationResult {
  const norm = p.normalizedText;

  // 1. Check Explicit Out-of-Scope Rules
  for (const pat of EXPLICIT_OUT_OF_SCOPE_REGEX) {
    if (pat.test(norm)) {
      return {
        intent: 'out_of_scope',
        confidence: 0.99,
        reasoning: 'Matched explicit non-NIRF / general trivia pattern.',
      };
    }
  }

  // 2. Check Positive In-Scope Signals
  const hasScopeAnchor = IN_SCOPE_ANCHORS.some((anchor) => norm.includes(anchor));
  const hasExtractedEntity =
    entities.institutions.length > 0 ||
    entities.category !== null ||
    entities.parameters.length > 0 ||
    entities.state !== undefined;

  if (!hasScopeAnchor && !hasExtractedEntity) {
    return {
      intent: 'out_of_scope',
      confidence: 0.95,
      reasoning: 'No NIRF, academic institution, or ranking terminology detected.',
    };
  }

  // 3. Factual & Definitions Inquiries
  if (/\b(what is nirf|explain nirf|about nirf|nirf meaning)\b/i.test(norm)) {
    return { intent: 'parameter_definition', confidence: 0.98, reasoning: 'General NIRF inquiry' };
  }
  if (/\b(what is|what does|explain|definition of)\s+(tlr|rpc|go|oi|pr|teaching|research|graduation outcomes|outreach|perception)\b/i.test(norm)) {
    return { intent: 'parameter_definition', confidence: 0.98, reasoning: 'Parameter definition inquiry' };
  }
  if (/\b(what data|about the data|dataset|available years|which categories|how many records)\b/i.test(norm)) {
    return { intent: 'dataset_inquiry', confidence: 0.95, reasoning: 'NIRF dataset meta-inquiry' };
  }

  // 4. DOMAIN D: Bivariate & Correlation Analysis
  if (
    /\b(correlat\w*|association\w* between|relationship\w* between)\b/i.test(norm) ||
    (/\b(scatter|versus|vs)\b/i.test(norm) && entities.parameters.length >= 2)
  ) {
    if (
      /\b(strongest|highest|best|most)\s+(?:\w+\s+)?correlation\b/i.test(norm) ||
      (/\bcorrelat\w*\b/i.test(norm) && /\b(parameters|scoring parameters|heatmap|matrix|all parameters|each other)\b/i.test(norm))
    ) {
      return { intent: 'strongest_correlation', confidence: 0.95, reasoning: 'Correlation matrix across all NIRF parameters' };
    }
    if (/\b(over time|over the years|across years|trend|change)\b/i.test(norm)) {
      return { intent: 'correlation_trend_over_years', confidence: 0.92, reasoning: 'Multi-year correlation trend' };
    }
    return { intent: 'parameter_correlation', confidence: 0.96, reasoning: 'Two-parameter or parameter-to-score Pearson correlation' };
  }

  // 5. DOMAIN G: Ranking Transitions & Institutional Mobility
  if (
    /\b(transition\w*|mobility|ranking band\w*|rank band\w*|band retention|movement between bands)\b/i.test(norm) ||
    (/\b(move|moved|moving|climb|drop|retained)\b/i.test(norm) && /\b(band|bands|tier)\b/i.test(norm))
  ) {
    if (/\b(retention|retained|stay in)\b/i.test(norm)) {
      return { intent: 'band_retention', confidence: 0.94, reasoning: 'Rank-band retention percentage analysis' };
    }
    if (/\b(top 10|top-10|top ten)\b/i.test(norm) && /\b(entry|exit|enter|leave|left)\b/i.test(norm)) {
      return { intent: 'top_10_entry_exit', confidence: 0.95, reasoning: 'Top 10 entry and exit analysis' };
    }
    if (/\b(up|down|retaining|summary)\b/i.test(norm)) {
      return { intent: 'mobility_summary', confidence: 0.92, reasoning: 'Upward, downward, and retained ranking mobility summary' };
    }
    return { intent: 'ranking_transitions', confidence: 0.93, reasoning: 'Annual rank-band transition analysis' };
  }

  // 6. DOMAIN H: Outlier Detection & Performance Gaps
  if (/\b(outlier|outliers|anomal|unusual|unexpected|volatilit|volatile)\b/i.test(norm)) {
    if (/\b(research|rpc)\b/i.test(norm) && /\b(teaching|tlr)\b/i.test(norm)) {
      return { intent: 'research_teaching_gap_outliers', confidence: 0.95, reasoning: 'Research vs teaching discrepancy outliers' };
    }
    if (/\b(year to year|annual|sudden|jump|spike)\b/i.test(norm)) {
      return { intent: 'year_over_year_score_anomalies', confidence: 0.93, reasoning: 'Year-over-year score change anomalies' };
    }
    if (/\b(volatilit|volatile|swing|fluctuat)\b/i.test(norm)) {
      return { intent: 'ranking_volatility', confidence: 0.94, reasoning: 'Ranking volatility detection' };
    }
    return { intent: 'outlier_detection', confidence: 0.95, reasoning: 'Statistical outlier detection using Z-scores & IQR fences' };
  }

  // 7. DOMAIN E: Multivariate Analysis & Performance Gaps
  if (
    /\b(multivariate|radar|parallel|parameter gap|gap analysis|across parameters)\b/i.test(norm) ||
    (/\b(high|strong)\s+(research|rpc)\b/i.test(norm) && /\b(low|weak)\s+(teaching|tlr)\b/i.test(norm)) ||
    (/\b(high|strong)\s+(teaching|tlr)\b/i.test(norm) && /\b(low|weak)\s+(perception|pr)\b/i.test(norm)) ||
    /\b(improved despite|declined despite|gaps)\b/i.test(norm)
  ) {
    if (/\b(high|strong)\s+(research|rpc)\b/i.test(norm) && /\b(low|weak)\s+(teaching|tlr)\b/i.test(norm)) {
      return { intent: 'high_research_low_teaching', confidence: 0.96, reasoning: 'High research but low teaching institutions' };
    }
    if (/\b(high|strong)\s+(teaching|tlr)\b/i.test(norm) && /\b(low|weak)\s+(perception|pr)\b/i.test(norm)) {
      return { intent: 'high_teaching_low_perception', confidence: 0.96, reasoning: 'High teaching but low perception institutions' };
    }
    if (/\b(score up|improved despite|score rose despite)\b/i.test(norm)) {
      return { intent: 'score_up_parameters_down', confidence: 0.93, reasoning: 'Overall score increase despite parameter decline' };
    }
    if (/\b(gap|difference)\b/i.test(norm) && /\b(strongest|weakest|largest)\b/i.test(norm)) {
      return { intent: 'parameter_gap_analysis', confidence: 0.94, reasoning: 'Strongest vs weakest parameter gap analysis' };
    }
    return { intent: 'multivariate_comparison', confidence: 0.92, reasoning: 'Multi-parameter institutional breakdown' };
  }

  // 8. DOMAIN B: Geospatial & Regional Analysis
  if (entities.comparisonState && entities.state) {
    return { intent: 'state_comparison', confidence: 0.97, reasoning: 'Direct comparison between two states' };
  }
  if (
    /\b(geographical|state wise|state-wise|states with most|which state|regional)\b/i.test(norm) ||
    (/\bstate\b/i.test(norm) && /\b(highest|most|maximum|number of|distribution|representation)\b/i.test(norm)) ||
    (entities.state && /\b(how many|institutions?|colleges?|universities?|top|representation|ranking|performance)\b/i.test(norm))
  ) {
    if (/\b(newly appearing|new entrant|new institutions)\b/i.test(norm)) {
      return { intent: 'new_entrants_by_state', confidence: 0.95, reasoning: 'Newly appearing institutions by state' };
    }
    if (/\b(representation change|over time|presence changed)\b/i.test(norm)) {
      return { intent: 'state_representation_change', confidence: 0.94, reasoning: 'State representation change over editions' };
    }
    if (
      /\b(geographical distribution|state wise distribution|states with most|which state|highest number of|highest representation)\b/i.test(norm) ||
      !entities.state
    ) {
      return { intent: 'state_distribution', confidence: 0.95, reasoning: 'State-wise distribution of ranked institutions' };
    }
    return { intent: 'state_analysis', confidence: 0.94, reasoning: 'Single state institutional representation analysis' };
  }

  // 9. DOMAIN A (Score Trends Across Time)
  if (/\b(average score trend|score trend across years|how did scores trend|score trend)\b/i.test(norm)) {
    return { intent: 'score_trend_average', confidence: 0.96, reasoning: 'Average institutional score trend over time' };
  }

  // 10. DOMAIN F: Distribution & Statistical Comparison
  if (
    /\b(top 10 vs|top 10 versus|top-10 vs|top ten versus|dispersion|variability|quartile|quartiles|iqr|standard deviation|variance|mean|median|average)\b/i.test(norm) ||
    (/\b(distribution|stats|summary)\b/i.test(norm) && !entities.institutions.length)
  ) {
    if (/\b(top 10 vs|top 10 versus|remaining|rest of)\b/i.test(norm)) {
      return { intent: 'top_vs_rest_dispersion', confidence: 0.95, reasoning: 'Comparison of top 10 vs remaining distribution' };
    }
    if (/\b(variability|vary the most|most varied)\b/i.test(norm)) {
      return { intent: 'parameter_variability', confidence: 0.94, reasoning: 'Parameter coefficient of variation / variability' };
    }
    if (/\b(dispersion|spread across years|over years)\b/i.test(norm)) {
      return { intent: 'year_score_dispersion', confidence: 0.93, reasoning: 'Year-wise score dispersion trends' };
    }
    if (entities.state && /\b(distribution|spread)\b/i.test(norm)) {
      return { intent: 'state_score_distribution', confidence: 0.92, reasoning: 'State-wise score distribution' };
    }
    if (/\b(quartile|quartiles|iqr|box plot)\b/i.test(norm)) {
      return { intent: 'summary_statistics', confidence: 0.95, reasoning: 'Score quartiles and interquartile range' };
    }
    if (/\b(mean|median|average|std dev|standard deviation|summary statistics)\b/i.test(norm)) {
      return { intent: 'summary_statistics', confidence: 0.95, reasoning: 'Univariate descriptive statistics' };
    }
    if (/\b(category wise|across categories)\b/i.test(norm)) {
      return { intent: 'category_score_spread', confidence: 0.94, reasoning: 'Category-wise score spread' };
    }
    return { intent: 'score_distribution', confidence: 0.92, reasoning: 'Score histogram and distribution analysis' };
  }

  // 10. DOMAIN A: Time-Series & Trends (Improvers / Decliners / Trajectories)
  if (
    /\b(highest (?:ranking\s+)?improvement|most improved|biggest improver|biggest climber|climbed the most|top improver|improved (?:its\s+)?(?:rank\s+|ranking\s+)?(?:the\s+)?most)\b/i.test(norm)
  ) {
    return { intent: 'highest_improvers', confidence: 0.97, reasoning: 'Highest rank improvement query' };
  }
  if (
    /\b(largest (?:ranking\s+)?decline|biggest drop|most declined|fell the most|biggest fall|dropped the most|largest fall|declined (?:its\s+)?(?:rank\s+|ranking\s+)?(?:the\s+)?most)\b/i.test(norm)
  ) {
    return { intent: 'largest_decliners', confidence: 0.97, reasoning: 'Largest rank decline query' };
  }
  if (/\b(consistently top|always in top|consistently ranked|constant top)\b/i.test(norm)) {
    return { intent: 'consistently_top_ranked', confidence: 0.96, reasoning: 'Consistently top-ranked institutions across all editions' };
  }
  if (/\b(average score trend|score trend across years|how did scores trend)\b/i.test(norm)) {
    return { intent: 'score_trend_average', confidence: 0.93, reasoning: 'Average institutional score trend over time' };
  }

  // 11. Institution-specific Queries
  if (entities.institutions.length >= 2) {
    return { intent: 'institution_compare', confidence: 0.96, reasoning: 'Comparison between two or more named institutions' };
  }

  if (entities.institutions.length === 1) {
    // If words indicate trend / trajectory / over time
    if (
      /\b(trend|trajectory|progression|over the years|over time|history|across years|how has .+ performed)\b/i.test(norm) ||
      entities.yearRange !== undefined ||
      entities.years.length >= 2
    ) {
      return { intent: 'institution_trend', confidence: 0.97, reasoning: 'Multi-year trajectory for a single institution' };
    }

    if (/\b(score|scores|points|mark|marks)\b/i.test(norm) || entities.parameters.length > 0) {
      return { intent: 'score_lookup', confidence: 0.95, reasoning: 'Score / parameter lookup for an institution' };
    }

    return { intent: 'rank_lookup', confidence: 0.95, reasoning: 'Rank lookup for a single institution' };
  }

  // 12. Top N Institution Queries
  if (entities.topN !== undefined || /\b(top|best|leading|first)\b/i.test(norm)) {
    return { intent: 'top_n', confidence: 0.93, reasoning: 'Top N ranked institutions lookup' };
  }

  // 13. Count Queries
  if (/\b(how many|number of|count of|total institutions|total colleges)\b/i.test(norm)) {
    return { intent: 'count_query', confidence: 0.92, reasoning: 'Count of institutions matching category or year' };
  }

  // 14. Fallback: Check if user asks about a category or general scores
  if (entities.category) {
    return { intent: 'top_n', confidence: 0.80, reasoning: 'General category inquiry defaulting to top institutions' };
  }

  return {
    intent: 'unsupported_or_ambiguous',
    confidence: 0.50,
    reasoning: 'Query could not be mapped unambiguously to an analytical domain.',
  };
}
