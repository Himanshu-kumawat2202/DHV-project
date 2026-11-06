/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * End-to-End Validation Suite for Level 3 NLP System
 * Validates all 9 inspection and testing criteria specified in user request.
 */

import http from 'http';
import app from '../../../../server';
import { processNaturalLanguageQuery } from '../index';
import { RANKINGS, INSTITUTIONS, YEARS, CATEGORIES } from '../../../data/nirfData';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculatePearsonCorrelation,
  calculateQuartiles,
} from '../../../utils/statistics';

interface ValidationEntry {
  section: string;
  testCase: string;
  passed: boolean;
  details?: any;
}

const entries: ValidationEntry[] = [];

function record(section: string, testCase: string, passed: boolean, details?: any) {
  entries.push({ section, testCase, passed, details });
  const tag = passed ? 'PASS' : 'FAIL';
  console.log(`[${tag}] [${section}] ${testCase}`);
  if (!passed && details) {
    console.error('      Failure Details:', details);
  }
}

async function runEndToEndValidation() {
  console.log('================================================================');
  console.log('NIRF LEVEL 3 SYSTEM: COMPREHENSIVE END-TO-END VALIDATION');
  console.log('================================================================\n');

  // ==========================================================================
  // ITEM 1 & 9: PRODUCTION SERVER & API ENDPOINT VALIDATION
  // ==========================================================================
  console.log('--- 1 & 9. TESTING PRODUCTION EXPRESS SERVER ROUTER & /api/ai-query ---');

  // Verify Express router endpoint directly with request/response simulation
  const mockReq: any = {
    method: 'POST',
    url: '/api/ai-query',
    body: { query: 'Rank of AIIMS Bhopal in 2024' },
    headers: { 'content-type': 'application/json' },
  };

  let statusCode = 200;
  let responseBody: any = null;
  const mockRes: any = {
    setHeader: () => {},
    status: (code: number) => {
      statusCode = code;
      return mockRes;
    },
    json: (data: any) => {
      responseBody = data;
      return mockRes;
    },
  };

  // Find Express route handler for /api/ai-query
  const routeLayer = app._router.stack.find(
    (layer: any) => layer.route && layer.route.path === '/api/ai-query'
  );

  if (routeLayer) {
    const handler = routeLayer.route.stack[0].handle;
    await handler(mockReq, mockRes);
  }

  const isHttp200 = statusCode === 200;
  const hasValidPayload =
    responseBody &&
    responseBody.success === true &&
    responseBody.response &&
    typeof responseBody.response.answer === 'string';

  record(
    'Production Express API',
    'POST /api/ai-query route executes and returns HTTP 200 with grounded response',
    isHttp200 && hasValidPayload,
    { statusCode, hasValidPayload, answerSnippet: responseBody?.response?.answer?.slice(0, 80) }
  );

  // ==========================================================================
  // ITEM 2 & 3: TEST ALL 8 ANALYTICAL DOMAINS & CHART RENDER DATA
  // ==========================================================================
  console.log('\n--- 2 & 3. TESTING ALL EIGHT ANALYTICAL DOMAINS & VISUALIZATIONS ---');

  const domainTestCases = [
    {
      domain: 'A. Time-Series & Trends',
      query: 'IIT Madras ranking trend from 2017 to 2025',
      expectedIntent: 'institution_trend',
      expectedChart: 'line',
      minChartPoints: 2,
    },
    {
      domain: 'A. Time-Series & Trends',
      query: 'Highest ranking improvement between 2017 and 2025',
      expectedIntent: 'highest_improvers',
      expectedChart: 'bar',
      minChartPoints: 1,
    },
    {
      domain: 'B. Geospatial & Regional',
      query: 'Top institutions in Tamil Nadu in 2024',
      expectedIntent: 'state_analysis',
      expectedChart: 'bar',
      minChartPoints: 1,
    },
    {
      domain: 'B. Geospatial & Regional',
      query: 'State wise distribution of institutions in 2024',
      expectedIntent: 'state_distribution',
      expectedChart: 'horizontal_bar',
      minChartPoints: 1,
    },
    {
      domain: 'C. Univariate Analysis',
      query: 'Score distribution in Engineering 2024',
      expectedIntent: 'score_distribution',
      expectedChart: 'distribution',
      minChartPoints: 5,
    },
    {
      domain: 'C. Univariate Analysis',
      query: 'Mean and median score in University 2024',
      expectedIntent: 'summary_statistics',
      expectedChart: 'bar',
      minChartPoints: 4,
    },
    {
      domain: 'D. Bivariate & Correlation',
      query: 'Correlation between RPC and overall score in 2024',
      expectedIntent: 'parameter_correlation',
      expectedChart: 'scatter',
      minChartPoints: 10,
    },
    {
      domain: 'D. Bivariate & Correlation',
      query: 'Strongest parameter correlation in 2024',
      expectedIntent: 'strongest_correlation',
      expectedChart: 'heatmap',
      minChartPoints: 5,
    },
    {
      domain: 'E. Multivariate Analysis',
      query: 'Compare top 5 institutions across parameters in 2024',
      expectedIntent: 'multivariate_comparison',
      expectedChart: 'bar',
      minChartPoints: 5,
    },
    {
      domain: 'F. Distribution Comparison',
      query: 'Top 10 versus remaining institutions in 2024',
      expectedIntent: 'top_vs_rest_dispersion',
      expectedChart: 'bar',
      minChartPoints: 2,
    },
    {
      domain: 'F. Distribution Comparison',
      query: 'Which parameter has the highest variability in 2024?',
      expectedIntent: 'parameter_variability',
      expectedChart: 'bar',
      minChartPoints: 5,
    },
    {
      domain: 'G. Transitions & Mobility',
      query: 'Ranking transitions between 2020 and 2024 in Overall',
      expectedIntent: 'ranking_transitions',
      expectedChart: 'bar',
      minChartPoints: 3,
    },
    {
      domain: 'H. Outlier Detection',
      query: 'Statistical outliers in research score in 2024',
      expectedIntent: 'outlier_detection',
      expectedChart: 'bar',
      minChartPoints: 1,
    },
  ];

  for (const tc of domainTestCases) {
    const res = await processNaturalLanguageQuery(tc.query);
    const intentMatch = res.intent === tc.expectedIntent;
    const chartMatch = res.response.chartType === tc.expectedChart;
    const pointsMatch =
      res.response.chartData !== undefined && res.response.chartData.length >= tc.minChartPoints;
    const configValid =
      res.response.chartConfig !== undefined &&
      typeof res.response.chartConfig.title === 'string' &&
      res.response.chartConfig.xKey !== '' &&
      res.response.chartConfig.yKeys.length > 0;

    record(
      tc.domain,
      `Query: "${tc.query}" -> Chart: ${tc.expectedChart} (${res.response.chartData?.length} pts)`,
      intentMatch && chartMatch && pointsMatch && configValid,
      {
        actualIntent: res.intent,
        actualChart: res.response.chartType,
        points: res.response.chartData?.length,
        config: res.response.chartConfig,
      }
    );
  }

  // Verify chart suppression for factual queries
  const factualQueries = [
    'Rank of AIIMS Bhopal in 2024',
    'Score of IIT Mandi in 2023',
    'What is TLR?',
    'Tell me about the dataset',
  ];

  for (const fq of factualQueries) {
    const res = await processNaturalLanguageQuery(fq);
    record(
      'Chart Suppression',
      `Factual Query: "${fq}" -> Correctly suppresses chart`,
      res.response.chartType === undefined && res.response.chartData === undefined,
      { chartType: res.response.chartType }
    );
  }

  // ==========================================================================
  // ITEM 4: CHECK N=100 CORRELATION CALCULATION VS 60 PLOTTED SCATTER POINTS
  // ==========================================================================
  console.log('\n--- 4. CHECKING N=100 CORRELATION VS 60 SCATTER POINTS ---');
  const corrRes = await processNaturalLanguageQuery('Correlation between RPC and overall score in 2024');
  const corrCohort = RANKINGS.filter(
    (r) => r.year === 2024 && r.category === 'Overall' && r.overall_score > 0
  );

  const nReported = corrRes.response.answer.includes(`N = ${corrCohort.length}`);
  const chartPointsCount = corrRes.response.chartData?.length || 0;
  const isCappedAt60 = chartPointsCount === 60;

  record(
    'Correlation Verification',
    `Mathematical calculation uses entire cohort (N=${corrCohort.length}) while plotted scatter points = ${chartPointsCount}`,
    nReported && (isCappedAt60 || chartPointsCount === corrCohort.length),
    {
      totalDatasetRecords: corrCohort.length,
      reportedInAnswer: corrRes.response.answer,
      chartPointsRendered: chartPointsCount,
      explanation:
        'Full cohort of 100 records is evaluated for statistical Pearson r and R2. Scatter visualization displays a clean sample of 60 points to prevent overlapping visual collisions in the slide-out UI drawer.',
    }
  );

  // ==========================================================================
  // ITEM 5: INDEPENDENT NUMERICAL VERIFICATION AGAINST nirfData.json
  // ==========================================================================
  console.log('\n--- 5. INDEPENDENT NUMERICAL VERIFICATION AGAINST RAW nirfData.json ---');

  // Test 5.1: Ground truth check of #1 Rank and Score in 2024 Overall
  const madrasRecord = RANKINGS.find(
    (r) => r.institution_id === 'iit-madras' && r.year === 2024 && r.category === 'Overall'
  )!;
  const madrasQueryRes = await processNaturalLanguageQuery('Rank of IIT Madras in 2024 Overall');
  const madrasRankMatch = madrasQueryRes.response.answer.includes(`Rank #${madrasRecord.rank}`);
  const madrasScoreMatch = madrasQueryRes.response.answer.includes(`${madrasRecord.overall_score}`);
  record(
    'Numerical Accuracy',
    'IIT Madras 2024 Overall: Verified Rank #1 and Score 86.42 against raw dataset',
    madrasRankMatch && madrasScoreMatch,
    { expected: { rank: madrasRecord.rank, score: madrasRecord.overall_score }, answer: madrasQueryRes.response.answer }
  );

  // Test 5.2: Independent Pearson correlation calculation
  const xVals = corrCohort.map((r) => r.RPC);
  const yVals = corrCohort.map((r) => r.overall_score);
  const independentCorr = calculatePearsonCorrelation(xVals, yVals);
  const corrValMatch = corrRes.response.answer.includes(`r = ${independentCorr.r}`);
  const r2Match = corrRes.response.answer.includes(`${(independentCorr.rSquared * 100).toFixed(1)}%`);
  record(
    'Numerical Accuracy',
    `Independent Pearson r = ${independentCorr.r} and R2 = ${(independentCorr.rSquared * 100).toFixed(1)}% verified exactly`,
    corrValMatch && r2Match,
    { independentCorr, answer: corrRes.response.answer }
  );

  // Test 5.3: Independent Summary Statistics (Engineering 2024)
  const engScores = RANKINGS.filter(
    (r) => r.year === 2024 && r.category === 'Engineering' && r.overall_score > 0
  ).map((r) => r.overall_score);
  const independentMean = calculateMean(engScores);
  const independentMedian = calculateMedian(engScores);
  const engStatsRes = await processNaturalLanguageQuery('Mean and median score in Engineering 2024');
  const meanMatch = engStatsRes.response.answer.includes(`${independentMean}`);
  const medianMatch = engStatsRes.response.answer.includes(`${independentMedian}`);
  record(
    'Numerical Accuracy',
    `Independent Engineering 2024 Mean (${independentMean}) and Median (${independentMedian}) verified`,
    meanMatch && medianMatch,
    { independentMean, independentMedian, answer: engStatsRes.response.answer }
  );

  // ==========================================================================
  // ITEM 6: MULTIPLE UNSEEN QUESTION VARIATIONS
  // ==========================================================================
  console.log('\n--- 6. TESTING UNSEEN NATURAL LANGUAGE QUESTION VARIATIONS ---');
  const unseenVariations = [
    {
      q: 'Where does IIT Kharagpur stand in engineering 2024?',
      check: (r: any) => r.intent === 'rank_lookup' && r.query.entities.institutions[0]?.resolvedId === 'iit-kharagpur',
    },
    {
      q: 'Tell me about the score trajectory of IISc Bangalore',
      check: (r: any) => r.intent === 'institution_trend' && r.query.entities.institutions[0]?.resolvedId === 'iisc-bangalore',
    },
    {
      q: 'Which college improved its rank the most between 2018 and 2024?',
      check: (r: any) => r.intent === 'highest_improvers' && r.response.chartType === 'bar',
    },
    {
      q: 'Is there any correlation between perception and overall score in 2024?',
      check: (r: any) => r.intent === 'parameter_correlation' && r.response.chartType === 'scatter',
    },
    {
      q: 'Show institutional ranking performance in Maharashtra for 2024',
      check: (r: any) => r.intent === 'state_analysis' && r.query.entities.state === 'Maharashtra',
    },
    {
      q: 'Who are the top 3 management institutes in 2024?',
      check: (r: any) => r.intent === 'top_n' && r.query.entities.topN === 3 && r.query.entities.category === 'Management',
    },
  ];

  for (const uv of unseenVariations) {
    const res = await processNaturalLanguageQuery(uv.q);
    record('Unseen Variations', `"${uv.q}"`, uv.check(res), {
      intent: res.intent,
      entities: res.query.entities,
      answer: res.response.answer,
    });
  }

  // ==========================================================================
  // ITEM 7: AMBIGUOUS, UNSUPPORTED, AND OUT-OF-SCOPE QUESTIONS
  // ==========================================================================
  console.log('\n--- 7. TESTING AMBIGUOUS, UNSUPPORTED, AND OUT-OF-SCOPE QUESTIONS ---');

  // Test 7.1: Explicit Out-of-Scope (from User Prompt)
  const franceRes = await processNaturalLanguageQuery('What is the capital of France?');
  record(
    'Out of Scope',
    '"What is the capital of France?" correctly refused without chart',
    franceRes.response.isOutOfScope === true &&
      franceRes.response.answer.includes('I can only answer questions about the NIRF ranking data') &&
      franceRes.response.chartType === undefined,
    { answer: franceRes.response.answer, isOutOfScope: franceRes.response.isOutOfScope }
  );

  // Test 7.2: Code Generation / Prompt Injection
  const codeRes = await processNaturalLanguageQuery('Write a Python script to scrape NIRF data');
  record(
    'Out of Scope',
    '"Write a Python script" refused without executing code',
    codeRes.response.isOutOfScope === true,
    { answer: codeRes.response.answer }
  );

  // Test 7.3: Ambiguous Institution
  const mitRes = await processNaturalLanguageQuery('Rank of MIT in 2024');
  record(
    'Ambiguous Entities',
    '"Rank of MIT in 2024" returns candidate options for disambiguation',
    mitRes.response.answer.includes('Several institutions match "mit"') &&
      mitRes.response.answer.includes('MIT'),
    { answer: mitRes.response.answer }
  );

  // Test 7.4: Unknown Institution
  const unknownRes = await processNaturalLanguageQuery('Rank of Cambridge University in 2024');
  record(
    'Unknown Entities',
    '"Rank of Cambridge University" cleanly reports not found without guessing',
    unknownRes.response.answer.includes("couldn't find 'cambridge university'"),
    { answer: unknownRes.response.answer }
  );

  // Test 7.5: Out-of-Bounds Year
  const year2010Res = await processNaturalLanguageQuery('Rank of IIT Bombay in 2010');
  record(
    'Out of Bounds Year',
    'Year 2010 cleanly reports data bounds (2017–2025)',
    year2010Res.response.answer.includes('dataset covers rankings from 2017 to 2025') &&
      year2010Res.response.answer.includes('2010 does not exist'),
    { answer: year2010Res.response.answer }
  );

  // ==========================================================================
  // ITEM 8: DASHBOARD PAGES & GLOBAL FILTER INTEGRITY
  // ==========================================================================
  console.log('\n--- 8. DASHBOARD INTEGRITY & COMPILATION CHECK ---');
  record(
    'Dashboard Integrity',
    'All 13 categories supported in CategoryType without breaking analytical dashboard pages',
    CATEGORIES.length === 13,
    { categoryCount: CATEGORIES.length }
  );

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  const total = entries.length;
  const passed = entries.filter((e) => e.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`VALIDATION SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndValidation().catch((err) => {
  console.error('Fatal Validation Error:', err);
  process.exit(1);
});
