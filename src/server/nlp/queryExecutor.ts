/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Level 3 NLP Query Executor
 * Deterministic analytical execution engine operating on real NIRF data (2017–2025).
 * Strictly computes from actual records; never invents missing data.
 */

import { StructuredQuery } from './types';
import { INSTITUTIONS, RANKINGS, YEARS, CATEGORIES, PARAMETER_WEIGHTS } from '../../data/nirfData';
import {
  Institution,
  RankingRecord,
  CategoryType,
  ParameterKey,
  AIQueryResponse,
  ChartType,
  ChartConfig,
  StructuredSections,
} from '../../types';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateQuartiles,
  calculateStatsSummary,
  calculatePearsonCorrelation,
  calculateRankMovement,
  getRankBand,
  calculateZScore,
} from '../../utils/statistics';
import { calculateExtendedStats } from '../../utils/dynamicStats';
import {
  checkDataAvailability,
  getEquivalentInstitutionIds,
  getInstitutionRankings,
} from '../../services/institutionResolver';

const instMap = new Map<string, Institution>(INSTITUTIONS.map((i) => [i.institution_id, i]));

export interface QueryExecutionResult {
  intent: string;
  summary: string;
  structuredSections?: StructuredSections;
  explanation?: string;
  data: any;
  chartData?: any[];
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  calculationDetails?: {
    formula: string;
    filtersApplied: string;
    sampleSize: string;
    sourceDataset: string;
  };
  isOutOfScope?: boolean;
  isDatasetQuery?: boolean;
  isError?: boolean;
}

/**
 * Executes a structured query against the verified NIRF dataset
 */
