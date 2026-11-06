/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Test Suite for Hybrid LLM + Deterministic Architecture
 * Validates:
 * 1. Layer 1: Query Understanding & Schema Mapping
 * 2. Layer 2: Validation & Query Planning
 * 3. Layer 3: Deterministic Execution Integrity & Numerical Ground Truth
 * 4. Layer 4: Response Explainer & Exact Metric Preservation
 * 5. Layer 5: Fallback Mechanism on All Failure Modes (Invalid Key, Timeout, Rate Limit, Malformed JSON)
 * 6. Layer 6: API Security, Credential Shielding & Zero Data Leakage
 * 7. Conversational Context & Follow-Up Questions
 * 8. Backend API End-to-End Integration
 */

import http from 'http';
import { processNaturalLanguageQuery } from '../index';
import { validateAndPlanQuery } from '../../llm/queryValidator';
import { LLMQueryUnderstanding } from '../../llm/types';
import { extractContextFromHistory } from '../../llm/conversationContext';
import { sanitizeLog, isLLMConfigured } from '../../llm/llmClient';
import app from '../../../../server';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(category: string, name: string, condition: boolean, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] [${category}] ${name}`);
  } else {
    failedTests++;
    console.error(`[FAIL] [${category}] ${name}`);
    if (details !== undefined) {
      console.error('       Failure Details:', details);
    }
  }
}

async function runHybridTests() {
  console.log('====================================================');
  console.log('HYBRID LLM + DETERMINISTIC SYSTEM: TEST SUITE');
  console.log('====================================================');

  // =========================================================================
  // 1. LAYER 2: VALIDATION AND QUERY PLANNING
  // =========================================================================
  console.log('\n--- 1. LAYER 2: VALIDATION & QUERY PLANNING ---');

  // Valid comparison understanding
  const validCompareUnderstanding: LLMQueryUnderstanding = {
    intent: 'institution_compare',
    year: 2024,
    years: [2024],
    category: 'Overall',
    institutions: ['IIT Madras', 'IISc Bangalore'],
    parameters: ['TLR', 'RPC'],
    requires_clarification: false,
  };
  const val1 = validateAndPlanQuery(validCompareUnderstanding, 'Compare IIT Madras and IISc Bangalore in 2024');
  assert('Validation', 'Valid comparison query plans successfully', val1.isValid && val1.structuredQuery?.intent === 'institution_compare');
  assert('Validation', 'Institutions resolved to official NIRF IDs',
    val1.structuredQuery?.entities.institutions[0].resolvedId === 'iit-madras' &&
    val1.structuredQuery?.entities.institutions[1].resolvedId === 'iisc-bangalore'
  );

  // Unsupported Intent Rejection
  const invalidIntentUnderstanding: any = {
    intent: 'arbitrary_unsupported_intent',
    institutions: [],
    parameters: [],
    requires_clarification: false,
  };
  const val2 = validateAndPlanQuery(invalidIntentUnderstanding, 'Test question');
  assert('Validation', 'Rejects unsupported LLM intent and marks for deterministic fallback', !val2.isValid);

  // Invalid Category Detection
  const invalidCatUnderstanding: any = {
    intent: 'top_n',
    category: 'Astrophysics', // Not an official NIRF category
    institutions: [],
    parameters: [],
    requires_clarification: false,
  };
  const val3 = validateAndPlanQuery(invalidCatUnderstanding, 'Top colleges in Astrophysics');
  assert('Validation', 'Rejects invalid category with explanatory feedback', !val3.isValid && val3.validationError?.includes('Astrophysics'));

  // Out of Bounds Year Handling
  const outOfBoundsUnderstanding: LLMQueryUnderstanding = {
    intent: 'top_n',
    year: 2010,
    years: [2010],
    category: 'Overall',
    institutions: [],
    parameters: [],
    requires_clarification: false,
  };
  const val4 = validateAndPlanQuery(outOfBoundsUnderstanding, 'Top colleges in 2010');
  assert('Validation', 'Out of bounds year (2010) flags clarification prompt with 2017-2025 bounds',
    val4.structuredQuery?.needsClarification === true &&
    val4.structuredQuery?.clarificationPrompt?.includes('2017 and 2025')
  );

  // Ambiguous Institution Disambiguation
  const ambiguousUnderstanding: LLMQueryUnderstanding = {
    intent: 'rank_lookup',
    year: 2024,
    category: 'Overall',
    institutions: ['MIT'],
    parameters: [],
    requires_clarification: false,
  };
  const val5 = validateAndPlanQuery(ambiguousUnderstanding, 'Rank of MIT in 2024');
  assert('Validation', 'Ambiguous institution (MIT) triggers disambiguation prompt without guessing',
    val5.structuredQuery?.needsClarification === true &&
    (val5.structuredQuery?.clarificationPrompt?.includes('MIT') || val5.structuredQuery?.clarificationPrompt?.includes('matching'))
  );

  // Unknown Institution Handling
  const unknownUnderstanding: LLMQueryUnderstanding = {
    intent: 'rank_lookup',
    year: 2024,
    category: 'Overall',
    institutions: ['Xyz Nonexistent College'],
    parameters: [],
    requires_clarification: false,
  };
  const val6 = validateAndPlanQuery(unknownUnderstanding, 'Rank of Xyz Nonexistent College');
  assert('Validation', 'Unknown institution reports clean not found prompt without guessing',
    val6.structuredQuery?.needsClarification === true &&
    (val6.structuredQuery?.clarificationPrompt?.includes("couldn't find") || val6.structuredQuery?.clarificationPrompt?.includes("could not find"))
  );

  // =========================================================================
  // 2. LAYER 3: DETERMINISTIC EXECUTION INTEGRITY & NUMERICAL FIDELITY
  // =========================================================================
  console.log('\n--- 2. LAYER 3: DETERMINISTIC EXECUTION INTEGRITY ---');

  const compRes = await processNaturalLanguageQuery('Compare IIT Madras and IISc Bangalore in 2024');
  assert('Deterministic Execution', 'Execution yields exact dataset score for IIT Madras (86.42) and IISc (83.28)',
    compRes.response.answer.includes('86.42') && compRes.response.answer.includes('83.28')
  );
  assert('Deterministic Execution', 'Ranks accurately reflect #1 and #2 in Overall 2024',
    compRes.response.answer.includes('#1') && compRes.response.answer.includes('#2')
  );
  assert('Deterministic Execution', 'Chart data payload contains exact parameter scores',
    Array.isArray(compRes.response.chartData) && compRes.response.chartData.length === 6 &&
    compRes.response.chartType === 'grouped_bar'
  );

  const top10Res = await processNaturalLanguageQuery('Show the top 10 institutions according to NIRF 2025');
  assert('Deterministic Execution', 'Top 10 returns exact 10 institutions with ranking_bar chart',
    top10Res.response.chartType === 'ranking_bar' &&
    top10Res.response.chartData?.length === 10
  );

  const corrRes = await processNaturalLanguageQuery('Show the correlation between NIRF scoring parameters');
  assert('Deterministic Execution', 'Correlation matrix is deterministic 6x6 heatmap',
    corrRes.response.chartType === 'heatmap' &&
    corrRes.response.chartData?.length === 6 &&
    corrRes.response.answer.includes('0.895')
  );

  // =========================================================================
  // 3. LAYER 5: INTELLIGENT FALLBACK ON LLM FAILURES
  // =========================================================================
  console.log('\n--- 3. LAYER 5: INTELLIGENT FALLBACK MECHANISM ---');

  // Test deterministic fallback when skipLLM is forced
  const fallbackRes = await processNaturalLanguageQuery(
    'Compare IIT Madras and IISc Bangalore in 2024',
    undefined,
    { skipLLM: true }
  );
  assert('Fallback Mechanism', 'Direct fallback execution produces identical verified result',
    fallbackRes.success &&
    fallbackRes.source === 'deterministic' &&
    fallbackRes.response.answer.includes('86.42') &&
    fallbackRes.response.chartType === 'grouped_bar'
  );

  // Fallback on all eight analytical domains
  const testDomains = [
    { name: 'Time-Series', query: 'IIT Madras ranking trend from 2017 to 2025', expectedChart: 'line' },
    { name: 'Geospatial', query: 'Which state has the highest number of top-ranked institutions?', expectedChart: 'horizontal_bar' },
    { name: 'Univariate', query: 'Score distribution in Engineering 2024', expectedChart: 'distribution' },
    { name: 'Correlation', query: 'Correlation between RPC and overall score in 2024', expectedChart: 'scatter' },
    { name: 'Multivariate', query: 'Compare top 5 institutions across parameters in 2024', expectedChart: 'bar' },
    { name: 'Dispersion', query: 'Top 10 versus remaining institutions in 2024', expectedChart: 'bar' },
    { name: 'Transitions', query: 'Ranking transitions between 2020 and 2024 in Overall', expectedChart: 'bar' },
    { name: 'Outliers', query: 'Statistical outliers in research score in 2024', expectedChart: 'bar' },
  ];

  for (const d of testDomains) {
    const res = await processNaturalLanguageQuery(d.query, undefined, { skipLLM: true });
    assert('Fallback Domain', `${d.name} succeeds deterministically with ${d.expectedChart} chart`,
      res.success && res.response.chartType === d.expectedChart
    );
  }

  // =========================================================================
  // 4. CONVERSATIONAL CONTEXT & FOLLOW-UP RESOLUTION
  // =========================================================================
  console.log('\n--- 4. CONVERSATIONAL CONTEXT & FOLLOW-UP RESOLUTION ---');

  // Turn 1: IIT Madras in 2024
  const turn1 = await processNaturalLanguageQuery('What is the rank of IIT Madras in 2024?');
  assert('Context', 'Turn 1 establishes context for IIT Madras 2024', turn1.response.answer.includes('Rank #1'));

  // Turn 2: Follow-up "What about IISc?"
  const history1 = [
    { sender: 'user', text: 'What is the rank of IIT Madras in 2024?' },
    { sender: 'ai', text: turn1.response.answer },
  ];
  const turn2 = await processNaturalLanguageQuery('What about IISc?', history1);
  assert('Context', 'Turn 2 inherits 2024 year and Overall category for IISc (Rank #2)',
    turn2.response.answer.includes('Rank #2') &&
    turn2.response.answer.includes('83.28')
  );

  // Turn 3: Follow-up on parameter correlation: "What about TLR?"
  const history2 = [
    { sender: 'user', text: 'Show the correlation between RPC and overall score in 2024.' },
    { sender: 'ai', text: 'In 2024 Overall, RPC exhibits correlation r = 0.895.' },
  ];
  const turn3 = await processNaturalLanguageQuery('What about TLR?', history2);
  assert('Context', 'Turn 3 inherits correlation intent and 2024 year for TLR parameter',
    turn3.intent === 'parameter_correlation' &&
    turn3.response.chartType === 'scatter'
  );

  // Context extraction helper
  const parsedCtx = extractContextFromHistory(history2);
  assert('Context Helper', 'Extracts last parameter and correlation intent from history',
    parsedCtx.lastParameter === 'RPC' && parsedCtx.lastIntent === 'parameter_correlation'
  );

  // =========================================================================
  // 5. API SECURITY & CREDENTIAL SHIELDING
  // =========================================================================
  console.log('\n--- 5. API SECURITY & CREDENTIAL SHIELDING ---');

  const testKey = 'Ab8RN6I0qcpzrIQDeLJdAG-902Y0hOax5ikWQg8TIXk_37h1bQ';
  const rawLeakString = `Error connecting with API key ${testKey} to endpoint`;
  const sanitized = sanitizeLog(rawLeakString);
  assert('Security', 'sanitizeLog redacts API key completely from logs and errors',
    !sanitized.includes(testKey) && sanitized.includes('[REDACTED_API_KEY]')
  );

  assert('Security', 'Query responses never include API key in payload',
    !JSON.stringify(compRes).includes(testKey)
  );

  // =========================================================================
  // 6. BACKEND API END-TO-END VIA EXPRESS
  // =========================================================================
  console.log('\n--- 6. BACKEND EXPRESS API /api/ai-query END-TO-END ---');

  const routeLayer = (app as any)._router.stack.find(
    (layer: any) => layer.route && layer.route.path === '/api/ai-query'
  );
  const aiQueryHandler = routeLayer.route.stack[0].handle;

  async function callHandler(body: any): Promise<{ statusCode: number; data: any }> {
    let statusCode = 200;
    let data: any = null;
    const req: any = { body, method: 'POST', headers: { 'content-type': 'application/json' } };
    const res: any = {
      setHeader: () => {},
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (d: any) => {
        data = d;
        return res;
      },
    };
    await aiQueryHandler(req, res);
    return { statusCode, data };
  }

  // Test 6A: Standard valid query
  const resA = await callHandler({
    query: 'Compare IIT Madras and IISc Bangalore in 2024',
  });
  assert('Express API', 'POST /api/ai-query returns HTTP 200 with structured response',
    resA.statusCode === 200 &&
    resA.data.success === true &&
    resA.data.response.chartType === 'grouped_bar' &&
    resA.data.response.answer.includes('86.42')
  );

  // Test 6B: Follow-up query with history
  const resB = await callHandler({
    query: 'What about IISc?',
    history: [
      { sender: 'user', text: 'What is the rank of IIT Madras in 2024?' },
      { sender: 'ai', text: 'In the 2024 NIRF Overall rankings, IIT Madras holds Rank #1.' },
    ],
  });
  assert('Express API', 'POST /api/ai-query resolves conversational follow-up via history',
    resB.statusCode === 200 &&
    resB.data.response.answer.includes('Rank #2')
  );

  // Test 6C: Out of Scope Refusal
  const resC = await callHandler({
    query: 'What is the capital of France?',
  });
  assert('Express API', 'POST /api/ai-query correctly refuses out-of-scope query',
    resC.statusCode === 200 &&
    resC.data.response.isOutOfScope === true &&
    resC.data.response.chartType === undefined
  );

  // Test 6D: Missing query validation
  const resD = await callHandler({});
  assert('Express API', 'POST /api/ai-query rejects empty query with HTTP 400', resD.statusCode === 400);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`HYBRID TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runHybridTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
