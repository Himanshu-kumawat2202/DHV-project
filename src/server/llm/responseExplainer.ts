/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Layer 4: LLM Response Explainer
 * Generates clear, concise analytical explanations based EXCLUSIVELY
 * on verified deterministic results, preserving every numerical value.
 */

import { QueryExecutionResult } from '../nlp/queryExecutor';
import { StructuredQuery } from '../nlp/types';
import { executeLLMCall } from './llmClient';
import { LLMExplanationResult } from './types';

const SYSTEM_INSTRUCTION = `You are the NIRF Institutional Analytics Assistant. Your role is to explain verified NIRF ranking calculations clearly, objectively, and insightfully.

CRITICAL GROUNDING RULES:
1. STRICT NUMERICAL FIDELITY: You must preserve every numerical value, rank, score, difference, percentage, and institution name EXACTLY as provided in the verified facts. Do NOT round differently, alter, or fabricate any number.
2. NO HALLUCINATIONS: Do not introduce external facts, unmentioned institutions, or speculative rankings not present in the verified dataset facts.
3. CLEAR ATTRIBUTION: Explicitly state the relevant year(s) and academic category (e.g. Overall, Engineering, University).
4. STATISTICAL CAVEATS: If explaining correlation or regression, clearly state that correlation indicates statistical association and does not imply causation.
5. CONCISE & PROFESSIONAL: Write in clean, structured, accessible language suitable for academic leaders, policy makers, and students.`;

export async function explainResultsWithLLM(
  rawQuery: string,
  execResult: QueryExecutionResult,
  sq: StructuredQuery
): Promise<LLMExplanationResult> {
  // If out-of-scope or error, skip LLM explanation
  if (execResult.isOutOfScope || execResult.isError || !execResult.data) {
    return { success: false, error: 'Query does not have analytical data to explain.' };
  }

  // Build a compact, factual payload of verified deterministic results
  const factualPayload = {
    userQuery: rawQuery,
    intent: execResult.intent,
    category: sq.entities.category || 'Overall',
    years: sq.entities.years.length > 0 ? sq.entities.years : [2024],
    deterministicSummary: execResult.summary,
    deterministicExplanation: execResult.explanation || null,
    calculationMethod: execResult.calculationDetails?.formula || null,
    sampleSize: execResult.calculationDetails?.sampleSize || null,
    filtersApplied: execResult.calculationDetails?.filtersApplied || null,
    // Provide a compact subset of verified numbers to prevent token overflow
    verifiedMetrics: Array.isArray(execResult.data)
      ? execResult.data.slice(0, 10)
      : execResult.data,
  };

  const promptText = `Verified Deterministic Facts:\n${JSON.stringify(factualPayload, null, 2)}\n\nPlease provide a clear, concise 2–4 paragraph analytical explanation of these findings answering the user's question: "${rawQuery}". Follow the strict numerical fidelity rules:`;

  const callResult = await executeLLMCall({
    prompt: promptText,
    systemInstruction: SYSTEM_INSTRUCTION,
    timeoutMs: 4500,
  });

  if (!callResult.success || !callResult.text) {
    return {
      success: false,
      error: callResult.errorMessage || 'LLM explanation call failed',
    };
  }

  return {
    success: true,
    explanation: callResult.text.trim(),
  };
}

