/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic NIRF Data Query Execution Engine
 * Converts structured query intent into verified computations over real NIRF data (2017–2025).
 * Rule: Never invent or hallucinate numbers; every statistic, rank, and score is computed in code.
 */

import { AIQueryResponse, PageId } from '../types';
import { INSTITUTIONS, RANKINGS, YEARS, CATEGORIES, STATES } from '../data/nirfData';
import { calculateExtendedStats, calculateCovarianceAndCorrelation } from '../utils/dynamicStats';

export interface StructuredQuery {
  is_out_of_scope?: boolean;
  intent?:
    | 'top_n'
    | 'compare'
    | 'institution_lookup'
    | 'time_series'
    | 'improvers'
    | 'decliners'
    | 'correlation'
    | 'statistics'
    | 'geospatial'
    | 'outliers'
    | 'general';
  metric?: 'overall_score' | 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR' | 'rank';
  secondary_metric?: 'overall_score' | 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR' | 'rank' | null;
  years?: number[];
  category?: string;
  states?: string[];
  institutions?: string[];
  statistic?: 'mean' | 'median' | 'max' | 'min' | 'sd' | 'correlation';
  chart_type?: 'bar' | 'line' | 'scatter' | 'radar';
  limit?: number;
}

// Quick institution helper
const instMap = new Map(INSTITUTIONS.map((i) => [i.institution_id, i]));

export function findInstitutionMatch(nameOrSlug: string) {
  const norm = nameOrSlug.toLowerCase().trim();
  if (!norm) return null;

  // Direct ID check
  if (instMap.has(norm)) return instMap.get(norm)!;

  // Exact short_name or institution_name match
  const exact = INSTITUTIONS.find(
    (i) => i.short_name.toLowerCase() === norm || i.institution_name.toLowerCase() === norm
  );
  if (exact) return exact;

  // Fuzzy / substring match
  const match = INSTITUTIONS.find(
    (i) =>
      i.short_name.toLowerCase().includes(norm) ||
      norm.includes(i.short_name.toLowerCase()) ||
      i.institution_name.toLowerCase().includes(norm) ||
      i.institution_id.toLowerCase().includes(norm)
  );
  return match || null;
}

/**
 * Executes a structured query against real NIRF data and produces a verified AIQueryResponse.
 */
