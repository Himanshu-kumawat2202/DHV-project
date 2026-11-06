/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Query Parser
 * Combines preprocessed text, extracted entities, and intent classification into a validated AST StructuredQuery.
 */

import { PreprocessedText, ExtractedEntities, StructuredQuery } from './types';
import { IntentClassificationResult } from './intentClassifier';
import { YEARS, CATEGORIES } from '../../data/nirfData';

/**
 * Validates and converts entities and intent into a structured query.
 */
export function parseQuery(
  p: PreprocessedText,
  entities: ExtractedEntities,
  classification: IntentClassificationResult
): StructuredQuery {
  // Check for ambiguous institutions
  const ambiguousInst = entities.institutions.find((i) => i.isAmbiguous);
  if (ambiguousInst && ambiguousInst.candidates && ambiguousInst.candidates.length > 0) {
    const list = ambiguousInst.candidates
      .slice(0, 5)
      .map((c, idx) => `${idx + 1}. ${c.institution_name} (${c.city}, ${c.state})`)
      .join('\n');

    return {
      intent: 'clarification_needed',
      confidence: 0.99,
      entities,
      reasoning: `Ambiguous institution name matched: "${ambiguousInst.raw}"`,
      needsClarification: true,
      clarificationPrompt: `Several institutions match "${ambiguousInst.raw}". Which one did you mean?\n${list}`,
    };
  }

  // Validate Years: Check if query explicitly requested a year outside 2017-2025
  const requestedInvalidYears = entities.years.filter((y) => !YEARS.includes(y));
  if (requestedInvalidYears.length > 0) {
    return {
      intent: 'unsupported_or_ambiguous',
      confidence: 0.99,
      entities,
      reasoning: `Requested year ${requestedInvalidYears.join(', ')} is outside NIRF data range (2017–2025).`,
      needsClarification: false,
      clarificationPrompt: `The NIRF dataset covers rankings from 2017 to 2025. Data for year ${requestedInvalidYears.join(
        ', '
      )} does not exist in the dataset.`,
    };
  }

  // Validate Category if specified
  if (entities.category && entities.category !== 'All') {
    const valid = CATEGORIES.some(
      (c) =>
        c.value.toLowerCase() === entities.category?.toLowerCase() ||
        c.label.toLowerCase() === entities.category?.toLowerCase()
    );
    if (!valid) {
      return {
        intent: 'unsupported_or_ambiguous',
        confidence: 0.99,
        entities,
        reasoning: `Requested category "${entities.category}" is invalid.`,
        needsClarification: false,
        clarificationPrompt: `Category '${entities.category}' does not exist in NIRF. Valid categories: ${CATEGORIES.map(
          (c) => c.label
        ).join(', ')}.`,
      };
    }
  }

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    entities,
    reasoning: classification.reasoning,
    needsClarification: false,
  };
}

