/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Server-Side Gemini Query Parser
 * Securely uses GEMINI_API_KEY from environment to convert natural language queries into a structured JSON query schema.
 * Note: Never executed in frontend client bundle; runs only on Node/Vite server.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded on the server
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SYSTEM_INSTRUCTION = `You are a query parser for an Indian Higher Education NIRF (National Institutional Ranking Framework) dataset dashboard covering 2017 to 2025 across 13 categories (Overall, Engineering, Management, University, College, Medical, Pharmacy, Law, Architecture, Dental, Agriculture, Research, State Public University).

Your sole responsibility is to convert the user's question and recent conversation history into a structured JSON query object matching this exact TypeScript schema:

{
  "is_out_of_scope": boolean, // MUST BE true if the question is NOT about Indian higher education, NIRF rankings, parameter definitions (TLR, RPC, GO, OI, PR), or this dashboard's statistical methods. (e.g. weather, sports, politics, recipes, capitals of countries, coding in other languages, general trivia must be true).
  "intent": "top_n" | "compare" | "institution_lookup" | "time_series" | "improvers" | "decliners" | "correlation" | "statistics" | "geospatial" | "outliers" | "general",
  "metric": "overall_score" | "TLR" | "RPC" | "GO" | "OI" | "PR" | "rank",
  "secondary_metric": "overall_score" | "TLR" | "RPC" | "GO" | "OI" | "PR" | null,
  "years": number[], // Array of years mentioned, e.g. [2025] or [2017, 2025]
  "category": string, // One of the 13 categories or "All", default "Overall"
  "states": string[], // List of state names mentioned, if any
  "institutions": string[], // List of institution names or keywords mentioned, e.g. ["IIT Madras", "IIT Bombay"]
  "statistic": "mean" | "median" | "max" | "min" | "sd" | "correlation" | null,
  "chart_type": "bar" | "line" | "scatter" | "radar" | null,
  "limit": number // Number of items requested, default 5
}

CRITICAL RULES:
1. You must NEVER answer the question or generate numbers. You only extract query parameters.
2. If the user refers to previous context (e.g. "what about in 2023?", "how about for Engineering?", "compare them"), resolve the references using the conversation history.
3. If the user asks about an entity not in NIRF (e.g. "Harvard", "Oxford", "Elon Musk"), extract the name in "institutions", but do not invent data.
4. Output valid JSON only, without markdown fences or additional commentary.`;

export async function parseQueryWithGemini(query: string, history?: { sender: string; text: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_gemini_api_key_here') {
    return null; // Fallback to local semantic rule parser
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const formattedHistory = history
      ? history.slice(-4).map((h) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
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
    if (!responseText) return null;

    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    console.warn('Gemini query parse fallback:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