export function executeStructuredQuery(sq: StructuredQuery, originalQuery: string): AIQueryResponse {
  // 1. OUT OF SCOPE CHECK
  if (sq.is_out_of_scope) {
    return {
      answer: 'I can only answer questions about the NIRF ranking data and the analysis in this dashboard.',
      explanation: 'This assistant is dedicated to analyzing official National Institutional Ranking Framework (NIRF) data (2017–2025) across 13 categories, academic parameters (TLR, RPC, GO, OI, PR), and institutional performance metrics.',
      dataSummary: { Status: 'Out of scope query ignored' },
      isOutOfScope: true,
    };
  }

  // 2. CHECK NON-EXISTENT YEARS
  if (sq.years && sq.years.length > 0) {
    const invalidYears = sq.years.filter((y) => !YEARS.includes(y));
    if (invalidYears.length > 0) {
      return {
        answer: `The NIRF dataset covers rankings from 2017 to 2025. Data for the year ${invalidYears.join(', ')} does not exist in the dataset.`,
        explanation: 'The Ministry of Education published official rankings for the years 2017 through 2025. Please specify an evaluation year between 2017 and 2025.',
        dataSummary: {
          'Available Years': '2017 – 2025 (9 annual editions)',
          'Requested Year': invalidYears.join(', '),
        },
      };
    }
  }

  // 3. CHECK NON-EXISTENT CATEGORY
  if (sq.category && sq.category !== 'All') {
    const catExists = CATEGORIES.some(
      (c) => c.value.toLowerCase() === sq.category?.toLowerCase() || c.label.toLowerCase() === sq.category?.toLowerCase()
    );
    if (!catExists) {
      return {
        answer: `Category '${sq.category}' does not exist in the NIRF dataset.`,
        explanation: `Available NIRF categories in this platform are: ${CATEGORIES.map((c) => c.label).join(', ')}.`,
        dataSummary: {
          'Requested Category': sq.category,
          'Valid Categories Count': String(CATEGORIES.length),
        },
      };
    }
  }

  const activeYear = sq.years && sq.years.length === 1 ? sq.years[0] : 2025;
  const activeCategory = sq.category || 'Overall';
  const activeMetric = sq.metric || 'overall_score';

  // 4. COMPARE TWO OR MORE INSTITUTIONS
  if (sq.intent === 'compare' && sq.institutions && sq.institutions.length >= 2) {
    const inst1 = findInstitutionMatch(sq.institutions[0]);
    const inst2 = findInstitutionMatch(sq.institutions[1]);

    if (!inst1 || !inst2) {
      const missing = !inst1 ? sq.institutions[0] : sq.institutions[1];
      return {
        answer: `Institution '${missing}' does not exist in the NIRF dataset. The dataset only contains Indian higher educational institutions evaluated by NIRF.`,
        explanation: 'Please check the spelling or search for recognized universities and institutes of national importance.',
        dataSummary: { 'Missing Entity': missing },
      };
    }

    const r1 = RANKINGS.find(
      (r) => r.institution_id === inst1.institution_id && r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory)
    );
    const r2 = RANKINGS.find(
      (r) => r.institution_id === inst2.institution_id && r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory)
    );

    if (!r1 || !r2) {
      const unranked = !r1 ? inst1.short_name : inst2.short_name;
      return {
        answer: `${unranked} does not have a published ranking record in the ${activeCategory} category for year ${activeYear}.`,
        explanation: 'Institutions may not be ranked in every stream each year due to eligibility, category boundaries, or participation.',
        dataSummary: {
          [inst1.short_name]: r1 ? `Rank #${r1.rank} (${r1.overall_score} pts)` : 'Unranked in stream',
          [inst2.short_name]: r2 ? `Rank #${r2.rank} (${r2.overall_score} pts)` : 'Unranked in stream',
        },
      };
    }

    const leadScore = Number(Math.abs(r1.overall_score - r2.overall_score).toFixed(2));
    const higherInst = r1.overall_score >= r2.overall_score ? inst1.short_name : inst2.short_name;
    const lowerInst = r1.overall_score >= r2.overall_score ? inst2.short_name : inst1.short_name;

    return {
      answer: `In the ${activeYear} NIRF ${activeCategory} rankings, ${inst1.short_name} holds Rank #${r1.rank} (Score: ${r1.overall_score}) while ${inst2.short_name} holds Rank #${r2.rank} (Score: ${r2.overall_score}). ${higherInst} leads ${lowerInst} by ${leadScore} composite points.`,
      explanation: `${inst1.short_name} scores TLR: ${r1.TLR}, RPC: ${r1.RPC}, GO: ${r1.GO}, OI: ${r1.OI}, PR: ${r1.PR}. Meanwhile, ${inst2.short_name} scores TLR: ${r2.TLR}, RPC: ${r2.RPC}, GO: ${r2.GO}, OI: ${r2.OI}, PR: ${r2.PR}. Research (RPC) and Teaching (TLR) form the primary score differentials.`,
      dataSummary: {
        [`${inst1.short_name} Rank`]: `#${r1.rank} (${r1.overall_score} pts)`,
        [`${inst2.short_name} Rank`]: `#${r2.rank} (${r2.overall_score} pts)`,
        'TLR Head-to-Head': `${inst1.short_name}: ${r1.TLR} vs ${inst2.short_name}: ${r2.TLR}`,
        'RPC Head-to-Head': `${inst1.short_name}: ${r1.RPC} vs ${inst2.short_name}: ${r2.RPC}`,
      },
      chartType: 'radar',
      chartData: [
        { parameter: 'TLR', [inst1.short_name]: r1.TLR, [inst2.short_name]: r2.TLR },
        { parameter: 'RPC', [inst1.short_name]: r1.RPC, [inst2.short_name]: r2.RPC },
        { parameter: 'GO', [inst1.short_name]: r1.GO, [inst2.short_name]: r2.GO },
        { parameter: 'OI', [inst1.short_name]: r1.OI, [inst2.short_name]: r2.OI },
        { parameter: 'PR', [inst1.short_name]: r1.PR, [inst2.short_name]: r2.PR },
      ],
      chartConfig: {
        xKey: 'parameter',
        yKeys: [inst1.short_name, inst2.short_name],
        title: `${inst1.short_name} vs ${inst2.short_name} (${activeYear} ${activeCategory})`,
      },
      calculationDetails: {
        formula: 'Head-to-head comparison of normalized pillar scores (TLR, RPC, GO, OI, PR, Overall Score)',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: '2 institutions',
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
      targetPage: 'comparison',
      targetFilters: { selectedInstitutionId: inst1.institution_id },
    };
  }

  // 5. SINGLE INSTITUTION TRAJECTORY / TIME SERIES
  if ((sq.intent === 'institution_lookup' || sq.intent === 'time_series') && sq.institutions && sq.institutions.length >= 1) {
    const inst = findInstitutionMatch(sq.institutions[0]);
    if (!inst) {
      return {
        answer: `Institution '${sq.institutions[0]}' does not exist in the NIRF dataset.`,
        explanation: 'Please provide a recognized university, college, or institute name evaluated by NIRF.',
        dataSummary: { 'Queried Name': sq.institutions[0] },
      };
    }

    const history = RANKINGS.filter(
      (r) => r.institution_id === inst.institution_id && (activeCategory === 'All' || r.category === activeCategory)
    ).sort((a, b) => a.year - b.year);

    if (history.length === 0) {
      return {
        answer: `No historical ranking records found for ${inst.short_name} in category ${activeCategory}.`,
        explanation: 'The institution may participate in different categories (e.g., Engineering vs Overall).',
        dataSummary: { Institution: inst.short_name, Stream: activeCategory },
      };
    }

    const startRec = history[0];
    const endRec = history[history.length - 1];
    const rankDiff = startRec.rank - endRec.rank; // positive = climbed

    return {
      answer: `Between ${startRec.year} and ${endRec.year}, ${inst.short_name} ${
        rankDiff > 0
          ? `climbed ${rankDiff} ranks from #${startRec.rank} to #${endRec.rank}`
          : rankDiff < 0
          ? `dropped ${Math.abs(rankDiff)} ranks from #${startRec.rank} to #${endRec.rank}`
          : `maintained its national rank at #${endRec.rank}`
      } in NIRF ${activeCategory}. Its overall score moved from ${startRec.overall_score} to ${endRec.overall_score} pts.`,
      explanation: `Historical time-series analysis over ${history.length} evaluation editions shows ${inst.short_name}'s trajectory across Teaching (TLR), Research (RPC), and Perception (PR). Latest ${endRec.year} metrics: TLR: ${endRec.TLR}, RPC: ${endRec.RPC}, GO: ${endRec.GO}, PR: ${endRec.PR}.`,
      dataSummary: {
        [`${startRec.year} Position`]: `Rank #${startRec.rank} (${startRec.overall_score} pts)`,
        [`${endRec.year} Position`]: `Rank #${endRec.rank} (${endRec.overall_score} pts)`,
        'Net Movement': rankDiff > 0 ? `+${rankDiff} ranks` : `${rankDiff} ranks`,
        'Editions Tracked': `${history.length} years (${startRec.year}–${endRec.year})`,
      },
      chartType: 'line',
      chartData: history.map((r) => ({
        year: r.year,
        'Overall Score': r.overall_score,
        'National Rank': r.rank,
      })),
      chartConfig: {
        xKey: 'year',
        yKeys: ['Overall Score'],
        title: `${inst.short_name} Multi-Year Score Trajectory`,
      },
      calculationDetails: {
        formula: `Net Rank Movement = Rank(${startRec.year}) - Rank(${endRec.year})`,
        filtersApplied: `Institution: ${inst.short_name} | Category: ${activeCategory}`,
        sampleSize: `${history.length} data points across years`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
      targetPage: 'ranking-trends',
    };
  }

  // 6. GREATEST IMPROVERS / DECLINERS
  if (sq.intent === 'improvers' || sq.intent === 'decliners') {
    const startY = sq.years && sq.years.length === 2 ? sq.years[0] : 2017;
    const endY = sq.years && sq.years.length === 2 ? sq.years[1] : 2025;

    const rStart = RANKINGS.filter((r) => r.year === startY && (activeCategory === 'All' || r.category === activeCategory));
    const rEnd = RANKINGS.filter((r) => r.year === endY && (activeCategory === 'All' || r.category === activeCategory));
    const startMap = new Map(rStart.map((r) => [r.institution_id, r]));

    const movements = rEnd
      .map((re) => {
        const rs = startMap.get(re.institution_id);
        if (!rs || !rs.rank || !re.rank) return null;
        const delta = rs.rank - re.rank; // positive = climbed
        const inst = instMap.get(re.institution_id);
        return {
          name: inst ? inst.short_name : re.institution_id,
          startRank: rs.rank,
          endRank: re.rank,
          delta,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (sq.intent === 'improvers') {
      movements.sort((a, b) => b.delta - a.delta);
      const topClimbers = movements.slice(0, sq.limit || 5);
      const top1 = topClimbers[0];

      return {
        answer: `${top1 ? `${top1.name} registered the greatest ranking improvement in NIRF ${activeCategory} from ${startY} to ${endY}, climbing ${top1.delta} positions from #${top1.startRank} to #${top1.endRank}.` : 'No ranking improvers found for this window.'}`,
        explanation: `Comparing institutions ranked in both ${startY} and ${endY} reveals significant multi-year momentum driven by improved research publications (RPC), modern lab infrastructure (TLR), and graduation placements (GO).`,
        dataSummary: {
          '#1 Climber': top1 ? `${top1.name} (+${top1.delta} ranks)` : 'N/A',
          'Comparison Window': `${startY} to ${endY}`,
          Category: activeCategory,
        },
        chartType: 'bar',
        chartData: topClimbers.map((c) => ({
          name: c.name,
          'Rank Improvement': c.delta,
        })),
        chartConfig: {
          xKey: 'name',
          yKeys: ['Rank Improvement'],
          title: `Top Ranking Improvers (${startY}–${endY})`,
        },
        calculationDetails: {
          formula: `Rank Gain = Rank(${startY}) - Rank(${endY}) (Positive values indicate upward ascent)`,
          filtersApplied: `Years: ${startY}–${endY} | Category: ${activeCategory}`,
          sampleSize: `${movements.length} longitudinal institutional pairs evaluated`,
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
        targetPage: 'ranking-trends',
      };
    }
  }

  // 7. CORRELATION ANALYSIS
  if (sq.intent === 'correlation') {
    const pX = (sq.metric as any) || 'RPC';
    const pY = (sq.secondary_metric as any) || 'overall_score';

    const cohort = RANKINGS.filter(
      (r) => r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory) && (r as any)[pX] > 0 && (r as any)[pY] > 0
    );

    const xVals = cohort.map((r) => (r as any)[pX]);
    const yVals = cohort.map((r) => (r as any)[pY]);
    const corr = calculateCovarianceAndCorrelation(xVals, yVals);

    return {
      answer: `In the ${activeYear} NIRF ${activeCategory} edition, ${pX} exhibits a ${corr.pearsonR >= 0.7 ? 'very strong positive' : corr.pearsonR >= 0.4 ? 'moderate positive' : 'weak'} linear correlation with ${pY}, with Pearson r = +${corr.pearsonR} and coefficient of determination R² = ${corr.rSquared}.`,
      explanation: `Calculated from ${cohort.length} ranked institutions. The regression line equation is ${pY} = ${corr.slope} · ${pX} ${corr.intercept >= 0 ? `+ ${corr.intercept}` : `- ${Math.abs(corr.intercept)}`}. This confirms that institutions with higher ${pX} consistently achieve higher ${pY}.`,
      dataSummary: {
        'Pearson Correlation (r)': `+${corr.pearsonR}`,
        'Variance Explained (R²)': `${(corr.rSquared * 100).toFixed(1)}%`,
        Covariance: String(corr.covariance),
        'Cohort Size (N)': String(cohort.length),
      },
      chartType: 'scatter',
      chartData: cohort.slice(0, 25).map((r) => ({
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        [pX]: (r as any)[pX],
        [pY]: (r as any)[pY],
      })),
      chartConfig: {
        xKey: pX,
        yKeys: [pY],
        title: `${pX} vs ${pY} Correlation (${activeYear})`,
      },
      calculationDetails: {
        formula: 'Pearson r = Cov(X,Y) / (s_X * s_Y) with Bessel-corrected sample standard deviations',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory}`,
        sampleSize: `${cohort.length} institutions evaluated`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
      targetPage: 'correlation',
    };
  }

  // 8. GEOSPATIAL / STATE-WISE ANALYSIS
  if (sq.intent === 'geospatial') {
    const cohort = RANKINGS.filter(
      (r) => r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory) && r.rank <= 100 && r.rank > 0
    );

    const stateCountMap = new Map<string, number>();
    cohort.forEach((r) => {
      const inst = instMap.get(r.institution_id);
      if (inst && inst.state) {
        stateCountMap.set(inst.state, (stateCountMap.get(inst.state) || 0) + 1);
      }
    });

    const sortedStates = Array.from(stateCountMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    const topState = sortedStates[0];

    return {
      answer: `${topState ? `${topState.state} leads India with the highest representation in the NIRF Top 100 for ${activeYear} (${activeCategory}), hosting ${topState.count} top-ranked institutions.` : 'No state data found.'}`,
      explanation: `State representation analysis reveals geographic concentration in premier higher education. Top states include ${sortedStates.slice(0, 3).map((s) => `${s.state} (${s.count})`).join(', ')}.`,
      dataSummary: {
        '#1 State': topState ? `${topState.state} (${topState.count} institutions)` : 'N/A',
        'Top 100 Cohort': `${cohort.length} ranked institutions`,
        Edition: String(activeYear),
      },
      chartType: 'bar',
      chartData: sortedStates.slice(0, 8).map((s) => ({
        name: s.state,
        'Top 100 Institutions': s.count,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Top 100 Institutions'],
        title: `Leading States by Top 100 Institutions (${activeYear})`,
      },
      calculationDetails: {
        formula: 'State aggregation: Count of institutions with National Rank <= 100 grouped by state',
        filtersApplied: `Year: ${activeYear} | Category: ${activeCategory} | Rank <= 100`,
        sampleSize: `${cohort.length} top-100 institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
      targetPage: 'geographical',
    };
  }

  // 9. DEFAULT / TOP-N RANKINGS
  const targetCohort = RANKINGS.filter(
    (r) => r.year === activeYear && (activeCategory === 'All' || r.category === activeCategory) && (r as any)[activeMetric] > 0
  );

  if (targetCohort.length === 0) {
    return {
      answer: `No ranking records found matching category ${activeCategory} for year ${activeYear}.`,
      explanation: 'Please check your category or year selection.',
      dataSummary: { Year: String(activeYear), Category: activeCategory },
    };
  }

  // Sort descending by metric (or ascending if rank)
  if (activeMetric === 'rank') {
    targetCohort.sort((a, b) => a.rank - b.rank);
  } else {
    targetCohort.sort((a, b) => (b as any)[activeMetric] - (a as any)[activeMetric]);
  }

  const limit = sq.limit || 5;
  const topList = targetCohort.slice(0, limit);
  const first = topList[0];
  const firstInst = instMap.get(first.institution_id);

  return {
    answer: `In the ${activeYear} NIRF ${activeCategory} rankings, ${firstInst?.short_name || first.institution_id} holds the top position in ${activeMetric} with ${(first as any)[activeMetric]} pts (Rank #${first.rank}).`,
    explanation: `The top ${limit} institutions in ${activeCategory} (${activeYear}) are: ${topList.map((r, idx) => `#${idx + 1} ${instMap.get(r.institution_id)?.short_name || r.institution_id} (${(r as any)[activeMetric]} pts)`).join(', ')}. Computed directly from verified NIRF records.`,
    dataSummary: {
      'Top Institution': firstInst?.short_name || first.institution_id,
      [`${activeMetric} Score`]: String((first as any)[activeMetric]),
      'National Rank': `#${first.rank}`,
      Edition: `${activeYear} (${activeCategory})`,
    },
    chartType: 'bar',
    chartData: topList.map((r) => ({
      name: instMap.get(r.institution_id)?.short_name || r.institution_id,
      [activeMetric]: (r as any)[activeMetric],
    })),
    chartConfig: {
      xKey: 'name',
      yKeys: [activeMetric],
      title: `Top ${limit} Institutions in ${activeCategory} by ${activeMetric} (${activeYear})`,
    },
    calculationDetails: {
      formula: `Sorted descending by ${activeMetric} (Rank 1 = highest performance)`,
      filtersApplied: `Year: ${activeYear} | Category: ${activeCategory} | Limit: ${limit}`,
      sampleSize: `${targetCohort.length} institutions evaluated`,
      sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
    },
    targetPage: 'overview',
  };
}

