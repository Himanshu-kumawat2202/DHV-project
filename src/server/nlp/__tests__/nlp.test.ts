/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Comprehensive Automated Test Suite
 * Covers Intent Classification, Entity Extraction, Question Variations,
 * Numerical Correctness against ground truth, and Edge Cases across all 8 Analytical Domains.
 */

import { processNaturalLanguageQuery } from '../index';
import { RANKINGS, INSTITUTIONS } from '../../../data/nirfData';
import { calculateMean, calculateMedian, calculateStandardDeviation } from '../../../utils/statistics';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, actual?: any, expected?: any) {
  results.push({
    suite,
    name,
    passed: condition,
    actual,
    expected,
  });
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${suite} :: ${name}`);
  if (!condition) {
    console.error(`       Expected: ${JSON.stringify(expected)}`);
    console.error(`       Actual:   ${JSON.stringify(actual)}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING NIRF LEVEL 3 NLP AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // ==========================================
  // 1. INTENT TESTS ACROSS ALL 8 DOMAINS
  // ==========================================
  const intentTestCases = [
    // Standard Lookups
    { q: 'Rank of AIIMS Bhopal in 2024', expectedIntent: 'rank_lookup' },
    { q: 'Score of IIT Mandi in 2023', expectedIntent: 'score_lookup' },
    { q: 'Compare IIT Madras and IIT Delhi in 2024', expectedIntent: 'institution_compare' },
    { q: 'Top 5 engineering colleges in 2024', expectedIntent: 'top_n' },
    { q: 'How many colleges in NIRF 2024?', expectedIntent: 'count_query' },

    // Domain A: Time-Series and Trends
    { q: 'What was IIT Madras ranking trend from 2017 to 2025?', expectedIntent: 'institution_trend' },
    { q: 'Highest ranking improvement between 2017 and 2025', expectedIntent: 'highest_improvers' },
    { q: 'Largest ranking decline between 2017 and 2025', expectedIntent: 'largest_decliners' },
    { q: 'Average score trend across years in Overall', expectedIntent: 'score_trend_average' },
    { q: 'Consistently top-ranked institutions in Overall', expectedIntent: 'consistently_top_ranked' },

    // Domain B: Geospatial and Regional Analysis
    { q: 'Top institutions in Tamil Nadu in 2024', expectedIntent: 'state_analysis' },
    { q: 'State wise distribution of institutions in 2024', expectedIntent: 'state_distribution' },
    { q: 'Compare Tamil Nadu and Karnataka institutions in 2024', expectedIntent: 'state_comparison' },

    // Domain C: Univariate Analysis
    { q: 'Score distribution in Engineering 2024', expectedIntent: 'score_distribution' },
    { q: 'Mean and median score in University 2024', expectedIntent: 'summary_statistics' },
    { q: 'Score quartiles in Management 2024', expectedIntent: 'summary_statistics' },

    // Domain D: Bivariate & Correlation Analysis
    { q: 'Correlation between RPC and overall score in 2024', expectedIntent: 'parameter_correlation' },
    { q: 'Strongest parameter correlation in 2024', expectedIntent: 'strongest_correlation' },

    // Domain E: Multivariate Analysis
    { q: 'Compare top 5 institutions across parameters in 2024', expectedIntent: 'multivariate_comparison' },
    { q: 'Institutions with high research but low teaching in 2024', expectedIntent: 'high_research_low_teaching' },

    // Domain F: Distribution and Statistical Comparison
    { q: 'Top 10 versus remaining institutions in 2024', expectedIntent: 'top_vs_rest_dispersion' },
    { q: 'Which parameter has the highest variability in 2024?', expectedIntent: 'parameter_variability' },

    // Domain G: Ranking Transitions and Mobility
    { q: 'Ranking transitions between 2020 and 2024 in Overall', expectedIntent: 'ranking_transitions' },

    // Domain H: Outlier Detection
    { q: 'Statistical outliers in research score in 2024', expectedIntent: 'outlier_detection' },
  ];

  for (const tc of intentTestCases) {
    const res = await processNaturalLanguageQuery(tc.q);
    assert('Intent Tests', tc.q, res.intent === tc.expectedIntent, res.intent, tc.expectedIntent);
  }

  // ==========================================
  // 2. ENTITY EXTRACTION TESTS
  // ==========================================
  const entityTestCases = [
    {
      q: 'Rank of IIT Madras in 2024',
      check: (r: any) =>
        r.query.entities.institutions.some((i: any) => i.resolvedId === 'iit-madras') &&
        r.query.entities.years.includes(2024),
    },
    {
      q: 'Score of IIT Bombay in Engineering 2023',
      check: (r: any) =>
        r.query.entities.institutions.some((i: any) => i.resolvedId === 'iit-bombay') &&
        r.query.entities.category === 'Engineering' &&
        r.query.entities.years.includes(2023),
    },
    {
      q: 'Compare Tamil Nadu and Karnataka in 2024',
      check: (r: any) =>
        r.query.entities.state === 'Tamil Nadu' &&
        r.query.entities.comparisonState === 'Karnataka',
    },
    {
      q: 'Top 5 engineering institutions in 2024',
      check: (r: any) =>
        r.query.entities.topN === 5 &&
        r.query.entities.category === 'Engineering',
    },
    {
      q: 'Trend of NIT Trichy from 2017 to 2025',
      check: (r: any) =>
        r.query.entities.yearRange?.startYear === 2017 &&
        r.query.entities.yearRange?.endYear === 2025,
    },
  ];

  for (const tc of entityTestCases) {
    const res = await processNaturalLanguageQuery(tc.q);
    assert('Entity Tests', tc.q, tc.check(res), res.query.entities);
  }

  // ==========================================
  // 3. QUESTION VARIATION TESTS
  // ==========================================
  const variations = [
    'Show IIT Madras ranking trend.',
    'How has IIT Madras performed over the years?',
    'Display the rank progression of IIT Madras.',
    'Tell me how IIT Madras ranking changed from 2017 to 2025.',
  ];

  for (const v of variations) {
    const res = await processNaturalLanguageQuery(v);
    assert(
      'Variation Tests',
      v,
      res.intent === 'institution_trend' &&
        res.query.entities.institutions.some((i: any) => i.resolvedId === 'iit-madras'),
      { intent: res.intent, inst: res.query.entities.institutions[0]?.resolvedId }
    );
  }

  // ==========================================
  // 4. NUMERICAL ACCURACY / GROUND TRUTH TESTS
  // ==========================================

  // Test 4A: Exact Rank & Score for IIT Madras in 2024 Overall
  const madras2024Raw = RANKINGS.find(
    (r) => r.institution_id === 'iit-madras' && r.year === 2024 && r.category === 'Overall'
  );
  if (madras2024Raw) {
    const res = await processNaturalLanguageQuery('Rank of IIT Madras in 2024 Overall');
    const answer = res.response.answer;
    assert(
      'Numerical Ground Truth',
      'IIT Madras 2024 Rank (#1) and Score in answer',
      answer.includes(`#${madras2024Raw.rank}`) && answer.includes(`${madras2024Raw.overall_score}`),
      answer,
      `Rank #${madras2024Raw.rank}, Score ${madras2024Raw.overall_score}`
    );
  }

  // Test 4B: Top 1 Institution in 2024 Engineering
  const topEng2024Raw = RANKINGS.filter(
    (r) => r.year === 2024 && r.category === 'Engineering'
  ).sort((a, b) => a.rank - b.rank)[0];

  if (topEng2024Raw) {
    const res = await processNaturalLanguageQuery('Top 5 engineering colleges in 2024');
    assert(
      'Numerical Ground Truth',
      'Top engineering college matches #1 in dataset',
      res.response.answer.includes(`${topEng2024Raw.overall_score}`) &&
        res.response.chartData !== undefined &&
        res.response.chartData[0].Score === topEng2024Raw.overall_score,
      res.response.chartData?.[0],
      topEng2024Raw.overall_score
    );
  }

  // Test 4C: Count of Institutions in Overall 2024
  const countOverall2024 = RANKINGS.filter(
    (r) => r.year === 2024 && r.category === 'Overall'
  ).length;
  const countRes = await processNaturalLanguageQuery('How many institutions in Overall 2024?');
  assert(
    'Numerical Ground Truth',
    'Total count of institutions matches dataset exactly',
    countRes.response.answer.includes(`${countOverall2024}`),
    countRes.response.answer,
    countOverall2024
  );

  // Test 4D: Summary statistics verification
  const univ2024Scores = RANKINGS.filter(
    (r) => r.year === 2024 && r.category === 'University' && r.overall_score > 0
  ).map((r) => r.overall_score);
  const calculatedMean = calculateMean(univ2024Scores);
  const calculatedMedian = calculateMedian(univ2024Scores);

  const statsRes = await processNaturalLanguageQuery('Mean and median score in University 2024');
  assert(
    'Numerical Ground Truth',
    'Calculated mean score verified in summary',
    statsRes.response.answer.includes(`${calculatedMean}`),
    statsRes.response.answer,
    calculatedMean
  );
  assert(
    'Numerical Ground Truth',
    'Calculated median score verified in summary',
    statsRes.response.answer.includes(`${calculatedMedian}`),
    statsRes.response.answer,
    calculatedMedian
  );

  // Test 4F: Head-to-Head Comparison (IIT Madras vs IISc Bangalore)
  const compRes = await processNaturalLanguageQuery('Compare IIT Madras and IISc Bangalore.');
  assert(
    'Numerical Ground Truth',
    'Compare IIT Madras and IISc Bangalore gives #1 and #2 with grouped_bar chart',
    compRes.response.answer.includes('IIT Madras holds Rank #1') &&
      compRes.response.answer.includes('Rank #2') &&
      (compRes.response.chartType === 'grouped_bar' || compRes.response.chartType === 'radar'),
    compRes.response.answer
  );

  // Test 4G: Institution Cross-Year Alias Resolution (IISc in 2024)
  const iisc2024Res = await processNaturalLanguageQuery('Rank of IISc Bangalore in 2024');
  assert(
    'Numerical Ground Truth',
    'Rank of IISc Bangalore in 2024 resolves to Rank #2 with score 83.28',
    iisc2024Res.response.answer.includes('Rank #2') &&
      iisc2024Res.response.answer.includes('83.28'),
    iisc2024Res.response.answer
  );

  // ==========================================
  // 5. EDGE CASES & AMBIGUITY
  // ==========================================

  // 5A: Ambiguous Institution (MIT)
  const mitRes = await processNaturalLanguageQuery('Rank of MIT in 2024');
  assert(
    'Edge Cases',
    'Ambiguous institution (MIT) requests clarification and lists candidates',
    mitRes.response.answer.includes('Several institutions match "mit"') ||
      mitRes.response.answer.includes('Which one did you mean'),
    mitRes.response.answer
  );

  // 5B: Unknown Institution
  const unknownRes = await processNaturalLanguageQuery('Rank of Hogwarts University in 2024');
  assert(
    'Edge Cases',
    'Unknown institution cleanly reports not found without hallucinating',
    unknownRes.response.answer.includes("couldn't find 'hogwarts university'"),
    unknownRes.response.answer
  );

  // 5C: Non-existent Year
  const yearRes = await processNaturalLanguageQuery('Rank of IIT Madras in 2012');
  assert(
    'Edge Cases',
    'Out of bounds year cleanly reports dataset range (2017 to 2025)',
    yearRes.response.answer.includes('dataset covers rankings from 2017 to 2025') &&
      yearRes.response.answer.includes('2012 does not exist'),
    yearRes.response.answer
  );

  // 5D: Invalid Category
  const catRes = await processNaturalLanguageQuery('Rank of IIT Madras in Robotics 2024');
  assert(
    'Edge Cases',
    'Invalid category cleanly reports error and lists valid categories',
    catRes.response.answer.includes("Category 'Robotics' does not exist") ||
      catRes.response.answer.includes('Valid categories'),
    catRes.response.answer
  );

  // 5E: Explicit Out of Scope
  const oosRes = await processNaturalLanguageQuery('What is the weather in Delhi today?');
  assert(
    'Edge Cases',
    'Explicit non-NIRF questions are politely refused without visual chart',
    oosRes.response.isOutOfScope === true && oosRes.response.chartType === undefined,
    oosRes.response
  );

  // ==========================================
  // 6. MULTI-YEAR MULTI-CATEGORY REGRESSION TESTS
  // ==========================================

  // 6A: IISc Bangalore in University 2024
  const iiscUniv24 = await processNaturalLanguageQuery('Rank of IISc Bangalore in University 2024');
  assert(
    'Regression :: Multi-Category',
    'IISc Bangalore in University 2024 resolves to Rank #1 with score 83.29',
    iiscUniv24.response.answer.includes('Rank #1') &&
      iiscUniv24.response.answer.includes('83.29') &&
      iiscUniv24.response.answer.includes('University'),
    iiscUniv24.response.answer
  );

  // 6B: IIT Madras in Engineering 2024
  const iitEng24 = await processNaturalLanguageQuery('Rank of IIT Madras in Engineering 2024');
  assert(
    'Regression :: Multi-Category',
    'IIT Madras in Engineering 2024 resolves to Rank #1 with score 89.46',
    iitEng24.response.answer.includes('Rank #1') &&
      iitEng24.response.answer.includes('89.46') &&
      iitEng24.response.answer.includes('Engineering'),
    iitEng24.response.answer
  );

  // 6C: JNU in University 2024
  const jnuUniv24 = await processNaturalLanguageQuery('Score of JNU in University 2024');
  assert(
    'Regression :: Multi-Category',
    'JNU in University 2024 resolves to Rank #2 with score 69.8',
    jnuUniv24.response.answer.includes('Rank #2') &&
      jnuUniv24.response.answer.includes('69.8') &&
      jnuUniv24.response.answer.includes('University'),
    jnuUniv24.response.answer
  );

  // 6D: BITS Pilani in Pharmacy 2024
  const bitsPharm24 = await processNaturalLanguageQuery('Rank of BITS Pilani in Pharmacy 2024');
  assert(
    'Regression :: Multi-Category',
    'BITS Pilani in Pharmacy 2024 resolves to Rank #3 with score 78.95',
    bitsPharm24.response.answer.includes('Rank #3') &&
      bitsPharm24.response.answer.includes('78.95') &&
      bitsPharm24.response.answer.includes('Pharmacy'),
    bitsPharm24.response.answer
  );

  // 6E: Head-to-Head: Compare JNU and BITS Pilani in University 2024
  const compJnuBits = await processNaturalLanguageQuery('Compare JNU and BITS Pilani in University 2024');
  assert(
    'Regression :: Multi-Category Comparison',
    'Compare JNU and BITS Pilani in University 2024 correctly pairs JNU (#2) and BITS (#19)',
    compJnuBits.response.answer.includes('Rank #2') &&
      compJnuBits.response.answer.includes('Rank #19') &&
      (compJnuBits.response.chartType === 'grouped_bar' || compJnuBits.response.chartType === 'radar'),
    compJnuBits.response.answer
  );

  // 6F: Head-to-Head: Compare IIT Madras and IISc Bangalore in Research 2024
  const compResearch = await processNaturalLanguageQuery('Compare IIT Madras and IISc Bangalore in Research 2024');
  assert(
    'Regression :: Multi-Category Comparison',
    'Compare IIT Madras and IISc Bangalore in Research 2024 pairs IISc (#1) and IIT Madras (#2)',
    compResearch.response.answer.includes('Rank #1') &&
      compResearch.response.answer.includes('Rank #2') &&
      (compResearch.response.chartType === 'grouped_bar' || compResearch.response.chartType === 'radar'),
    compResearch.response.answer
  );

  // 6G: Historical Trend: Trend of BITS Pilani in Pharmacy from 2017 to 2025
  const trendBits = await processNaturalLanguageQuery('Trend of BITS Pilani in Pharmacy from 2017 to 2025');
  assert(
    'Regression :: Trend Deduplication',
    'Trend of BITS Pilani in Pharmacy has 9 points with zero duplicates',
    trendBits.response.chartType === 'line' &&
      trendBits.response.chartData?.length === 9,
    trendBits.response.chartData?.length
  );

  // 6H: Historical Trend: Trend of IISc Bangalore from 2017 to 2025
  const trendIisc = await processNaturalLanguageQuery('Trend of IISc Bangalore from 2017 to 2025');
  assert(
    'Regression :: Trend Deduplication',
    'Trend of IISc Bangalore in Overall has 9 points across 2017 to 2025 without missing 2024',
    trendIisc.response.chartType === 'line' &&
      trendIisc.response.chartData?.length === 9,
    trendIisc.response.chartData?.length
  );

  // ==========================================
  // TEST SUITE REPORT
  // ==========================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n====================================================');
  console.log(`TEST SUITE SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
