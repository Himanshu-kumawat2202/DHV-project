/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Server-Side Gemini Question Understanding Parser
 * Securely uses GEMINI_API_KEY from environment to convert natural language queries into a structured JSON schema.
 * Note: Never executed in frontend client bundle; runs only on Node/Vite server.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded on the server
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type LLMIntent =
  | 'rank_lookup'
  | 'score_lookup'
  | 'parameter_breakdown'
  | 'trend'
  | 'compare'
  | 'top_n'
  | 'correlation'
  | 'distribution'
  | 'count'
  | 'other'
  | 'out_of_scope';

export interface LLMQueryUnderstanding {
  intent: LLMIntent;
  institutions: string[];
  years: number[];
  category: string | null;
  states: string[];
  parameters: string[];
  top_n: number | null;
  chart_needed: boolean;
}

export interface ParseResult {
  parsedQuery?: LLMQueryUnderstanding | null;
  error?: string;
}

const SYSTEM_INSTRUCTION = `You are an expert natural language question parser for an Indian Higher Education NIRF (National Institutional Ranking Framework) dataset dashboard covering 2017 to 2025 across 13 academic categories:
Overall, Engineering, Management, University, College, Medical, Pharmacy, Law, Architecture, Dental, Agriculture, Research, State Public University.

The five core NIRF evaluation parameters are:
- TLR: Teaching, Learning & Resources
- RPC: Research and Professional Practice
- GO: Graduation Outcomes
- OI: Outreach and Inclusivity
- PR: Perception
And "overall_score" / "rank".

Your sole responsibility is to convert the user's question and recent conversation history into a structured JSON object matching this exact schema:

{
  "intent": "rank_lookup" | "score_lookup" | "parameter_breakdown" | "trend" | "compare" | "top_n" | "correlation" | "distribution" | "count" | "other" | "out_of_scope",
  "institutions": string[], // Names EXACTLY as the user typed them (e.g. ["AIIMS Bhopal"], ["IIT Mandi"], ["MIT"], ["IIT Dharwad", "IIT Mandi"]). Do NOT guess or normalize.
  "years": number[], // Years mentioned, e.g. [2024], [2023], [2017, 2025]. Empty array if none mentioned.
  "category": string | null, // The NIRF category if explicitly specified (e.g. "Engineering", "Medical", "Overall", "Management"). Null if unspecified.
  "states": string[], // State names mentioned, if any.
  "parameters": string[], // Parameters mentioned: "TLR", "RPC", "GO", "OI", "PR", "overall_score", "rank".
  "top_n": number | null, // Numeric limit if asking for top N (e.g. 5, 10), otherwise null.
  "chart_needed": boolean // true ONLY when question needs a chart (comparison, trend, ranking/top_n, correlation, distribution). false for simple factual lookup (single rank, single score, count, definition) or out_of_scope refusals.
}

CRITICAL RULES:
1. SCOPE: Set intent to "out_of_scope" and chart_needed to false if the question is NOT about Indian higher education, NIRF rankings, evaluation parameters, or this dashboard's analysis (e.g., sports, match results, politics, weather, recipes, creative writing, country capitals, general trivia).
2. INSTITUTIONS: Extract the institution names EXACTLY as typed by the user into the "institutions" array. Never guess or substitute another institution.
3. NO INVENTING DATA: You must never answer the question or invent numbers. You only extract the structured parameters.
4. CONTEXT / FOLLOW-UPS: If the user refers to previous context (e.g., "what about in 2023?", "how about for Engineering?", "compare them"), resolve the missing entities using the provided conversation history.
5. Output valid JSON only, without markdown fences or additional commentary.`;

export async function parseQueryWithGemini(
  query: string,
  history?: { sender: string; text: string }[]
): Promise<ParseResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_gemini_api_key_here') {
    return {
      error: 'GEMINI_API_KEY is not configured in .env. Please configure your Gemini API key on the backend to enable AI Question Understanding.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const formattedHistory = history && history.length > 0
      ? history.slice(-6).map((h) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
      : '';

    const promptText = `${formattedHistory ? `Recent conversation context:\n${formattedHistory}\n\n` : ''}User Question: "${query}"\n\nConvert into JSON:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) {
      return { error: 'Empty response received from Gemini API.' };
    }

    const parsed = JSON.parse(responseText) as LLMQueryUnderstanding;
    return { parsedQuery: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Gemini query parse failed:', msg);
    return { error: `Gemini API call failed: ${msg}` };
  }
}