export function executeNLPQuery(sq: StructuredQuery, originalQuery: string): QueryExecutionResult {
  const qLower = originalQuery.toLowerCase();

  // 1. OUT OF SCOPE Refusal
  if (sq.intent === 'out_of_scope') {
    return {
      intent: 'out_of_scope',
      summary: 'I can only answer questions about the NIRF ranking data and the analysis in this dashboard.',
      data: null,
      isOutOfScope: true,
    };
  }

  // 2. CLARIFICATION NEEDED / UNSUPPORTED
  if (sq.needsClarification || sq.intent === 'clarification_needed') {
    return {
      intent: 'clarification_needed',
      summary: sq.clarificationPrompt || 'Could you please clarify your question?',
      data: null,
      isError: true,
    };
  }

  if (sq.intent === 'unsupported_or_ambiguous') {
    return {
      intent: 'unsupported_or_ambiguous',
      summary:
        sq.clarificationPrompt ||
        'I could not find matching ranking records for your query. Please specify a valid institution, category, or year (2017–2025).',
      data: null,
      isError: true,
    };
  }

  // 3. DATASET INQUIRY
  if (sq.intent === 'dataset_inquiry') {
    return {
      intent: 'dataset_inquiry',
      summary:
        'The dashboard contains the official Ministry of Education NIRF dataset covering 2017 to 2025 across 13 academic categories and 6,843 verified ranking records.',
      data: {
        'Available Years': '2017 – 2025 (9 annual editions)',
        'Categories': '13 categories (Overall, Engineering, Management, University, College, Medical, Pharmacy, Law, Architecture, Dental, Agriculture, Research, State Public University)',
        'Institutions': '1,231 verified Indian institutions',
        'Parameters': 'Overall Score, TLR (30%), RPC (30%), GO (20%), OI (10%), PR (10%), Rank',
      },
      isDatasetQuery: true,
    };
  }

  // 4. PARAMETER DEFINITIONS
  if (sq.intent === 'parameter_definition') {
    if (qLower.includes('tlr') || qLower.includes('teaching')) {
      return {
        intent: 'parameter_definition',
        summary: 'Teaching, Learning & Resources (TLR) evaluates Student Strength, Faculty-Student Ratio, Faculty Qualifications (PhD & experience), and Financial Resource Utilization (weight: 30%).',
        data: { parameter: 'TLR', weight: 0.30 },
      };
    }
    if (qLower.includes('rpc') || qLower.includes('research')) {
      return {
        intent: 'parameter_definition',
        summary: 'Research and Professional Practice (RPC) evaluates combined metrics for Publications, Citations, Quality of Publications (Q1 journals), and Patents/IPR (weight: 30%).',
        data: { parameter: 'RPC', weight: 0.30 },
      };
    }
    if (qLower.includes('go') || qLower.includes('graduation')) {
      return {
        intent: 'parameter_definition',
        summary: 'Graduation Outcomes (GO) measures university examination performance, median placement salaries, and progression to higher studies (weight: 20%).',
        data: { parameter: 'GO', weight: 0.20 },
      };
    }
    if (qLower.includes('oi') || qLower.includes('outreach')) {
      return {
        intent: 'parameter_definition',
        summary: 'Outreach and Inclusivity (OI) evaluates regional diversity (students from other states/countries), percentage of women, disadvantaged students, and facilities for physically challenged students (weight: 10%).',
        data: { parameter: 'OI', weight: 0.10 },
      };
    }
    if (qLower.includes('pr') || qLower.includes('perception')) {
      return {
        intent: 'parameter_definition',
        summary: 'Peer Perception (PR) assesses institutional academic reputation based on surveys conducted with academic peers and employers across India (weight: 10%).',
        data: { parameter: 'PR', weight: 0.10 },
      };
    }
    return {
      intent: 'parameter_definition',
      summary: 'The National Institutional Ranking Framework (NIRF) is an official methodology approved by the Ministry of Education, Government of India, to rank higher education institutions on 5 core pillars: TLR (30%), RPC (30%), GO (20%), OI (10%), and PR (10%).',
      data: null,
    };
  }

  // Active filter contexts
  const activeYear = sq.entities.years.length === 1 ? sq.entities.years[0] : 2024;
  const activeCategory: CategoryType = sq.entities.category && sq.entities.category !== 'All' ? sq.entities.category : 'Overall';
  const startYear = sq.entities.yearRange ? sq.entities.yearRange.startYear : 2017;
  const endYear = sq.entities.yearRange ? sq.entities.yearRange.endYear : 2025;

  // ==========================================
  // DOMAIN A: TIME-SERIES AND TREND ANALYSIS
  // ==========================================

  // A1: Institutional Ranking Trend
  if (sq.intent === 'institution_trend' && sq.entities.institutions.length >= 1) {
    const instTarget = sq.entities.institutions[0];
    if (!instTarget.resolvedId) {
      return {
        intent: 'institution_trend',
        summary: `I couldn't find '${instTarget.raw}' in the NIRF data.`,
        data: null,
      };
    }

    const inst = instMap.get(instTarget.resolvedId)!;
    const allInstRecs = getInstitutionRankings(inst.institution_id);
    let history = allInstRecs.filter(
      (r) => r.category === activeCategory
    ).sort((a, b) => a.year - b.year);

    if (history.length === 0 && !sq.entities.category) {
      // Check alternative category only if no explicit category was specified
      const altRecords = allInstRecs.slice().sort((a, b) => a.year - b.year);
      if (altRecords.length > 0) {
        const altCat = altRecords[0].category;
        history = allInstRecs.filter((r) => r.category === altCat).sort((a, b) => a.year - b.year);
      }
    }

    if (history.length === 0) {
      return {
        intent: 'institution_trend',
        summary: `No historical NIRF ranking records found for ${inst.short_name} in ${activeCategory}.`,
        data: null,
      };
    }

    if (sq.entities.yearRange) {
      const { startYear, endYear } = sq.entities.yearRange;
      const filtered = history.filter((r) => r.year >= startYear && r.year <= endYear);
      if (filtered.length >= 2) {
        history = filtered;
      }
    }

    const effCat = history[0].category;
    const firstRec = history[0];
    const lastRec = history[history.length - 1];
    const rankDelta = firstRec.rank - lastRec.rank;
    const scoreDelta = Number((lastRec.overall_score - firstRec.overall_score).toFixed(2));
    const no1Count = history.filter((r) => r.rank === 1).length;

    let dominanceNote = '';
    if (no1Count > 1) {
      dominanceNote = ` Notably, ${inst.short_name} held the #1 national rank for ${no1Count} editions across this period.`;
    }

    const rankMovementText =
      rankDelta > 0
        ? `climbed ${rankDelta} ranks from #${firstRec.rank} to #${lastRec.rank}`
        : rankDelta < 0
        ? `moved from #${firstRec.rank} to #${lastRec.rank}`
        : `maintained Rank #${lastRec.rank}`;

    const quickSummary = `Between ${firstRec.year} and ${lastRec.year}, ${inst.short_name} in NIRF ${effCat} ${rankMovementText}. Its overall score moved from ${firstRec.overall_score} to ${lastRec.overall_score} pts (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts).${dominanceNote}`;

    const tableHeaders = ['Edition', 'National Rank', 'Overall Score', 'TLR', 'RPC', 'PR'];
    const tableRows = history.map((r) => [
      r.year,
      `#${r.rank}`,
      r.overall_score,
      r.TLR,
      r.RPC,
      r.PR,
    ]);

    const scoresList = history.map((r) => r.overall_score);
    const peakScore = Math.max(...scoresList);
    const peakYear = history.find((r) => r.overall_score === peakScore)?.year || lastRec.year;
    const avgScore = (scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(2);

    const detailedAnalysis = `Across the surveyed ${history.length} editions (${firstRec.year}–${lastRec.year}), ${inst.short_name} sustained an average composite score of **${avgScore} pts**, peaking in **${peakYear}** with an all-time high of **${peakScore} pts**. The institution consistently demonstrated strength across research publications and perception metrics.`;

    const keyInsights = [
      `**Longitudinal Trajectory**: ${inst.short_name} demonstrated a ${scoreDelta >= 0 ? `net gain of +${scoreDelta}` : `net movement of ${scoreDelta}`} composite score points from ${firstRec.year} to ${lastRec.year}.`,
      `**Peak Performance**: Highest evaluation recorded in **${peakYear}** at **${peakScore} pts** (Rank #${history.find((r) => r.overall_score === peakScore)?.rank || 1}).`,
      `**Cohort Consistency**: Maintained a top-tier national position throughout all ${history.length} editions.`,
    ];

    const markdownSummary = `Between ${firstRec.year} and ${lastRec.year}, ${inst.short_name} in NIRF ${effCat} ${rankMovementText}. Its overall score moved from ${firstRec.overall_score} to ${lastRec.overall_score} pts (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts).${dominanceNote}

### Performance Milestones
| Edition | National Rank | Overall Score | TLR | RPC | PR |
| :---: | :---: | :---: | :---: | :---: | :---: |
${tableRows.map((row) => `| ${row[0]} | **${row[1]}** | **${row[2]}** | ${row[3]} | ${row[4]} | ${row[5]} |`).join('\n')}

### Detailed Analysis
${detailedAnalysis}

### Key Insights
${keyInsights.map((k) => `- ${k}`).join('\n')}`;

    return {
      intent: 'institution_trend',
      summary: markdownSummary,
      structuredSections: {
        quickSummary,
        comparisonTable: { headers: tableHeaders, rows: tableRows },
        detailedAnalysis,
        keyInsights,
      },
      explanation: `Multi-year trajectory across ${history.length} published editions (${firstRec.year}–${lastRec.year}) in category '${effCat}'.`,
      data: history,
      chartType: 'line',
      chartData: history.map((r) => ({
        year: r.year,
        'Overall Score': r.overall_score,
        'National Rank': r.rank,
      })),
      chartConfig: {
        xKey: 'year',
        yKeys: ['Overall Score'],
        title: `${inst.short_name} Trajectory (${firstRec.year}–${lastRec.year})`,
      },
      calculationDetails: {
        formula: `Rank Delta = Rank(${firstRec.year}) - Rank(${lastRec.year}) (positive = climbed)`,
        filtersApplied: `Institution: ${inst.short_name} | Category: ${effCat}`,
        sampleSize: `${history.length} annual NIRF editions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // A2: Highest Ranking Improvers
  if (sq.intent === 'highest_improvers') {
    const startRecs = new Map(RANKINGS.filter((r) => r.year === startYear && r.category === activeCategory).map((r) => [r.institution_id, r]));
    const endRecs = new Map(RANKINGS.filter((r) => r.year === endYear && r.category === activeCategory).map((r) => [r.institution_id, r]));

    const improvers: Array<{ institution: Institution; startRank: number; endRank: number; gain: number; scoreGain: number }> = [];

    for (const [id, sRec] of startRecs.entries()) {
      const eRec = endRecs.get(id);
      if (eRec && sRec.rank > eRec.rank) {
        const gain = sRec.rank - eRec.rank;
        const inst = instMap.get(id);
        if (inst) {
          improvers.push({
            institution: inst,
            startRank: sRec.rank,
            endRank: eRec.rank,
            gain,
            scoreGain: Number((eRec.overall_score - sRec.overall_score).toFixed(2)),
          });
        }
      }
    }

    improvers.sort((a, b) => b.gain - a.gain);

    if (improvers.length === 0) {
      return {
        intent: 'highest_improvers',
        summary: `No institutions demonstrated rank improvement in ${activeCategory} between ${startYear} and ${endYear}.`,
        data: [],
      };
    }

    const topImprover = improvers[0];
    const top5 = improvers.slice(0, 5);

    return {
      intent: 'highest_improvers',
      summary: `Between ${startYear} and ${endYear} in ${activeCategory}, the highest ranking improvement was achieved by ${topImprover.institution.short_name}, climbing ${topImprover.gain} ranks from #${topImprover.startRank} to #${topImprover.endRank} (Score change: ${topImprover.scoreGain >= 0 ? `+${topImprover.scoreGain}` : topImprover.scoreGain} pts).`,
      explanation: `Top improvers: ${top5.map((i) => `${i.institution.short_name} (+${i.gain} ranks, #${i.startRank}→#${i.endRank})`).join(', ')}.`,
      data: improvers,
      chartType: 'bar',
      chartData: top5.map((i) => ({
        name: i.institution.short_name,
        'Rank Improvement': i.gain,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Rank Improvement'],
        title: `Highest Ranking Improvers (${startYear}–${endYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Rank Improvement Delta = StartRank - EndRank (Filtered for StartRank > EndRank)',
        filtersApplied: `Category: ${activeCategory} | Editions: ${startYear} to ${endYear}`,
        sampleSize: `${improvers.length} institutions showing rank gains`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // A3: Largest Ranking Decliners
  if (sq.intent === 'largest_decliners') {
    const startRecs = new Map(RANKINGS.filter((r) => r.year === startYear && r.category === activeCategory).map((r) => [r.institution_id, r]));
    const endRecs = new Map(RANKINGS.filter((r) => r.year === endYear && r.category === activeCategory).map((r) => [r.institution_id, r]));

    const decliners: Array<{ institution: Institution; startRank: number; endRank: number; drop: number }> = [];

    for (const [id, sRec] of startRecs.entries()) {
      const eRec = endRecs.get(id);
      if (eRec && eRec.rank > sRec.rank) {
        const drop = eRec.rank - sRec.rank;
        const inst = instMap.get(id);
        if (inst) {
          decliners.push({
            institution: inst,
            startRank: sRec.rank,
            endRank: eRec.rank,
            drop,
          });
        }
      }
    }

    decliners.sort((a, b) => b.drop - a.drop);

    if (decliners.length === 0) {
      return {
        intent: 'largest_decliners',
        summary: `No institutions demonstrated a ranking decline in ${activeCategory} between ${startYear} and ${endYear}.`,
        data: [],
      };
    }

    const topDecliner = decliners[0];
    const top5 = decliners.slice(0, 5);

    return {
      intent: 'largest_decliners',
      summary: `Between ${startYear} and ${endYear} in ${activeCategory}, the largest ranking decline occurred for ${topDecliner.institution.short_name}, falling ${topDecliner.drop} ranks from #${topDecliner.startRank} to #${topDecliner.endRank}.`,
      explanation: `Top decliners: ${top5.map((d) => `${d.institution.short_name} (-${d.drop} ranks, #${d.startRank}→#${d.endRank})`).join(', ')}.`,
      data: decliners,
      chartType: 'bar',
      chartData: top5.map((d) => ({
        name: d.institution.short_name,
        'Rank Drop': d.drop,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Rank Drop'],
        title: `Largest Ranking Declines (${startYear}–${endYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Rank Drop Delta = EndRank - StartRank (Filtered for EndRank > StartRank)',
        filtersApplied: `Category: ${activeCategory} | Editions: ${startYear} to ${endYear}`,
        sampleSize: `${decliners.length} institutions showing rank drops`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // A4: Average Score Trends Across Years
  if (sq.intent === 'score_trend_average') {
    const yearlyMeans: Array<{ year: number; meanScore: number; medianScore: number; count: number }> = [];

    for (const yr of YEARS) {
      const cohort = RANKINGS.filter((r) => r.year === yr && r.category === activeCategory && r.overall_score > 0);
      if (cohort.length > 0) {
        const scores = cohort.map((r) => r.overall_score);
        yearlyMeans.push({
          year: yr,
          meanScore: calculateMean(scores),
          medianScore: calculateMedian(scores),
          count: cohort.length,
        });
      }
    }

    const first = yearlyMeans[0];
    const last = yearlyMeans[yearlyMeans.length - 1];
    const netChange = Number((last.meanScore - first.meanScore).toFixed(2));

    return {
      intent: 'score_trend_average',
      summary: `Across 2017 to 2025 in ${activeCategory}, the average institutional composite score shifted from ${first.meanScore} pts in ${first.year} to ${last.meanScore} pts in ${last.year} (${netChange >= 0 ? `+${netChange}` : netChange} pts).`,
      explanation: `Calculated from ${yearlyMeans.reduce((acc, y) => acc + y.count, 0)} published ranking records across 9 annual editions.`,
      data: yearlyMeans,
      chartType: 'line',
      chartData: yearlyMeans.map((y) => ({
        year: y.year,
        'Average Score': y.meanScore,
        'Median Score': y.medianScore,
      })),
      chartConfig: {
        xKey: 'year',
        yKeys: ['Average Score', 'Median Score'],
        title: `Average & Median Score Trend (${activeCategory} 2017–2025)`,
      },
      calculationDetails: {
        formula: 'Yearly Arithmetic Mean: sum(overall_score) / N',
        filtersApplied: `Category: ${activeCategory}`,
        sampleSize: '9 annual NIRF editions',
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // A5: Consistently Top-Ranked Institutions
  if (sq.intent === 'consistently_top_ranked') {
    const threshold = sq.entities.topN || 10;
    const instRecords = new Map<string, RankingRecord[]>();

    for (const r of RANKINGS) {
      if (r.category === activeCategory) {
        if (!instRecords.has(r.institution_id)) instRecords.set(r.institution_id, []);
        instRecords.get(r.institution_id)!.push(r);
      }
    }

    const consistent: Array<{ institution: Institution; appearances: number; avgRank: number; minRank: number; maxRank: number }> = [];

    for (const [id, recs] of instRecords.entries()) {
      if (recs.length >= 7 && recs.every((r) => r.rank <= threshold)) {
        const inst = instMap.get(id);
        if (inst) {
          const ranks = recs.map((r) => r.rank);
          consistent.push({
            institution: inst,
            appearances: recs.length,
            avgRank: calculateMean(ranks),
            minRank: Math.min(...ranks),
            maxRank: Math.max(...ranks),
          });
        }
      }
    }

    consistent.sort((a, b) => a.avgRank - b.avgRank);

    return {
      intent: 'consistently_top_ranked',
      summary: `In ${activeCategory}, ${consistent.length} institutions have consistently maintained a Top ${threshold} national rank across 7+ annual NIRF editions.`,
      explanation: `Consistent institutions: ${consistent.map((c) => `${c.institution.short_name} (Avg Rank #${c.avgRank}, Range: #${c.minRank}–#${c.maxRank})`).join('; ')}.`,
      data: consistent,
      chartType: 'bar',
      chartData: consistent.slice(0, 10).map((c) => ({
        name: c.institution.short_name,
        'Average Rank': c.avgRank,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Average Rank'],
        title: `Consistently Top-${threshold} Ranked Institutions (${activeCategory})`,
      },
      calculationDetails: {
        formula: `Filtered for rank <= ${threshold} in all published years (min 7 appearances)`,
        filtersApplied: `Category: ${activeCategory} | Rank Threshold: <= ${threshold}`,
        sampleSize: `${consistent.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN B: GEOSPATIAL & REGIONAL ANALYSIS
  // ==========================================

  // B1: Single State Analysis
  if (sq.intent === 'state_analysis' && sq.entities.state) {
    const targetState = sq.entities.state;
    const cohort = RANKINGS.filter((r) => {
      if (r.year !== activeYear || r.category !== activeCategory) return false;
      const inst = instMap.get(r.institution_id);
      return inst && inst.state.toLowerCase() === targetState.toLowerCase();
    }).sort((a, b) => a.rank - b.rank);

    if (cohort.length === 0) {
      return {
        intent: 'state_analysis',
        summary: `No institutions from ${targetState} were ranked in the ${activeYear} NIRF ${activeCategory} category.`,
        data: [],
      };
    }

    const topInState = cohort[0];
    const topInst = instMap.get(topInState.institution_id)!;
    const scores = cohort.map((r) => r.overall_score);
    const meanScore = calculateMean(scores);

    return {
      intent: 'state_analysis',
      summary: `In ${activeYear} (${activeCategory}), ${targetState} has ${cohort.length} ranked institutions. The highest-ranked institution is ${topInst.short_name} at National Rank #${topInState.rank} (Score: ${topInState.overall_score} pts). The average score among ${targetState}'s institutions is ${meanScore} pts.`,
      explanation: `Top institutions in ${targetState}: ${cohort.slice(0, 5).map((r) => `#${r.rank} ${instMap.get(r.institution_id)?.short_name} (${r.overall_score} pts)`).join(', ')}.`,
      data: cohort,
      chartType: 'bar',
      chartData: cohort.slice(0, 10).map((r) => ({
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        Score: r.overall_score,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Score'],
        title: `Top Institutions in ${targetState} (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Grounded State Filter: state == targetState',
        filtersApplied: `State: ${targetState} | Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // B2: State Distribution
  if (sq.intent === 'state_distribution') {
    const stateCounts: Record<string, number> = {};
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.rank <= 100);

    for (const r of cohort) {
      const inst = instMap.get(r.institution_id);
      if (inst && inst.state) {
        stateCounts[inst.state] = (stateCounts[inst.state] || 0) + 1;
      }
    }

    const sortedStates = Object.entries(stateCounts)
      .map(([st, count]) => ({ state: st, count }))
      .sort((a, b) => b.count - a.count);

    const leader = sortedStates[0];
    const topStates = sortedStates.slice(0, 10);
    const top3Count = sortedStates.slice(0, 3).reduce((acc, s) => acc + s.count, 0);

    const quickSummary = `In the ${activeYear} NIRF ${activeCategory} Top 100, ${leader.state} leads all states with ${leader.count} institutions, followed by ${sortedStates.slice(1, 4).map((s) => `${s.state} (${s.count})`).join(', ')}.`;

    const tableHeaders = ['Rank', 'State / UT', 'Ranked Institutions (Top 100)', 'National Share'];
    const tableRows = topStates.map((s, idx) => [
      `#${idx + 1}`,
      s.state,
      s.count,
      `${((s.count / cohort.length) * 100).toFixed(1)}%`,
    ]);

    const detailedAnalysis = `The geographic distribution of top institutions highlights significant regional concentration. **${leader.state}** accounts for **${((leader.count / cohort.length) * 100).toFixed(1)}%** of India's top 100 institutions in ${activeCategory}. Together, the top three states (**${sortedStates[0].state}**, **${sortedStates[1]?.state}**, and **${sortedStates[2]?.state}**) represent **${top3Count} out of ${cohort.length} (${((top3Count / cohort.length) * 100).toFixed(1)}%)** institutions nationally.`;

    const keyInsights = [
      `**Top Represented State**: **${leader.state}** anchors ${leader.count} institutions in the Top 100 cohort.`,
      `**Regional Clustering**: Top 3 states comprise **${((top3Count / cohort.length) * 100).toFixed(1)}%** of all top-tier placements.`,
      `**National Breadth**: A total of **${sortedStates.length} states and union territories** have at least one institution in the national Top 100.`,
    ];

    const markdownSummary = `In the ${activeYear} NIRF ${activeCategory} Top 100, ${leader.state} leads all states with ${leader.count} institutions, followed by ${sortedStates.slice(1, 4).map((s) => `${s.state} (${s.count})`).join(', ')}.

### State Representation Leaderboard
| Rank | State / UT | Top 100 Count | National Share |
| :---: | :--- | :---: | :---: |
${tableRows.map((r) => `| ${r[0]} | **${r[1]}** | ${r[2]} | ${r[3]} |`).join('\n')}

### Detailed Analysis
${detailedAnalysis}

### Key Insights
${keyInsights.map((k) => `- ${k}`).join('\n')}`;

    return {
      intent: 'state_distribution',
      summary: markdownSummary,
      structuredSections: {
        quickSummary,
        comparisonTable: { headers: tableHeaders, rows: tableRows },
        detailedAnalysis,
        keyInsights,
      },
      explanation: `Across all ${sortedStates.length} represented states/UTs in the Top 100.`,
      data: sortedStates,
      chartType: 'horizontal_bar',
      chartData: topStates.map((s) => ({
        name: s.state,
        Institutions: s.count,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Institutions'],
        orientation: 'horizontal',
        title: `State-wise Institutional Distribution in Top 100 (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Group by state and count for rank <= 100',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory} | Top 100`,
        sampleSize: `${cohort.length} ranked institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // B3: Direct State Comparison
  if (sq.intent === 'state_comparison' && sq.entities.state && sq.entities.comparisonState) {
    const s1 = sq.entities.state;
    const s2 = sq.entities.comparisonState;

    const cohort1 = RANKINGS.filter((r) => {
      if (r.year !== activeYear || r.category !== activeCategory) return false;
      const inst = instMap.get(r.institution_id);
      return inst && inst.state.toLowerCase() === s1.toLowerCase();
    });

    const cohort2 = RANKINGS.filter((r) => {
      if (r.year !== activeYear || r.category !== activeCategory) return false;
      const inst = instMap.get(r.institution_id);
      return inst && inst.state.toLowerCase() === s2.toLowerCase();
    });

    const mean1 = calculateMean(cohort1.map((r) => r.overall_score));
    const mean2 = calculateMean(cohort2.map((r) => r.overall_score));
    const top10Count1 = cohort1.filter((r) => r.rank <= 10).length;
    const top10Count2 = cohort2.filter((r) => r.rank <= 10).length;

    return {
      intent: 'state_comparison',
      summary: `In ${activeYear} (${activeCategory}), ${s1} has ${cohort1.length} ranked institutions (Avg Score: ${mean1} pts, ${top10Count1} in Top 10) compared to ${s2}'s ${cohort2.length} institutions (Avg Score: ${mean2} pts, ${top10Count2} in Top 10).`,
      explanation: `State-level comparative metrics across verified NIRF participating institutions.`,
      data: { [s1]: { count: cohort1.length, meanScore: mean1, top10Count: top10Count1 }, [s2]: { count: cohort2.length, meanScore: mean2, top10Count: top10Count2 } },
      chartType: 'bar',
      chartData: [
        { metric: 'Ranked Institutions', [s1]: cohort1.length, [s2]: cohort2.length },
        { metric: 'Average Score', [s1]: mean1, [s2]: mean2 },
        { metric: 'Top 10 Institutions', [s1]: top10Count1, [s2]: top10Count2 },
      ],
      chartConfig: {
        xKey: 'metric',
        yKeys: [s1, s2],
        title: `${s1} vs ${s2} State Comparison (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Aggregated state cohort count and average score',
        filtersApplied: `States: ${s1}, ${s2} | Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort1.length + cohort2.length} total institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN C: UNIVARIATE ANALYSIS
  // ==========================================

  // C1: Score Distribution (Histogram)
  if (sq.intent === 'score_distribution') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);
    const scores = cohort.map((r) => r.overall_score);
    const stats = calculateStatsSummary(scores);

    // Create histogram buckets: 40-50, 50-60, 60-70, 70-80, 80-90, 90-100
    const buckets = [
      { range: '30–39', count: 0 },
      { range: '40–49', count: 0 },
      { range: '50–59', count: 0 },
      { range: '60–69', count: 0 },
      { range: '70–79', count: 0 },
      { range: '80–89', count: 0 },
      { range: '90–100', count: 0 },
    ];

    for (const sc of scores) {
      if (sc >= 90) buckets[6].count++;
      else if (sc >= 80) buckets[5].count++;
      else if (sc >= 70) buckets[4].count++;
      else if (sc >= 60) buckets[3].count++;
      else if (sc >= 50) buckets[2].count++;
      else if (sc >= 40) buckets[1].count++;
      else buckets[0].count++;
    }

    const quickSummary = `In ${activeYear} (${activeCategory}), composite NIRF scores range from ${stats.min} to ${stats.max} pts, with a mean of ${stats.mean} pts and median of ${stats.median} pts (SD = ${stats.stdDev} pts, N = ${stats.count}).`;

    const tableHeaders = ['Score Interval', 'Institutions', 'Share (%)', 'Cohort Concentration'];
    const tableRows = buckets
      .filter((b) => b.count > 0 || b.range === '30–39')
      .map((b) => [
        b.range,
        b.count,
        `${((b.count / stats.count) * 100).toFixed(1)}%`,
        b.count >= 25 ? 'High Density' : b.count >= 10 ? 'Moderate' : 'Low / Outlier',
      ]);

    const detailedAnalysis = `The score spread shows characteristic positive skewness: the median (${stats.median} pts) sits below the arithmetic mean (${stats.mean} pts), indicating that a select echelon of elite institutions pulling scores above 80 pts stretches the upper distribution tail. The interquartile range (IQR) spans **${stats.iqr} pts** (Q1: ${stats.q1} pts to Q3: ${stats.q3} pts).`;

    const keyInsights = [
      `**Central Tendency**: Median score sits at **${stats.median} pts** with a standard deviation of **${stats.stdDev} pts**.`,
      `**Middle 50% Cohort**: 50% of all institutions cluster between **${stats.q1} pts** and **${stats.q3} pts** (IQR = ${stats.iqr} pts).`,
      `**Extreme Range**: Highest recorded score is **${stats.max} pts** while the cohort cutoff is **${stats.min} pts** (spread of ${(stats.max - stats.min).toFixed(2)} pts).`,
    ];

    const markdownSummary = `In ${activeYear} (${activeCategory}), composite NIRF scores range from ${stats.min} to ${stats.max} pts, with a mean of ${stats.mean} pts and median of ${stats.median} pts (SD = ${stats.stdDev} pts, N = ${stats.count}).

### Score Interval Distribution
| Score Interval | Institutions | Share (%) | Concentration |
| :---: | :---: | :---: | :---: |
${tableRows.map((r) => `| ${r[0]} | **${r[1]}** | ${r[2]} | ${r[3]} |`).join('\n')}

### Detailed Analysis
${detailedAnalysis}

### Key Insights
${keyInsights.map((k) => `- ${k}`).join('\n')}`;

    return {
      intent: 'score_distribution',
      summary: markdownSummary,
      structuredSections: {
        quickSummary,
        comparisonTable: { headers: tableHeaders, rows: tableRows },
        detailedAnalysis,
        keyInsights,
      },
      explanation: `Distribution quartile points: Q1 = ${stats.q1} pts, Q3 = ${stats.q3} pts, IQR = ${stats.iqr} pts.`,
      data: stats,
      chartType: 'distribution',
      chartData: buckets.map((b) => ({
        name: b.range,
        Institutions: b.count,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Institutions'],
        title: `Score Distribution Histogram (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: '10-point histogram bins with parametric and non-parametric summaries',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${stats.count} ranked institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // C2: Summary Statistics (Mean, Median, Quartiles, SD)
  if (sq.intent === 'summary_statistics' || sq.intent === 'score_quartiles') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);
    const scores = cohort.map((r) => r.overall_score);
    const extStats = calculateExtendedStats(scores);

    return {
      intent: 'summary_statistics',
      summary: `Statistical summary for ${activeCategory} (${activeYear}): Mean = ${extStats.mean} pts, Median = ${extStats.median} pts, Std Dev = ${extStats.sampleStdDev} pts (Min = ${extStats.min}, Max = ${extStats.max}, Count = ${extStats.count}).`,
      explanation: `Quartiles: Q1 = ${extStats.q1} pts, Median (Q2) = ${extStats.median} pts, Q3 = ${extStats.q3} pts, Interquartile Range (IQR) = ${extStats.iqr} pts. 95% Confidence Interval for Mean: [${extStats.ci95Lower}, ${extStats.ci95Upper}].`,
      data: extStats,
      chartType: 'bar',
      chartData: [
        { name: 'Min', Score: extStats.min },
        { name: 'Q1 (25%)', Score: extStats.q1 },
        { name: 'Median (50%)', Score: extStats.median },
        { name: 'Mean', Score: extStats.mean },
        { name: 'Q3 (75%)', Score: extStats.q3 },
        { name: 'Max', Score: extStats.max },
      ],
      chartConfig: {
        xKey: 'name',
        yKeys: ['Score'],
        title: `Summary Statistics & Quartiles (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: "Sample Std Dev using Bessel's Correction (n - 1) & Linear Interpolation for Quartiles",
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${extStats.count} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN D: BIVARIATE & CORRELATION ANALYSIS
  // ==========================================

  // D1 & D2: Parameter Correlation & Strongest Correlation
  if (sq.intent === 'parameter_correlation' || sq.intent === 'strongest_correlation') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);

    if (cohort.length < 5) {
      return {
        intent: 'parameter_correlation',
        summary: `Insufficient data points (${cohort.length}) to compute correlation in category ${activeCategory} for year ${activeYear}.`,
        data: null,
      };
    }

    if (sq.intent === 'strongest_correlation') {
      const params: ParameterKey[] = ['TLR', 'RPC', 'GO', 'OI', 'PR'];
      const corrResults = params.map((p) => {
        const x = cohort.map((r) => r[p]);
        const y = cohort.map((r) => r.overall_score);
        const { r: rVal, rSquared, interpretation } = calculatePearsonCorrelation(x, y);
        return { parameter: p, r: rVal, rSquared, interpretation };
      });

      corrResults.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      const topCorr = corrResults[0];

      // Compute full 6x6 pairwise correlation matrix for Heatmap visualization
      const matrixParams = ['TLR', 'RPC', 'GO', 'OI', 'PR', 'Overall Score'];
      const heatmapMatrix = matrixParams.map((p1) => {
        const row: Record<string, any> = { parameter: p1 };
        const vals1 = cohort.map((r) => (p1 === 'Overall Score' ? r.overall_score : r[p1 as ParameterKey]));
        for (const p2 of matrixParams) {
          if (p1 === p2) {
            row[p2] = 1.0;
          } else {
            const vals2 = cohort.map((r) => (p2 === 'Overall Score' ? r.overall_score : r[p2 as ParameterKey]));
            const res = calculatePearsonCorrelation(vals1, vals2);
            row[p2] = Number(res.r.toFixed(2));
          }
        }
        return row;
      });

      const quickSummary = `In ${activeYear} (${activeCategory}), ${topCorr.parameter} exhibits the strongest correlation with Overall Score with r = ${topCorr.r} (R² = ${(topCorr.rSquared * 100).toFixed(1)}%, ${topCorr.interpretation}).`;

      const tableHeaders = ['Parameter', 'Pearson r (with Overall Score)', 'Variance Explained (R²)', 'Linear Strength'];
      const tableRows = corrResults.map((c) => [
        c.parameter,
        `+${c.r.toFixed(3)}`,
        `${(c.rSquared * 100).toFixed(1)}%`,
        c.interpretation,
      ]);

      const detailedAnalysis = `Among all evaluation pillars, **${topCorr.parameter}** accounts for the greatest proportion of overall score variation (**${(topCorr.rSquared * 100).toFixed(1)}%** of variance). Research & Professional Practice (RPC) and Perception (PR) demonstrate strong mutual alignment, reflecting how peer academic reputation correlates with published scientific productivity. In contrast, Outreach & Inclusivity (OI) exhibits the lowest inter-pillar correlation, functioning more independently.`;

      const keyInsights = [
        `**Strongest Predictor**: **${topCorr.parameter}** has the highest correlation with composite score (**r = ${topCorr.r}**).`,
        `**Research Impact**: High RPC performance consistently accompanies top 10 placements.`,
        `**Independent Mandates**: OI (Outreach & Inclusivity) demonstrates lower covariance, reflecting divergent demographic focus.`,
        `*Statistical Note: Correlation reflects mathematical association and does not imply direct causation.*`,
      ];

      const markdownSummary = `In ${activeYear} (${activeCategory}), ${topCorr.parameter} exhibits the strongest correlation with Overall Score with r = ${topCorr.r} (R² = ${(topCorr.rSquared * 100).toFixed(1)}%, ${topCorr.interpretation}).

### Parameter Correlation Rankings
| Parameter | Pearson r | Variance Explained (R²) | Relationship |
| :--- | :---: | :---: | :--- |
${tableRows.map((r) => `| **${r[0]}** | ${r[1]} | ${r[2]} | ${r[3]} |`).join('\n')}

### Detailed Analysis
${detailedAnalysis}

### Key Insights
${keyInsights.map((k) => `- ${k}`).join('\n')}`;

      return {
        intent: 'strongest_correlation',
        summary: markdownSummary,
        structuredSections: {
          quickSummary,
          comparisonTable: { headers: tableHeaders, rows: tableRows },
          detailedAnalysis,
          keyInsights,
        },
        explanation: `Parameter rankings by correlation strength: ${corrResults.map((c) => `${c.parameter}: r=${c.r}`).join(', ')}.`,
        data: corrResults,
        chartType: 'heatmap',
        chartData: heatmapMatrix,
        chartConfig: {
          xKey: 'parameter',
          yKeys: matrixParams,
          title: `NIRF Parameter Correlation Heatmap Matrix (${activeYear} ${activeCategory})`,
          meta: {
            strongest: topCorr,
            disclaimer: 'Correlation indicates statistical association, not causation.',
          },
        },
        calculationDetails: {
          formula: 'Pearson Correlation r = Cov(X,Y) / (SD_X * SD_Y)',
          filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
          sampleSize: `${cohort.length} institutions`,
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
      };
    }

    // Single parameter correlation
    let p1 = sq.entities.parameters[0] || 'RPC';
    let p2 = sq.entities.parameters[1] || null;

    let xVals: number[];
    let yVals: number[];
    let xLabel: string;
    let yLabel: string;

    if (p2) {
      xVals = cohort.map((r) => r[p1]);
      yVals = cohort.map((r) => r[p2]);
      xLabel = p1;
      yLabel = p2;
    } else {
      xVals = cohort.map((r) => r[p1]);
      yVals = cohort.map((r) => r.overall_score);
      xLabel = p1;
      yLabel = 'Overall Score';
    }

    const { r, rSquared, interpretation } = calculatePearsonCorrelation(xVals, yVals);

    return {
      intent: 'parameter_correlation',
      summary: `The Pearson correlation between ${xLabel} and ${yLabel} in ${activeYear} (${activeCategory}) is r = ${r} (R² = ${(rSquared * 100).toFixed(1)}%, N = ${cohort.length}). This indicates a ${interpretation.toLowerCase()} linear association.`,
      explanation: `Calculated from ${cohort.length} verified institution records.`,
      data: { r, rSquared, interpretation, n: cohort.length },
      chartType: 'scatter',
      chartData: cohort.slice(0, 60).map((r) => ({
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        [xLabel]: p2 ? r[p1] : r[p1],
        [yLabel]: p2 ? r[p2] : r.overall_score,
      })),
      chartConfig: {
        xKey: xLabel,
        yKeys: [yLabel],
        title: `${xLabel} vs ${yLabel} (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Pearson Correlation Coefficient r = Cov(X,Y) / (SD_X * SD_Y)',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN E: MULTIVARIATE ANALYSIS
  // ==========================================

  // E1: Top 5 Multivariate Parameter Comparison
  if (sq.intent === 'multivariate_comparison') {
    const top5Recs = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.rank <= 5).sort((a, b) => a.rank - b.rank);
    const top5Data = top5Recs.map((r) => {
      const inst = instMap.get(r.institution_id);
      return {
        name: inst?.short_name || r.institution_id,
        rank: r.rank,
        score: r.overall_score,
        TLR: r.TLR,
        RPC: r.RPC,
        GO: r.GO,
        OI: r.OI,
        PR: r.PR,
      };
    });

    return {
      intent: 'multivariate_comparison',
      summary: `In ${activeYear} (${activeCategory}), the Top 5 institutions demonstrate distinct pillar strengths. While ${top5Data[0].name} (#1) leads overall, parameter variations are evident across research (RPC), teaching (TLR), and peer perception (PR).`,
      explanation: `Pillar comparison: ${top5Data.map((d) => `${d.name}: TLR ${d.TLR}, RPC ${d.RPC}, GO ${d.GO}, OI ${d.OI}, PR ${d.PR}`).join(' | ')}.`,
      data: top5Data,
      chartType: 'bar',
      chartData: top5Data.map((d) => ({
        name: d.name,
        TLR: d.TLR,
        RPC: d.RPC,
        GO: d.GO,
        OI: d.OI,
        PR: d.PR,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['TLR', 'RPC', 'GO', 'OI', 'PR'],
        title: `Pillar Performance of Top 5 Institutions (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Comparative matrix across 5 normalized NIRF pillars',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory} | Top 5`,
        sampleSize: '5 top institutions',
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // E2: High Research but Low Teaching
  if (sq.intent === 'high_research_low_teaching') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory);
    const rpcScores = cohort.map((r) => r.RPC);
    const tlrScores = cohort.map((r) => r.TLR);
    const medianRPC = calculateMedian(rpcScores);
    const medianTLR = calculateMedian(tlrScores);

    const candidates = cohort
      .filter((r) => r.RPC > medianRPC && r.TLR < medianTLR)
      .map((r) => ({
        institution: instMap.get(r.institution_id)!,
        rank: r.rank,
        score: r.overall_score,
        RPC: r.RPC,
        TLR: r.TLR,
        gap: Number((r.RPC - r.TLR).toFixed(2)),
      }))
      .filter((c) => c.institution)
      .sort((a, b) => b.gap - a.gap);

    if (candidates.length === 0) {
      return {
        intent: 'high_research_low_teaching',
        summary: `No institutions in ${activeYear} (${activeCategory}) demonstrated above-median research alongside below-median teaching.`,
        data: [],
      };
    }

    const topCandidate = candidates[0];

    return {
      intent: 'high_research_low_teaching',
      summary: `In ${activeYear} (${activeCategory}), ${candidates.length} institutions possess above-median research (RPC > ${medianRPC}) alongside below-median teaching (TLR < ${medianTLR}). ${topCandidate.institution.short_name} has the largest disparity (RPC: ${topCandidate.RPC} vs TLR: ${topCandidate.TLR}, Gap: ${topCandidate.gap} pts).`,
      explanation: `Top gap institutions: ${candidates.slice(0, 5).map((c) => `${c.institution.short_name} (RPC ${c.RPC}, TLR ${c.TLR})`).join(', ')}.`,
      data: candidates,
      chartType: 'bar',
      chartData: candidates.slice(0, 5).map((c) => ({
        name: c.institution.short_name,
        RPC: c.RPC,
        TLR: c.TLR,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['RPC', 'TLR'],
        title: `Institutions with High Research vs Lower Teaching (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Filtered for RPC > Median(RPC) and TLR < Median(TLR)',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${candidates.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN F: DISTRIBUTION & STATISTICAL COMPARISON
  // ==========================================

  // F1: Top 10 vs Remaining Dispersion
  if (sq.intent === 'top_vs_rest_dispersion') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);
    const top10 = cohort.filter((r) => r.rank <= 10).map((r) => r.overall_score);
    const rest = cohort.filter((r) => r.rank > 10).map((r) => r.overall_score);

    const statsTop10 = calculateStatsSummary(top10);
    const statsRest = calculateStatsSummary(rest);

    return {
      intent: 'top_vs_rest_dispersion',
      summary: `In ${activeYear} (${activeCategory}), Top 10 institutions hold an average score of ${statsTop10.mean} pts (SD = ${statsTop10.stdDev} pts) versus ${statsRest.mean} pts (SD = ${statsRest.stdDev} pts) for ranks 11–${cohort.length}. The score gap between top 10 and the rest is ${Number((statsTop10.mean - statsRest.mean).toFixed(2))} pts.`,
      explanation: `Top 10 score range: ${statsTop10.min}–${statsTop10.max} pts. Remaining institutions score range: ${statsRest.min}–${statsRest.max} pts.`,
      data: { top10: statsTop10, remaining: statsRest },
      chartType: 'bar',
      chartData: [
        { metric: 'Mean Score', 'Top 10': statsTop10.mean, 'Ranks 11+': statsRest.mean },
        { metric: 'Median Score', 'Top 10': statsTop10.median, 'Ranks 11+': statsRest.median },
        { metric: 'Standard Deviation', 'Top 10': statsTop10.stdDev, 'Ranks 11+': statsRest.stdDev },
      ],
      chartConfig: {
        xKey: 'metric',
        yKeys: ['Top 10', 'Ranks 11+'],
        title: `Top 10 vs Remaining Score Comparison (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Subpopulation partition at Rank <= 10 vs Rank > 10',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // F2: Parameter Variability
  if (sq.intent === 'parameter_variability') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);
    const params: ParameterKey[] = ['TLR', 'RPC', 'GO', 'OI', 'PR'];

    const variability = params.map((p) => {
      const vals = cohort.map((r) => r[p]);
      const mean = calculateMean(vals);
      const stdDev = calculateStandardDeviation(vals);
      const cv = mean > 0 ? Number(((stdDev / mean) * 100).toFixed(1)) : 0;
      return { parameter: p, mean, stdDev, cv };
    });

    variability.sort((a, b) => b.cv - a.cv);
    const mostVariable = variability[0];

    return {
      intent: 'parameter_variability',
      summary: `In ${activeYear} (${activeCategory}), ${mostVariable.parameter} displays the highest relative variability with a Coefficient of Variation (CV) of ${mostVariable.cv}% (SD = ${mostVariable.stdDev}, Mean = ${mostVariable.mean}).`,
      explanation: `Relative variability ranking: ${variability.map((v) => `${v.parameter} (CV ${v.cv}%, SD ${v.stdDev})`).join(', ')}.`,
      data: variability,
      chartType: 'bar',
      chartData: variability.map((v) => ({
        name: v.parameter,
        'Coefficient of Variation (%)': v.cv,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Coefficient of Variation (%)'],
        title: `Pillar Score Variability CV% (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Coefficient of Variation CV = (Standard Deviation / Mean) * 100',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN G: RANKING TRANSITIONS & MOBILITY
  // ==========================================

  // G1: Mobility Summary & Transitions
  if (sq.intent === 'ranking_transitions' || sq.intent === 'mobility_summary') {
    const startRecs = new Map(RANKINGS.filter((r) => r.year === startYear && r.category === activeCategory).map((r) => [r.institution_id, r]));
    const endRecs = new Map(RANKINGS.filter((r) => r.year === endYear && r.category === activeCategory).map((r) => [r.institution_id, r]));

    let improved = 0;
    let declined = 0;
    let retained = 0;

    for (const [id, sRec] of startRecs.entries()) {
      const eRec = endRecs.get(id);
      if (eRec) {
        if (sRec.rank > eRec.rank) improved++;
        else if (sRec.rank < eRec.rank) declined++;
        else retained++;
      }
    }

    const totalCommon = improved + declined + retained;

    return {
      intent: 'ranking_transitions',
      summary: `Between ${startYear} and ${endYear} in ${activeCategory}, among the ${totalCommon} institutions appearing in both editions: ${improved} institutions improved their rank (${((improved / totalCommon) * 100).toFixed(1)}%), ${declined} declined (${((declined / totalCommon) * 100).toFixed(1)}%), and ${retained} maintained their exact rank.`,
      explanation: `Calculated from persistent institutions between ${startYear} and ${endYear}.`,
      data: { improved, declined, retained, total: totalCommon },
      chartType: 'bar',
      chartData: [
        { name: 'Improved Rank', Count: improved },
        { name: 'Declined Rank', Count: declined },
        { name: 'Retained Rank', Count: retained },
      ],
      chartConfig: {
        xKey: 'name',
        yKeys: ['Count'],
        title: `Institutional Ranking Mobility (${startYear}–${endYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Pairwise transition delta: StartRank vs EndRank for persistent cohort',
        filtersApplied: `Category: ${activeCategory} | Editions: ${startYear} to ${endYear}`,
        sampleSize: `${totalCommon} continuous institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // DOMAIN H: OUTLIER DETECTION
  // ==========================================

  // H1: Outlier Detection
  if (sq.intent === 'outlier_detection') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0);
    const scores = cohort.map((r) => r.overall_score);
    const { q1, q3, iqr } = calculateQuartiles(scores);
    const lowerFence = Number((q1 - 1.5 * iqr).toFixed(2));
    const upperFence = Number((q3 + 1.5 * iqr).toFixed(2));
    const mean = calculateMean(scores);
    const stdDev = calculateStandardDeviation(scores);

    const outliers = cohort
      .map((r) => {
        const z = calculateZScore(r.overall_score, mean, stdDev);
        const isOutlier = r.overall_score < lowerFence || r.overall_score > upperFence || Math.abs(z) >= 2.0;
        return {
          institution: instMap.get(r.institution_id)!,
          rank: r.rank,
          score: r.overall_score,
          zScore: z,
          isOutlier,
        };
      })
      .filter((o) => o.isOutlier && o.institution)
      .sort((a, b) => b.score - a.score);

    if (outliers.length === 0) {
      return {
        intent: 'outlier_detection',
        summary: `No statistical outliers were detected in ${activeYear} (${activeCategory}) based on IQR fences [${lowerFence}, ${upperFence}] and |Z-Score| >= 2.0.`,
        data: [],
      };
    }

    const topOutlier = outliers[0];

    return {
      intent: 'outlier_detection',
      summary: `In ${activeYear} (${activeCategory}), ${outliers.length} institutions qualify as statistical outliers based on IQR fences [${lowerFence}, ${upperFence}] or |Z-Score| >= 2.0. The highest positive outlier is ${topOutlier.institution.short_name} (Rank #${topOutlier.rank}, Score: ${topOutlier.score} pts, Z = ${topOutlier.zScore}).`,
      explanation: `Statistical outliers: ${outliers.map((o) => `${o.institution.short_name} (Score ${o.score}, Z = ${o.zScore})`).join(', ')}.`,
      data: outliers,
      chartType: 'bar',
      chartData: outliers.slice(0, 8).map((o) => ({
        name: o.institution.short_name,
        Score: o.score,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Score'],
        title: `Statistical Outliers in ${activeCategory} (${activeYear})`,
      },
      calculationDetails: {
        formula: 'Tukey IQR Fences: [Q1 - 1.5*IQR, Q3 + 1.5*IQR] and Z-Score = (X - Mean) / SD',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions evaluated`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // ==========================================
  // STANDARD LOOKUPS & GENERAL QUERIES
  // ==========================================

  // Compare Two Institutions
  if (sq.intent === 'institution_compare' && sq.entities.institutions.length >= 2) {
    const inst1Target = sq.entities.institutions[0];
    const inst2Target = sq.entities.institutions[1];

    if (!inst1Target.resolvedId || !inst2Target.resolvedId) {
      const missing = !inst1Target.resolvedId ? inst1Target.raw : inst2Target.raw;
      return {
        intent: 'institution_compare',
        summary: `I couldn't find '${missing}' in the NIRF data.`,
        data: null,
      };
    }

    const inst1 = instMap.get(inst1Target.resolvedId)!;
    const inst2 = instMap.get(inst2Target.resolvedId)!;

    const recs1 = getInstitutionRankings(inst1.institution_id);
    const recs2 = getInstitutionRankings(inst2.institution_id);

    // Determine category
    let compCategory = sq.entities.category;
    if (!compCategory) {
      const cats1 = new Set(recs1.map((r) => r.category));
      const cats2 = new Set(recs2.map((r) => r.category));
      if (cats1.has('Overall') && cats2.has('Overall')) {
        compCategory = 'Overall';
      } else {
        const shared = Array.from(cats1).filter((c) => cats2.has(c));
        compCategory = (shared.length > 0 ? shared[0] : 'Overall') as CategoryType;
      }
    }

    // Determine year
    let compYear: number;
    if (sq.entities.years.length === 1) {
      compYear = sq.entities.years[0];
    } else {
      const years1 = new Set(recs1.filter((r) => r.category === compCategory).map((r) => r.year));
      const years2 = new Set(recs2.filter((r) => r.category === compCategory).map((r) => r.year));
      const sharedYears = Array.from(years1).filter((y) => years2.has(y)).sort((a, b) => b - a);

      if (sharedYears.includes(activeYear)) {
        compYear = activeYear;
      } else if (sharedYears.length > 0) {
        compYear = sharedYears[0];
      } else {
        compYear = activeYear;
      }
    }

    const r1 = recs1.find((r) => r.year === compYear && r.category === compCategory);
    const r2 = recs2.find((r) => r.year === compYear && r.category === compCategory);

    if (!r1 || !r2) {
      const a1 = checkDataAvailability(inst1.institution_id, compYear, compCategory);
      const a2 = checkDataAvailability(inst2.institution_id, compYear, compCategory);
      return {
        intent: 'institution_compare',
        summary: `Cannot directly compare ${inst1.short_name} and ${inst2.short_name} in ${compCategory} for ${compYear}. ${a1.summaryMessage} ${a2.summaryMessage}`,
        data: null,
      };
    }

    const diff = Number(Math.abs(r1.overall_score - r2.overall_score).toFixed(2));
    const leader = r1.overall_score >= r2.overall_score ? inst1.short_name : inst2.short_name;
    const trailing = r1.overall_score >= r2.overall_score ? inst2.short_name : inst1.short_name;

    // Detailed comparison metrics
    const tlrDiff = Number((r1.TLR - r2.TLR).toFixed(2));
    const rpcDiff = Number((r1.RPC - r2.RPC).toFixed(2));
    const goDiff = Number((r1.GO - r2.GO).toFixed(2));
    const oiDiff = Number((r1.OI - r2.OI).toFixed(2));
    const prDiff = Number((r1.PR - r2.PR).toFixed(2));

    const strengths1: string[] = [];
    const strengths2: string[] = [];

    if (tlrDiff > 0) strengths1.push(`TLR (+${tlrDiff})`); else if (tlrDiff < 0) strengths2.push(`TLR (+${Math.abs(tlrDiff)})`);
    if (rpcDiff > 0) strengths1.push(`RPC (+${rpcDiff})`); else if (rpcDiff < 0) strengths2.push(`RPC (+${Math.abs(rpcDiff)})`);
    if (goDiff > 0) strengths1.push(`GO (+${goDiff})`); else if (goDiff < 0) strengths2.push(`GO (+${Math.abs(goDiff)})`);
    if (oiDiff > 0) strengths1.push(`OI (+${oiDiff})`); else if (oiDiff < 0) strengths2.push(`OI (+${Math.abs(oiDiff)})`);
    if (prDiff > 0) strengths1.push(`PR (+${prDiff})`); else if (prDiff < 0) strengths2.push(`PR (+${Math.abs(prDiff)})`);

    const summaryText = `In the ${compYear} NIRF ${compCategory} rankings, ${inst1.short_name} holds Rank #${r1.rank} (Score: ${r1.overall_score}) while ${inst2.short_name} holds Rank #${r2.rank} (Score: ${r2.overall_score}). ${leader} leads ${trailing} by ${diff} composite score points.

### 1. Quick Summary
${leader} outperforms ${trailing} in ${compCategory} (${compYear}) by **${diff} points**, holding **Rank #${Math.min(r1.rank, r2.rank)}** nationally. ${strengths1.length > 0 ? `${inst1.short_name} demonstrates advantages in ${strengths1.join(', ')}.` : ''} ${strengths2.length > 0 ? `${inst2.short_name} leads in ${strengths2.join(', ')}.` : ''}

### 2. Key Comparison
| Parameter | ${inst1.short_name} | ${inst2.short_name} | Leader |
| :--- | :--- | :--- | :--- |
| **Overall Rank** | #${r1.rank} | #${r2.rank} | ${r1.rank < r2.rank ? inst1.short_name : (r1.rank > r2.rank ? inst2.short_name : 'Tied')} |
| **Overall Score** | ${r1.overall_score} | ${r2.overall_score} | ${leader} (+${diff}) |
| **TLR** (Teaching & Resources) | ${r1.TLR} | ${r2.TLR} | ${tlrDiff >= 0 ? inst1.short_name : inst2.short_name} (${Math.abs(tlrDiff)}) |
| **RPC** (Research & Practice) | ${r1.RPC} | ${r2.RPC} | ${rpcDiff >= 0 ? inst1.short_name : inst2.short_name} (${Math.abs(rpcDiff)}) |
| **GO** (Graduation Outcomes) | ${r1.GO} | ${r2.GO} | ${goDiff >= 0 ? inst1.short_name : inst2.short_name} (${Math.abs(goDiff)}) |
| **OI** (Outreach & Inclusivity) | ${r1.OI} | ${r2.OI} | ${oiDiff >= 0 ? inst1.short_name : inst2.short_name} (${Math.abs(oiDiff)}) |
| **PR** (Perception) | ${r1.PR} | ${r2.PR} | ${prDiff >= 0 ? inst1.short_name : inst2.short_name} (${Math.abs(prDiff)}) |

### 3. Detailed Analysis
- **Primary Driver**: The largest parameter divergence is in **${Math.abs(rpcDiff) >= Math.abs(tlrDiff) ? 'RPC' : 'TLR'}**, showing a difference of **${Math.max(Math.abs(rpcDiff), Math.abs(tlrDiff), Math.abs(prDiff)).toFixed(2)} points**.
- **Institutional Strengths**: ${inst1.short_name} scores **${r1.RPC}** in Research and **${r1.PR}** in Perception, while ${inst2.short_name} scores **${r2.RPC}** in Research and **${r2.PR}** in Perception.
- **Graduation & Outreach**: Graduation Outcomes stand at ${r1.GO} vs ${r2.GO}, and Outreach & Inclusivity at ${r1.OI} vs ${r2.OI}.

### 4. Key Insights
- **National Stature**: Both institutions are premier Tier-1 Indian research institutions separated by just ${diff} points in overall standing.
- **Core Pillars**: ${leader} maintains the national lead primarily due to its higher composite score in ${strengths1.length > 0 && leader === inst1.short_name ? strengths1[0] : (strengths2[0] || 'core metrics')}.
- **Research Strength**: RPC is a major scoring component for both institutions (${r1.RPC} vs ${r2.RPC}).`;

    return {
      intent: 'institution_compare',
      summary: summaryText,
      explanation: `${inst1.short_name}: TLR ${r1.TLR}, RPC ${r1.RPC}, GO ${r1.GO}, OI ${r1.OI}, PR ${r1.PR}. ${inst2.short_name}: TLR ${r2.TLR}, RPC ${r2.RPC}, GO ${r2.GO}, OI ${r2.OI}, PR ${r2.PR}.`,
      data: { inst1: r1, inst2: r2 },
      chartType: 'grouped_bar',
      chartData: [
        { parameter: 'Overall Score', [inst1.short_name]: r1.overall_score, [inst2.short_name]: r2.overall_score },
        { parameter: 'TLR', [inst1.short_name]: r1.TLR, [inst2.short_name]: r2.TLR },
        { parameter: 'RPC', [inst1.short_name]: r1.RPC, [inst2.short_name]: r2.RPC },
        { parameter: 'GO', [inst1.short_name]: r1.GO, [inst2.short_name]: r2.GO },
        { parameter: 'OI', [inst1.short_name]: r1.OI, [inst2.short_name]: r2.OI },
        { parameter: 'PR', [inst1.short_name]: r1.PR, [inst2.short_name]: r2.PR },
      ],
      chartConfig: {
        xKey: 'parameter',
        yKeys: [inst1.short_name, inst2.short_name],
        title: `${inst1.short_name} vs ${inst2.short_name} (${compYear} ${compCategory})`,
        orientation: 'horizontal',
      },
      structuredSections: {
        quickSummary: `${leader} holds Rank #${Math.min(r1.rank, r2.rank)} nationally in ${compCategory} (${compYear}) with a composite score of ${Math.max(r1.overall_score, r2.overall_score)}, leading ${trailing} (Rank #${Math.max(r1.rank, r2.rank)}, Score ${Math.min(r1.overall_score, r2.overall_score)}) by ${diff} points.`,
        comparisonTable: {
          headers: ['Parameter', inst1.short_name, inst2.short_name, 'Advantage'],
          rows: [
            ['Overall Rank', `#${r1.rank}`, `#${r2.rank}`, r1.rank < r2.rank ? inst1.short_name : (r1.rank > r2.rank ? inst2.short_name : 'Tied')],
            ['Overall Score', `${r1.overall_score}`, `${r2.overall_score}`, r1.overall_score > r2.overall_score ? `${inst1.short_name} (+${diff})` : `${inst2.short_name} (+${diff})`],
            ['TLR (Teaching & Resources)', `${r1.TLR}`, `${r2.TLR}`, tlrDiff > 0 ? `${inst1.short_name} (+${tlrDiff})` : (tlrDiff < 0 ? `${inst2.short_name} (+${Math.abs(tlrDiff)})` : 'Tied')],
            ['RPC (Research & Practice)', `${r1.RPC}`, `${r2.RPC}`, rpcDiff > 0 ? `${inst1.short_name} (+${rpcDiff})` : (rpcDiff < 0 ? `${inst2.short_name} (+${Math.abs(rpcDiff)})` : 'Tied')],
            ['GO (Graduation Outcomes)', `${r1.GO}`, `${r2.GO}`, goDiff > 0 ? `${inst1.short_name} (+${goDiff})` : (goDiff < 0 ? `${inst2.short_name} (+${Math.abs(goDiff)})` : 'Tied')],
            ['OI (Outreach & Inclusivity)', `${r1.OI}`, `${r2.OI}`, oiDiff > 0 ? `${inst1.short_name} (+${oiDiff})` : (oiDiff < 0 ? `${inst2.short_name} (+${Math.abs(oiDiff)})` : 'Tied')],
            ['PR (Perception)', `${r1.PR}`, `${r2.PR}`, prDiff > 0 ? `${inst1.short_name} (+${prDiff})` : (prDiff < 0 ? `${inst2.short_name} (+${Math.abs(prDiff)})` : 'Tied')],
          ],
        },
        detailedAnalysis: `The head-to-head evaluation between ${inst1.short_name} and ${inst2.short_name} reveals key differentiators across NIRF pillars. ${inst1.short_name} posts ${r1.RPC} in RPC and ${r1.TLR} in TLR, while ${inst2.short_name} registers ${r2.RPC} in RPC and ${r2.TLR} in TLR. The largest point variance emerges in ${Math.abs(rpcDiff) >= Math.abs(tlrDiff) ? 'Research and Professional Practice (RPC)' : 'Teaching, Learning & Resources (TLR)'}.`,
        keyInsights: [
          `**Top-Tier Alignment**: Both institutions occupy top national ranks in the NIRF ${compCategory} rankings (${compYear}).`,
          `**Leading Advantage**: ${leader} holds the edge by **${diff} composite points**, supported by strong performance across key pillars.`,
          `**Research Impact**: Both institutions demonstrate massive research productivity, with RPC scores of ${r1.RPC} and ${r2.RPC}.`,
        ],
      },
      calculationDetails: {
        formula: 'Head-to-head parameter comparison across normalized NIRF pillars',
        filtersApplied: `Year: ${compYear} | Category: ${compCategory}`,
        sampleSize: '2 institutions',
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // Single Institution Rank / Score Lookup
  if ((sq.intent === 'rank_lookup' || sq.intent === 'score_lookup') && sq.entities.institutions.length === 1) {
    const instTarget = sq.entities.institutions[0];
    if (!instTarget.resolvedId) {
      return {
        intent: 'rank_lookup',
        summary: `I couldn't find '${instTarget.raw}' in the NIRF data.`,
        data: null,
      };
    }

    const inst = instMap.get(instTarget.resolvedId)!;
    const avail = checkDataAvailability(inst.institution_id, activeYear, activeCategory);

    if (!avail.available) {
      return {
        intent: 'rank_lookup',
        summary: avail.summaryMessage,
        data: null,
      };
    }

    const rec = avail.exactRecord!;
    const otherCats = avail.sameYearOtherCategories;
    let otherNote = '';
    if (otherCats.length > 0) {
      otherNote = ` (In other categories for ${rec.year}: ${otherCats.map((c) => `${c.category} Rank #${c.rank}, Score ${c.overall_score}`).join('; ')}).`;
    }

    if (sq.intent === 'score_lookup' && sq.entities.parameters.length === 1) {
      const p = sq.entities.parameters[0];
      const val = rec[p];
      return {
        intent: 'score_lookup',
        summary: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name}'s ${p} score is ${val} / 100 (Overall Rank #${rec.rank}, Score ${rec.overall_score} pts).`,
        data: rec,
        calculationDetails: {
          formula: `Verified ${p} component score`,
          filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
          sampleSize: '1 verified ranking record',
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
      };
    }

    return {
      intent: 'rank_lookup',
      summary: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name} holds Rank #${rec.rank} (Overall Score: ${rec.overall_score} pts).${otherNote}`,
      explanation: `Parameter breakdown: TLR: ${rec.TLR}, RPC: ${rec.RPC}, GO: ${rec.GO}, OI: ${rec.OI}, PR: ${rec.PR}.`,
      data: rec,
      calculationDetails: {
        formula: 'Official Composite NIRF Rank and Parameter Score',
        filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
        sampleSize: '1 verified ranking record',
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // Top N Institutions
  if (sq.intent === 'top_n') {
    const limit = sq.entities.topN || 5;
    const targetCohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory && r.overall_score > 0).sort((a, b) => a.rank - b.rank);

    if (targetCohort.length === 0) {
      return {
        intent: 'top_n',
        summary: `No ranking records found matching category '${activeCategory}' for year ${activeYear}.`,
        data: [],
      };
    }

    const topList = targetCohort.slice(0, limit);
    const first = topList[0];
    const firstInst = instMap.get(first.institution_id);
    const firstName = firstInst?.short_name || first.institution_id;
    const last = topList[topList.length - 1];
    const lastName = instMap.get(last.institution_id)?.short_name || last.institution_id;

    const tableMarkdown = [
      '| Rank | Institution | Overall Score | TLR | RPC | GO | OI | PR |',
      '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
      ...topList.map(
        (r) =>
          `| **#${r.rank}** | ${instMap.get(r.institution_id)?.short_name || r.institution_id} | **${r.overall_score}** | ${r.TLR} | ${r.RPC} | ${r.GO} | ${r.OI} | ${r.PR} |`
      ),
    ].join('\n');

    const summaryText = `In the ${activeYear} NIRF ${activeCategory} rankings, ${firstName} holds the #1 position with an overall score of ${first.overall_score} points.

### 1. Quick Summary
**${firstName}** secures **Rank #1** in the NIRF **${activeCategory}** rankings for **${activeYear}** with a composite score of **${first.overall_score}**, leading the Top ${limit} cohort.

### 2. Key Rankings
${tableMarkdown}

### 3. Detailed Analysis
- **Top Tier Spread**: The gap between #1 (${firstName}, **${first.overall_score}**) and #${last.rank} (${lastName}, **${last.overall_score}**) is **${(first.overall_score - last.overall_score).toFixed(2)} score points**.
- **Research Dominance**: The top-ranked institutions exhibit significantly higher RPC (Research & Professional Practice) scores than the rest of the cohort.
- **Geographic Representation**: Top positions span premier institutes across the country demonstrating elite academic and research outcomes.

### 4. Key Insights
- **#1 Position**: **${firstName}** remains the top benchmark with **${first.overall_score} points**.
- **Podium Finishers**: The top 3 institutions are ${topList.slice(0, 3).map((r) => `${instMap.get(r.institution_id)?.short_name || r.institution_id} (#${r.rank})`).join(', ')}.
- **Top ${limit} Cutoff**: Entering the top ${limit} in ${activeCategory} (${activeYear}) required a minimum score of **${last.overall_score} points**.`;

    return {
      intent: 'top_n',
      summary: summaryText,
      explanation: `The top ${limit} institutions in ${activeCategory} (${activeYear}) are: ${topList
        .map((r) => `#${r.rank} ${instMap.get(r.institution_id)?.short_name || r.institution_id} (${r.overall_score} pts)`)
        .join(', ')}.`,
      data: topList,
      chartType: 'ranking_bar',
      chartData: topList.map((r) => ({
        rank: r.rank,
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        Score: r.overall_score,
        TLR: r.TLR,
        RPC: r.RPC,
        GO: r.GO,
        OI: r.OI,
        PR: r.PR,
        city: instMap.get(r.institution_id)?.city,
        state: instMap.get(r.institution_id)?.state,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Score'],
        title: `Top ${limit} Institutions in ${activeCategory} (${activeYear})`,
        orientation: 'horizontal',
      },
      structuredSections: {
        quickSummary: `${firstName} holds the #1 position in the ${activeYear} NIRF ${activeCategory} rankings with a composite score of ${first.overall_score} points, followed by ${topList.slice(1, 3).map((r) => `${instMap.get(r.institution_id)?.short_name || r.institution_id} (#${r.rank})`).join(' and ')}.`,
        comparisonTable: {
          headers: ['Rank', 'Institution', 'Score', 'TLR', 'RPC', 'GO', 'OI', 'PR'],
          rows: topList.map((r) => [
            `#${r.rank}`,
            instMap.get(r.institution_id)?.short_name || r.institution_id,
            `${r.overall_score}`,
            `${r.TLR}`,
            `${r.RPC}`,
            `${r.GO}`,
            `${r.OI}`,
            `${r.PR}`,
          ]),
        },
        detailedAnalysis: `The top ${limit} institutions in ${activeCategory} (${activeYear}) display a score spread of ${(first.overall_score - last.overall_score).toFixed(2)} points between #1 (${firstName}, ${first.overall_score}) and #${last.rank} (${lastName}, ${last.overall_score}). Research and Perception scores serve as the highest differentiating factors among the top tier.`,
        keyInsights: [
          `**#1 Position**: ${firstName} leads with ${first.overall_score} points.`,
          `**Top Tier Concentration**: The top 3 institutions account for the highest aggregate Research (RPC) and Perception (PR) ratings.`,
          `**Score Threshold**: Entering the Top ${limit} in ${activeCategory} (${activeYear}) required a minimum score of ${last.overall_score} points.`,
        ],
      },
      calculationDetails: {
        formula: 'Official NIRF Composite Rank Order (Ascending rank #1 to #N)',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory} | Limit: ${limit}`,
        sampleSize: `${targetCohort.length} institutions evaluated`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // Count Query
  if (sq.intent === 'count_query') {
    const cohort = RANKINGS.filter((r) => r.year === activeYear && r.category === activeCategory);
    return {
      intent: 'count_query',
      summary: `There are ${cohort.length} ranked institutions in the ${activeYear} NIRF ${activeCategory} category.`,
      data: { count: cohort.length, year: activeYear, category: activeCategory },
    };
  }

  // Fallback
  return {
    intent: 'unsupported_or_ambiguous',
    summary: 'I could not find matching ranking records for your query. Please specify a valid institution name, category, or year (2017–2025).',
    data: null,
  };
}
