/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Secure Backend LLM Client
 * Interfaces with Google Gen AI SDK with timeout enforcement,
 * rate limit handling, credential shielding, and error categorization.
 */

import { GoogleGenAI } from '@google/genai';

export interface LLMCallParams {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  timeoutMs?: number;
  model?: string;
}

export interface LLMCallResult {
  text: string;
  success: boolean;
  errorCode?: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'EMPTY_RESPONSE' | 'NETWORK_ERROR' | 'UNKNOWN';
  errorMessage?: string;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 5000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Returns true if an API key is present in environment variables and not a default placeholder.
 */
export function isLLMConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  if (!key) return false;
  if (key === 'MY_GEMINI_API_KEY' || key === 'your_api_key_here' || key === 'placeholder') return false;
  return true;
}

/**
 * Sanitizes any string to ensure API keys are never revealed in logs or client-facing messages.
 */
export function sanitizeLog(str: string): string {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
  if (!key || key.length < 6) return str;
  return str.split(key).join('[REDACTED_API_KEY]');
}

/**
 * Dispatches a prompt to the LLM with strict timeout and error handling.
 */
export async function executeLLMCall(params: LLMCallParams): Promise<LLMCallResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();

  if (!apiKey || !isLLMConfigured()) {
    return {
      text: '',
      success: false,
      errorCode: 'INVALID_API_KEY',
      errorMessage: 'LLM API key is not configured in backend environment.',
    };
  }

  const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;
  const model = params.model || DEFAULT_MODEL;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Enforce strict request timeout using Promise.race
    const callPromise = ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
        ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`LLM_TIMEOUT: Execution exceeded ${timeoutMs}ms`)), timeoutMs);
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const responseText = response.text?.trim() || '';

    if (!responseText) {
      return {
        text: '',
        success: false,
        errorCode: 'EMPTY_RESPONSE',
        errorMessage: 'Empty response returned by LLM.',
      };
    }

    return {
      text: responseText,
      success: true,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = sanitizeLog(rawMsg);

    // Classify error type
    if (safeMsg.includes('LLM_TIMEOUT') || safeMsg.toLowerCase().includes('timeout')) {
      return {
        text: '',
        success: false,
        errorCode: 'TIMEOUT',
        errorMessage: safeMsg,
      };
    }

    if (
      safeMsg.includes('API_KEY_INVALID') ||
      safeMsg.includes('API key not valid') ||
      safeMsg.includes('400') && safeMsg.includes('key') ||
      safeMsg.includes('401')
    ) {
      return {
        text: '',
        success: false,
        errorCode: 'INVALID_API_KEY',
        errorMessage: 'The configured LLM API key was rejected by the provider.',
      };
    }

    if (safeMsg.includes('429') || safeMsg.includes('RESOURCE_EXHAUSTED') || safeMsg.toLowerCase().includes('quota')) {
      return {
        text: '',
        success: false,
        errorCode: 'RATE_LIMIT',
        errorMessage: 'LLM provider rate limit or quota exceeded.',
      };
    }

    if (safeMsg.toLowerCase().includes('fetch failed') || safeMsg.toLowerCase().includes('econnrefused') || safeMsg.toLowerCase().includes('enotfound')) {
      return {
        text: '',
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network error connecting to LLM provider.',
      };
    }

    return {
      text: '',
      success: false,
      errorCode: 'UNKNOWN',
      errorMessage: safeMsg,
    };
  }
}
