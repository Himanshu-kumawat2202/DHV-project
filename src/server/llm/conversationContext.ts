/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Conversational Context Manager
 * Tracks recent context (institution, year, category, parameter, intent)
 * to resolve natural follow-up queries (e.g. "What about IISc?", "What about TLR?").
 */

import { ConversationContextState, ConversationTurn } from './types';
import { CategoryType, ParameterKey } from '../../types';
import { NLPIntent } from '../nlp/types';

// In-memory session context map with 30-minute expiration
const sessionStore = new Map<string, ConversationContextState>();
const SESSION_TTL_MS = 30 * 60 * 1000;

export function getSessionContext(sessionId: string): ConversationContextState | null {
  const ctx = sessionStore.get(sessionId);
  if (!ctx) return null;

  if (Date.now() - ctx.updatedAt > SESSION_TTL_MS) {
    sessionStore.delete(sessionId);
    return null;
  }

  return ctx;
}

export function updateSessionContext(
  sessionId: string,
  update: Partial<ConversationContextState>
): ConversationContextState {
  const existing = getSessionContext(sessionId) || { updatedAt: Date.now() };
  const updated: ConversationContextState = {
    ...existing,
    ...update,
    updatedAt: Date.now(),
  };
  sessionStore.set(sessionId, updated);
  return updated;
}

export function clearSessionContext(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * Extracts contextual entities from recent history turns.
 */
export function extractContextFromHistory(
  history?: Array<{ sender: string; text: string }>
): Partial<ConversationContextState> {
  if (!history || history.length === 0) return {};

  const context: Partial<ConversationContextState> = {};
  const recentTurns = [...history].reverse().slice(0, 6);

  // Categories list
  const categories: CategoryType[] = [
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
  ];

  for (const turn of recentTurns) {
    const text = turn.text;

    // Detect Year (2017 to 2025)
    if (!context.lastYear) {
      const yearMatch = text.match(/\b(201[7-9]|202[0-5])\b/);
      if (yearMatch) {
        context.lastYear = parseInt(yearMatch[1], 10);
      }
    }

    // Detect Category
    if (!context.lastCategory) {
      for (const cat of categories) {
        const catRegex = new RegExp(`\\b${cat}\\b`, 'i');
        if (catRegex.test(text)) {
          context.lastCategory = cat;
          break;
        }
      }
    }

    // Detect Parameters
    if (!context.lastParameter) {
      const paramMatch = text.match(/\b(TLR|RPC|GO|OI|PR)\b/i);
      if (paramMatch) {
        context.lastParameter = paramMatch[1].toUpperCase() as ParameterKey;
      }
    }

    // Detect Correlation Intent
    if (!context.lastIntent) {
      if (/correlation/i.test(text)) {
        context.lastIntent = 'parameter_correlation';
      } else if (/trend|progression|trajectory/i.test(text)) {
        context.lastIntent = 'institution_trend';
      } else if (/compare|versus|vs/i.test(text)) {
        context.lastIntent = 'institution_compare';
      }
    }
  }

  return context;
}

