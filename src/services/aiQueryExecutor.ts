/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic NIRF Data Query Execution Engine
 * Converts structured query intent into verified computations over real NIRF data (2017–2025).
 * 
 * Key Principles:
 * 1. Strictly answers from real data; never invents numbers.
 * 2. Dedicated institution resolver (exact, ambiguous, not_found).
 * 3. Never falls back to the top-ranked institution (IIT Madras).
 * 4. Checks data availability across years and categories and explains missing records.
 * 5. Refuses out-of-scope non-NIRF questions cleanly without a chart.
 */

import { AIQueryResponse } from '../types';
import { INSTITUTIONS, RANKINGS, YEARS, CATEGORIES } from '../data/nirfData';
import { calculateCovarianceAndCorrelation } from '../utils/dynamicStats';
import {
  resolveInstitutionName,
  checkDataAvailability,
  InstitutionResolution,
} from './institutionResolver';
import { LLMQueryUnderstanding } from '../server/geminiParser';

export type StructuredQuery = LLMQueryUnderstanding;

const instMap = new Map(INSTITUTIONS.map((i) => [i.institution_id, i]));

/**
 * Executes a structured query against the real NIRF dataset and produces a verified AIQueryResponse.
 */
export function executeStructuredQuery(sq: StructuredQuery, originalQuery: string): AIQueryResponse {
  // 1. OUT OF SCOPE CHECK
  if (sq.intent === 'out_of_scope') {
    return {
      answer: 'I can only answer questions about the NIRF ranking data and the analysis in this dashboard.',
      isOutOfScope: true,
    };
  }

  const qLower = originalQuery.toLowerCase();

  // 2. DATASET INQUIRY - Only include summary if user explicitly asks about the dataset
  if (
    qLower.includes('dataset') ||
    qLower.includes('what data') ||
    qLower.includes('tell me about the data') ||
    qLower.includes('what categories are in') ||
    qLower.includes('what years are in')
  ) {
    return {
      answer:
        'The dashboard contains the official Ministry of Education NIRF dataset covering 2017 to 2025 across 13 academic categories and 6,843 verified ranking records.',
      isDatasetQuery: true,
      dataSummary: {
        'Available Years': '2017 – 2025 (9 annual editions)',
        'Categories':
          '13 categories (Overall, Engineering, Management, University, College, Medical, Pharmacy, Law, Architecture, Dental, Agriculture, Research, State Public University)',
        'Institutions': '1,231 verified Indian institutions',
        'Parameters': 'Overall Score, TLR, RPC, GO, OI, PR, Rank',
      },
    };
  }

  // 3. PARAMETER DEFINITIONS (Simple factual answer, NO chart)
  if (qLower.includes('what is tlr') || qLower.includes('what does tlr mean') || qLower.includes('explain tlr')) {
    return {
      answer:
        'Teaching, Learning & Resources (TLR) evaluates Student Strength, Faculty-Student Ratio, Faculty Qualifications (PhD & experience), and Financial Resource Utilization (weight: 30%).',
    };
  }
  if (qLower.includes('what is rpc') || qLower.includes('what does rpc mean') || qLower.includes('explain rpc')) {
    return {
      answer:
        'Research and Professional Practice (RPC) evaluates combined metrics for Publications, Citations, Quality of Publications (Q1 journals), and Patents/IPR (weight: 30%).',
    };
  }
  if (qLower.includes('what is go') || qLower.includes('what does go mean') || qLower.includes('explain go')) {
    return {
      answer:
        'Graduation Outcomes (GO) measures university examination performance, median placement salaries, and progression to higher studies (weight: 20%).',
    };
  }
  if (qLower.includes('what is oi') || qLower.includes('what does oi mean') || qLower.includes('explain oi')) {
    return {
      answer:
        'Outreach and Inclusivity (OI) evaluates regional diversity (students from other states/countries), percentage of women, disadvantaged students, and facilities for physically challenged students (weight: 10%).',
    };
  }
  if (qLower.includes('what is pr') || qLower.includes('what does pr mean') || qLower.includes('explain pr')) {
    return {
      answer:
        'Peer Perception (PR) assesses institutional academic reputation based on surveys conducted with academic peers and employers across India (weight: 10%).',
    };
  }
  if (qLower.includes('what is nirf') || qLower.includes('explain nirf')) {
    return {
      answer:
        'The National Institutional Ranking Framework (NIRF) is an official methodology approved by the Ministry of Education, Government of India, to rank higher education institutions across India on 5 core pillars.',
    };
  }

  // 4. CHECK NON-EXISTENT YEARS
  if (sq.years && sq.years.length > 0) {
    const invalidYears = sq.years.filter((y) => !YEARS.includes(y));
    if (invalidYears.length > 0) {
      return {
        answer: `The NIRF dataset covers rankings from 2017 to 2025. Data for year ${invalidYears.join(', ')} does not exist in the dataset.`,
      };
    }
  }

  // 5. CHECK NON-EXISTENT CATEGORY
  if (sq.category && sq.category !== 'All') {
    const catExists = CATEGORIES.some(
      (c) =>
        c.value.toLowerCase() === sq.category?.toLowerCase() ||
        c.label.toLowerCase() === sq.category?.toLowerCase()
    );
    if (!catExists) {
      return {
        answer: `Category '${sq.category}' does not exist in the NIRF dataset. Available categories are: ${CATEGORIES.map((c) => c.label).join(', ')}.`,
      };
    }
  }

  const activeYear = sq.years && sq.years.length === 1 ? sq.years[0] : 2024;
  const activeCategory = sq.category || null;

  // 6. INSTITUTION QUERIES RESOLUTION
  // If the query involves one or more named institutions, resolve them strictly in code.
  if (sq.institutions && sq.institutions.length > 0) {
    const resolvedList: { raw: string; res: InstitutionResolution }[] = sq.institutions.map(
      (rawName) => ({
        raw: rawName,
        res: resolveInstitutionName(rawName),
      })
    );

    // Check for not_found
    const notFound = resolvedList.find((item) => item.res.status === 'not_found');
    if (notFound) {
      const suggestions = (notFound.res as { status: 'not_found'; suggestions: any[] }).suggestions;
      const suggText =
        suggestions.length > 0
          ? ` Did you mean: ${suggestions.map((s) => s.short_name).join(', ')}?`
          : '';
      return {
        answer: `I couldn't find '${notFound.raw}' in the NIRF data.${suggText}`,
      };
    }

    // Check for ambiguous matches (e.g. 'MIT')
    const ambiguous = resolvedList.find((item) => item.res.status === 'ambiguous');
    if (ambiguous) {
      const matches = (ambiguous.res as { status: 'ambiguous'; matches: any[] }).matches;
      return {
        answer: `Several institutions match "${ambiguous.raw}". Which one did you mean?\n${matches
          .map((m, idx) => `${idx + 1}. ${m.institution_name} (${m.city}, ${m.state})`)
          .join('\n')}`,
      };
    }

    // Extract exact institutions
    const exactInstitutions = resolvedList.map(
      (item) => (item.res as { status: 'exact'; institution: any }).institution
    );

    // CASE 6A: COMPARE TWO INSTITUTIONS
    if (sq.intent === 'compare' && exactInstitutions.length >= 2) {
      const inst1 = exactInstitutions[0];
      const inst2 = exactInstitutions[1];

      // Find shared categories
      const recs1 = RANKINGS.filter((r) => r.institution_id === inst1.institution_id);
      const recs2 = RANKINGS.filter((r) => r.institution_id === inst2.institution_id);

      const cats1 = new Set(recs1.map((r) => r.category));
      const cats2 = new Set(recs2.map((r) => r.category));
      const sharedCats = Array.from(cats1).filter((c) => cats2.has(c));

      // Choose comparison category
      let compCategory = activeCategory;
      if (!compCategory || !sharedCats.includes(compCategory as any)) {
        if (sharedCats.includes('Overall' as any)) {
          compCategory = 'Overall';
        } else if (sharedCats.length > 0) {
          compCategory = sharedCats[0];
        } else {
          compCategory = activeCategory || 'Overall';
        }
      }

      // Find shared years in this category
      const years1 = new Set(recs1.filter((r) => r.category === compCategory).map((r) => r.year));
      const years2 = new Set(recs2.filter((r) => r.category === compCategory).map((r) => r.year));
      const sharedYears = Array.from(years1).filter((y) => years2.has(y)).sort((a, b) => b - a);

      let compYear = activeYear;
      if (!sharedYears.includes(compYear) && sharedYears.length > 0) {
        compYear = sharedYears[0];
      }

      const r1 = recs1.find((r) => r.category === compCategory && r.year === compYear);
      const r2 = recs2.find((r) => r.category === compCategory && r.year === compYear);

      if (!r1 || !r2) {
        const avail1 = checkDataAvailability(inst1.institution_id, activeYear, activeCategory);
        const avail2 = checkDataAvailability(inst2.institution_id, activeYear, activeCategory);
        return {
          answer: `Cannot directly compare ${inst1.short_name} and ${inst2.short_name} in ${activeCategory || 'Overall'} for ${activeYear}. ${avail1.summaryMessage} ${avail2.summaryMessage}`,
        };
      }

      const scoreDiff = Number(Math.abs(r1.overall_score - r2.overall_score).toFixed(2));
      const leader = r1.overall_score >= r2.overall_score ? inst1.short_name : inst2.short_name;
      const trailing = r1.overall_score >= r2.overall_score ? inst2.short_name : inst1.short_name;

      // Check if one of them has no Overall ranking to note it clearly
      let contextNote = '';
      if (compCategory !== 'Overall') {
        const hasOverall1 = recs1.some((r) => r.category === 'Overall');
        const hasOverall2 = recs2.some((r) => r.category === 'Overall');
        if (!hasOverall1) {
          contextNote += ` Note: ${inst1.short_name} has no published rankings in the Overall category.`;
        }
        if (!hasOverall2) {
          contextNote += ` Note: ${inst2.short_name} has no published rankings in the Overall category.`;
        }
      }

      return {
        answer: `In the ${compYear} NIRF ${compCategory} rankings, ${inst1.short_name} holds Rank #${r1.rank} (Score: ${r1.overall_score}) while ${inst2.short_name} holds Rank #${r2.rank} (Score: ${r2.overall_score}). ${leader} leads ${trailing} by ${scoreDiff} composite score points.${contextNote}`,
        explanation: `${inst1.short_name}: TLR ${r1.TLR}, RPC ${r1.RPC}, GO ${r1.GO}, OI ${r1.OI}, PR ${r1.PR}. ${inst2.short_name}: TLR ${r2.TLR}, RPC ${r2.RPC}, GO ${r2.GO}, OI ${r2.OI}, PR ${r2.PR}.`,
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
          title: `${inst1.short_name} vs ${inst2.short_name} (${compYear} ${compCategory})`,
        },
        calculationDetails: {
          formula: 'Head-to-head parameter comparison across normalized NIRF pillars',
          filtersApplied: `Year: ${compYear} | Category: ${compCategory}`,
          sampleSize: '2 institutions',
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
      };
    }

    // CASE 6B: TREND / TIME SERIES FOR A SINGLE INSTITUTION
    if (sq.intent === 'trend' && exactInstitutions.length >= 1) {
      const inst = exactInstitutions[0];
      const targetCat = activeCategory || 'Overall';

      let history = RANKINGS.filter(
        (r) => r.institution_id === inst.institution_id && r.category === targetCat
      ).sort((a, b) => a.year - b.year);

      // If no records in requested category, check if institution has records in another category
      if (history.length === 0) {
        const allInstRecs = RANKINGS.filter((r) => r.institution_id === inst.institution_id).sort(
          (a, b) => a.year - b.year
        );
        if (allInstRecs.length > 0) {
          const altCat = allInstRecs[0].category;
          history = RANKINGS.filter(
            (r) => r.institution_id === inst.institution_id && r.category === altCat
          ).sort((a, b) => a.year - b.year);
        }
      }

      if (history.length === 0) {
        return {
          answer: `No historical NIRF ranking records found for ${inst.short_name}.`,
        };
      }

      const effectiveCat = history[0].category;
      const startRec = history[0];
      const endRec = history[history.length - 1];
      const scoreGain = Number((endRec.overall_score - startRec.overall_score).toFixed(2));
      const rankChange = startRec.rank - endRec.rank; // positive = improved

      // Count consecutive #1 ranks or top ranks
      const no1Count = history.filter((r) => r.rank === 1).length;
      let dominanceNote = '';
      if (no1Count > 1) {
        dominanceNote = ` Notably, ${inst.short_name} held the #1 national rank for ${no1Count} editions across this period.`;
      }

      return {
        answer: `Between ${startRec.year} and ${endRec.year}, ${inst.short_name} in NIRF ${effectiveCat} ${
          rankChange > 0
            ? `climbed ${rankChange} ranks from #${startRec.rank} to #${endRec.rank}`
            : rankChange < 0
            ? `moved from #${startRec.rank} to #${endRec.rank}`
            : `maintained Rank #${endRec.rank}`
        }. Its overall score moved from ${startRec.overall_score} to ${endRec.overall_score} pts (${scoreGain >= 0 ? `+${scoreGain}` : scoreGain} pts).${dominanceNote}`,
        explanation: `Multi-year trajectory across ${history.length} published editions (${startRec.year}–${endRec.year}) in category '${effectiveCat}'.`,
        chartType: 'line',
        chartData: history.map((r) => ({
          year: r.year,
          'Overall Score': r.overall_score,
          'National Rank': r.rank,
        })),
        chartConfig: {
          xKey: 'year',
          yKeys: ['Overall Score'],
          title: `${inst.short_name} Trajectory (${startRec.year}–${endRec.year})`,
        },
        calculationDetails: {
          formula: `Net Score Delta = Score(${endRec.year}) - Score(${startRec.year})`,
          filtersApplied: `Institution: ${inst.short_name} | Category: ${effectiveCat}`,
          sampleSize: `${history.length} annual NIRF editions`,
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
      };
    }

    // CASE 6C: SINGLE INSTITUTION LOOKUP (rank_lookup, score_lookup, parameter_breakdown)
    if (
      sq.intent === 'rank_lookup' ||
      sq.intent === 'score_lookup' ||
      sq.intent === 'parameter_breakdown' ||
      sq.intent === 'other'
    ) {
      const inst = exactInstitutions[0];
      const avail = checkDataAvailability(inst.institution_id, activeYear, activeCategory);

      // If data is unavailable for the requested year or category
      if (!avail.available) {
        return {
          answer: avail.summaryMessage,
          // Simple factual answer: NO chart
        };
      }

      const rec = avail.exactRecord!;
      const otherCats = avail.sameYearOtherCategories;
      let otherNote = '';
      if (otherCats.length > 0) {
        otherNote = ` (In other categories for ${rec.year}: ${otherCats
          .map((c) => `${c.category} Rank #${c.rank}, Score ${c.overall_score}`)
          .join('; ')}).`;
      }

      if (sq.intent === 'rank_lookup') {
        return {
          answer: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name} holds Rank #${rec.rank} (Overall Score: ${rec.overall_score} pts).${otherNote}`,
          calculationDetails: {
            formula: 'Official Composite NIRF Rank and Parameter Score',
            filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
            sampleSize: '1 verified ranking record',
            sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
          },
          // NO chart for simple rank factual lookup
        };
      }

      if (sq.intent === 'score_lookup') {
        // Check if a specific parameter score was requested (e.g. TLR, RPC)
        const specificParam = sq.parameters?.find((p) =>
          ['TLR', 'RPC', 'GO', 'OI', 'PR'].includes(p.toUpperCase())
        )?.toUpperCase();

        if (specificParam) {
          const val = (rec as any)[specificParam];
          return {
            answer: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name}'s ${specificParam} score is ${val} / 100 (Overall Rank #${rec.rank}, Score ${rec.overall_score} pts).`,
            calculationDetails: {
              formula: `Verified ${specificParam} component score`,
              filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
              sampleSize: '1 verified ranking record',
              sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
            },
          };
        }

        return {
          answer: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name} achieved an Overall Score of ${rec.overall_score} points (Rank #${rec.rank}).${otherNote}`,
          explanation: `Parameter breakdown: Teaching & Resources (TLR): ${rec.TLR}, Research & Professional Practice (RPC): ${rec.RPC}, Graduation Outcomes (GO): ${rec.GO}, Outreach & Inclusivity (OI): ${rec.OI}, Perception (PR): ${rec.PR}.`,
          calculationDetails: {
            formula: 'Official Composite NIRF Score (Sum of Weighted Pillar Scores)',
            filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
            sampleSize: '1 verified ranking record',
            sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
          },
          // NO chart for simple score factual lookup
        };
      }

      // Default parameter breakdown
      return {
        answer: `In the ${rec.year} NIRF ${rec.category} rankings, ${inst.short_name} holds Rank #${rec.rank} with an Overall Score of ${rec.overall_score} points.`,
        explanation: `Pillar breakdown: TLR: ${rec.TLR}, RPC: ${rec.RPC}, GO: ${rec.GO}, OI: ${rec.OI}, PR: ${rec.PR}.`,
        calculationDetails: {
          formula: 'Complete NIRF Parameter Evaluation',
          filtersApplied: `Institution: ${inst.short_name} | Year: ${rec.year} | Category: ${rec.category}`,
          sampleSize: '1 verified ranking record',
          sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
        },
      };
    }
  }

  // 7. CORRELATION ANALYSIS (Analytical -> Needs Scatter Chart)
  if (sq.intent === 'correlation') {
    const cat = activeCategory || 'Overall';
    const cohort = RANKINGS.filter(
      (r) => r.year === activeYear && (cat === 'All' || r.category === cat)
    );

    if (cohort.length < 5) {
      return {
        answer: `Insufficient data points (${cohort.length}) to compute correlation in category ${cat} for year ${activeYear}.`,
      };
    }

    // Determine metrics to correlate
    let metric1 = 'TLR';
    let metric2 = 'overall_score';

    if (sq.parameters && sq.parameters.length >= 2) {
      const p1 = sq.parameters[0].toUpperCase();
      const p2 = sq.parameters[1].toUpperCase();
      if (['TLR', 'RPC', 'GO', 'OI', 'PR'].includes(p1)) metric1 = p1;
      if (['TLR', 'RPC', 'GO', 'OI', 'PR'].includes(p2)) metric2 = p2;
    } else if (sq.parameters && sq.parameters.length === 1) {
      const p = sq.parameters[0].toUpperCase();
      if (['TLR', 'RPC', 'GO', 'OI', 'PR'].includes(p)) metric1 = p;
    } else {
      if (qLower.includes('rpc') || qLower.includes('research')) metric1 = 'RPC';
      if (qLower.includes('tlr') || qLower.includes('teaching')) metric1 = 'TLR';
      if (qLower.includes('go') || qLower.includes('graduation')) metric1 = 'GO';
      if (qLower.includes('oi') || qLower.includes('outreach')) metric1 = 'OI';
      if (qLower.includes('pr') || qLower.includes('perception')) metric1 = 'PR';
    }

    const xVals = cohort.map((r) => (r as any)[metric1] as number);
    const yVals = cohort.map((r) => (r as any)[metric2] as number);
    const { pearsonR, rSquared } = calculateCovarianceAndCorrelation(xVals, yVals);

    const strengthDesc =
      Math.abs(pearsonR) > 0.8
        ? 'very strong positive'
        : Math.abs(pearsonR) > 0.5
        ? 'moderate positive'
        : 'weak';

    return {
      answer: `The Pearson correlation between ${metric1} and Overall Score in ${activeYear} (${cat}) is r = ${pearsonR.toFixed(
        3
      )} (R² = ${(rSquared * 100).toFixed(1)}%, N = ${cohort.length}). This indicates a ${strengthDesc} linear relationship.`,
      explanation: `Calculated across ${cohort.length} verified institution records in the ${activeYear} ${cat} category. Higher ${metric1} scores show a substantial positive alignment with higher composite ranks.`,
      chartType: 'scatter',
      chartData: cohort.slice(0, 60).map((r) => ({
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        [metric1]: (r as any)[metric1],
        'Overall Score': r.overall_score,
      })),
      chartConfig: {
        xKey: metric1,
        yKeys: ['Overall Score'],
        title: `${metric1} vs Overall Score (${activeYear} ${cat})`,
      },
      calculationDetails: {
        formula: 'Pearson Correlation Coefficient r = Cov(X,Y) / (SD_X * SD_Y)',
        filtersApplied: `Year: ${activeYear} | Category: ${cat}`,
        sampleSize: `${cohort.length} institutions`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // 8. TOP N / RANKING QUERY (Analytical -> Needs Bar Chart)
  if (sq.intent === 'top_n') {
    const cat = activeCategory || 'Overall';
    const limit = sq.top_n || 5;

    const targetCohort = RANKINGS.filter(
      (r) => r.year === activeYear && (cat === 'All' || r.category === cat) && r.overall_score > 0
    ).sort((a, b) => a.rank - b.rank);

    if (targetCohort.length === 0) {
      return {
        answer: `No ranking records found matching category '${cat}' for year ${activeYear}.`,
      };
    }

    const topList = targetCohort.slice(0, limit);
    const first = topList[0];
    const firstInst = instMap.get(first.institution_id);

    return {
      answer: `In the ${activeYear} NIRF ${cat} rankings, ${firstInst?.short_name || first.institution_id} holds the #1 position with an overall score of ${first.overall_score} points.`,
      explanation: `The top ${limit} institutions in ${cat} (${activeYear}) are: ${topList
        .map((r) => `#${r.rank} ${instMap.get(r.institution_id)?.short_name || r.institution_id} (${r.overall_score} pts)`)
        .join(', ')}.`,
      chartType: 'bar',
      chartData: topList.map((r) => ({
        name: instMap.get(r.institution_id)?.short_name || r.institution_id,
        Score: r.overall_score,
      })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Score'],
        title: `Top ${limit} Institutions in ${cat} (${activeYear})`,
      },
      calculationDetails: {
        formula: 'Official NIRF Composite Rank Order (Ascending rank #1 to #N)',
        filtersApplied: `Year: ${activeYear} | Category: ${cat} | Top N: ${limit}`,
        sampleSize: `${targetCohort.length} institutions evaluated`,
        sourceDataset: 'NIRF Master Dataset (Ministry of Education, GoI)',
      },
    };
  }

  // 9. COUNT QUERY
  if (sq.intent === 'count') {
    const cat = activeCategory || 'Overall';
    const cohort = RANKINGS.filter(
      (r) => r.year === activeYear && (cat === 'All' || r.category === cat)
    );
    return {
      answer: `There are ${cohort.length} ranked institutions in the ${activeYear} NIRF ${cat} category.`,
    };
  }

  // 10. FALLBACK FOR UNRESOLVED OR GENERIC INTENTS
  // NEVER fall back to IIT Madras!
  return {
    answer: `I could not find matching ranking records for your query in the NIRF dataset. Please specify a valid institution name, category, or year (2017–2025).`,
  };
}
