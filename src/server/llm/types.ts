/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hybrid LLM Layer: Types & Schemas
 */

import { NLPIntent, StructuredQuery } from '../nlp/types';
import { CategoryType, ParameterKey } from '../../types';

export interface LLMQueryUnderstanding {
  intent: NLPIntent;
  year?: number | null;
  years?: number[];
  category?: CategoryType | 'All' | null;
  institutions: string[];
  parameters: ParameterKey[];
  state?: string | null;
  comparisonState?: string | null;
  topN?: number | null;
  requires_clarification: boolean;
  clarificationPrompt?: string | null;
  reasoning?: string;
}

export interface LLMInterpretationResult {
  success: boolean;
  understanding?: LLMQueryUnderstanding;
  error?: string;
  errorCode?: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'MALFORMED_JSON' | 'UNSUPPORTED_INTENT' | 'EMPTY_RESPONSE' | 'NETWORK_ERROR' | 'UNKNOWN';
  rawResponse?: string;
  source: 'llm' | 'fallback_deterministic';
}

export interface LLMExplanationResult {
  success: boolean;
  explanation?: string;
  error?: string;
}

export interface ConversationTurn {
  sender: 'user' | 'assistant' | 'ai';
  text: string;
  timestamp?: number;
}

export interface ConversationContextState {
  lastInstitution?: string;
  lastInstitutions?: string[];
  lastCategory?: CategoryType | 'All';
  lastYear?: number;
  lastYears?: number[];
  lastIntent?: NLPIntent;
  lastParameter?: ParameterKey;
  lastParameters?: ParameterKey[];
  lastState?: string;
  updatedAt: number;
}

