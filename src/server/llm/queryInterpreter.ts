/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Layer 1: LLM Query Understanding Interpreter
 * Prompts the LLM to analyze the natural language question and conversation history,
 * extracting a structured JSON query plan.
 */

import { LLMQueryUnderstanding, LLMInterpretationResult } from './types';
import { executeLLMCall } from './llmClient';
import { extractContextFromHistory } from './conversationContext';
import { NLPIntent } from '../nlp/types';

const SYSTEM_INSTRUCTION = `You are an expert natural language query interpreter for an Indian Higher Education NIRF (National Institutional Ranking Framework) dataset dashboard covering 2017 to 2025 across 13 academic categories:
Overall, Engineering, Management, University, College, Medical, Pharmacy, Law, Architecture, Dental, Agriculture, Research, State Public University.

The five core NIRF evaluation pillars are:
- TLR: Teaching, Learning & Resources
- RPC: Research and Professional Practice
- GO: Graduation Outcomes
- OI: Outreach and Inclusivity
- PR: Perception
And "overall_score" / "rank".

Your sole responsibility is to translate the user's natural language question and recent conversation history into a structured JSON object matching this exact schema:

{
  "intent": "<intent_name>",
  "year": <number | null>, // Target single year, e.g. 2024. null if unspecified or multi-year.
  "years": [<number>], // All years mentioned, e.g. [2024] or [2020, 2025].
  "category": "<CategoryName | null>", // One of the 13 categories, e.g. "Overall", "Engineering", "University". null if unspecified.
  "institutions": ["<string>"], // Institution names EXACTLY as typed or referenced (e.g. ["IIT Madras", "IISc Bangalore"]). Do not normalize or guess.
  "parameters": ["<TLR|RPC|GO|OI|PR|overall_score|rank>"], // Relevant parameters mentioned.
  "state": "<string | null>", // Indian state/UT if referenced, e.g. "Tamil Nadu", "Maharashtra". null if none.
  "comparisonState": "<string | null>", // Second state if comparing states. null if none.
  "topN": <number | null>, // Numeric limit if asking for top N (e.g. 10, 5). null if none.
  "requires_clarification": <boolean>, // true if question is too vague or ambiguous to interpret.
  "clarificationPrompt": "<string | null>", // Follow-up clarification prompt to ask the user if needed.
  "reasoning": "<string>" // Concise reasoning explaining your classification.
}

SUPPORTED INTENTS:
- "rank_lookup": Lookup rank for a single institution.
- "score_lookup": Lookup score or parameter score for a single institution.
- "institution_compare": Head-to-head comparison between 2 institutions.
- "top_n": Ranked list of top N institutions in a year/category.
- "institution_trend": Performance progression/trajectory of an institution over years.
- "highest_improvers": Institutions showing largest rank jump over years.
- "largest_decliners": Institutions showing largest rank drop over years.
- "score_trend_average": Average and median score trend across NIRF editions.
- "consistently_top_ranked": Institutions consistently ranked in top 10.
- "state_analysis": Top-ranked institutions in a specific state.
- "state_distribution": Distribution of institutions across Indian states.
- "state_comparison": Direct comparison between two states.
- "score_distribution": Distribution/histogram of institutional scores.
- "summary_statistics": Descriptive statistics (mean, median, standard deviation, quartiles).
- "parameter_correlation": Correlation between two scoring parameters or a parameter and overall score.
- "strongest_correlation": Identification of which NIRF parameter has strongest impact on rankings.
- "multivariate_comparison": Comparing multiple institutions across all parameters.
- "high_research_low_teaching": Institutions with high research scores but lower teaching scores.
- "top_vs_rest_dispersion": Comparison of score spread between top tier and remainder.
- "parameter_variability": Which parameter exhibits highest standard deviation.
- "ranking_transitions": Institutional mobility between ranking tiers across years.
- "outlier_detection": Statistical outlier institutions in research or scores.
- "count_query": Count of colleges or universities in a category/year.
- "dataset_inquiry": Meta inquiries about the NIRF dataset itself.
- "parameter_definition": Defining TLR, RPC, GO, OI, or PR.
- "out_of_scope": Queries unrelated to Indian higher education or NIRF (e.g. weather, recipes, sports, capitals, coding, general trivia).

STRICT RULES:
1. OUT-OF-SCOPE: If the question is about non-NIRF topics (e.g. "What is the capital of France?", "Write a python script"), set "intent": "out_of_scope", "requires_clarification": false.
2. NO HALLUCINATING DATA: You MUST NOT compute answers or invent numbers. You only extract the query structure.
3. CONVERSATIONAL CONTEXT: If the user asks a follow-up (e.g. "What about IISc?", "What about in 2023?", "What about TLR?"), consult the conversation history to carry forward the previous year, category, or analytical intent.
4. VALID JSON ONLY: Emit strictly valid JSON with no markdown formatting or commentary.`;

export async function interpretQueryWithLLM(
  rawQuery: string,
  history?: Array<{ sender: string; text: string }>
): Promise<LLMInterpretationResult> {
  const context = extractContextFromHistory(history);

  // Format recent history for prompt context
  let historyPrompt = '';
  if (history && history.length > 0) {
    const formattedTurns = history
      .slice(-6)
      .map((t) => `${t.sender === 'user' ? 'User' : 'Assistant'}: ${t.text}`)
      .join('\n');
    historyPrompt = `Recent Conversation Context:\n${formattedTurns}\n\n`;
  }

  const promptText = `${historyPrompt}User Question: "${rawQuery}"\n\nConvert into JSON:`;

  // First LLM call attempt
  let callResult = await executeLLMCall({
    prompt: promptText,
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
  });

  if (!callResult.success) {
    return {
      success: false,
      error: callResult.errorMessage || 'LLM call failed',
      errorCode: callResult.errorCode || 'UNKNOWN',
      source: 'fallback_deterministic',
    };
  }

  let parsed: LLMQueryUnderstanding | null = null;

  try {
    parsed = JSON.parse(callResult.text);
  } catch (parseErr) {
    // Malformed JSON: Retry once with a correction prompt
    const retryPrompt = `Your previous output could not be parsed as JSON:\n${callResult.text}\n\nPlease convert the user question: "${rawQuery}" into STRICT valid JSON matching the schema with no extra text:`;
    const retryResult = await executeLLMCall({
      prompt: retryPrompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      timeoutMs: 4000,
    });

    if (retryResult.success) {
      try {
        parsed = JSON.parse(retryResult.text);
      } catch {
        return {
          success: false,
          error: 'LLM returned malformed JSON after retry',
          errorCode: 'MALFORMED_JSON',
          rawResponse: retryResult.text,
          source: 'fallback_deterministic',
        };
      }
    } else {
      return {
        success: false,
        error: 'LLM retry failed with malformed JSON',
        errorCode: 'MALFORMED_JSON',
        rawResponse: callResult.text,
        source: 'fallback_deterministic',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.intent) {
    return {
      success: false,
      error: 'Parsed LLM output missing required intent field',
      errorCode: 'MALFORMED_JSON',
      source: 'fallback_deterministic',
    };
  }

  // Ensure arrays are initialized
  if (!Array.isArray(parsed.institutions)) parsed.institutions = [];
  if (!Array.isArray(parsed.parameters)) parsed.parameters = [];
  if (!Array.isArray(parsed.years)) {
    parsed.years = parsed.year ? [parsed.year] : [];
  }

  return {
    success: true,
    understanding: parsed,
    source: 'llm',
  };
}

