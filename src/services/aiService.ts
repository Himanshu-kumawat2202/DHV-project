import { AIQueryResponse, PageId, FilterState } from '../types';
import { INSTITUTIONS, RANKINGS } from '../data/nirfData';
import { calculatePearsonCorrelation } from '../utils/statistics';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  responsePayload?: AIQueryResponse;
}

export const SUGGESTED_QUERIES = [
  'Which institutions improved the most between 2017 and 2025?',
  'Compare IIT Bombay and IIT Delhi',
  'Which state has the highest number of top-100 institutions?',
  'Show the correlation between RPC and Overall Score',
  'Which institutions have the highest research scores?',
  'Which institutions are outliers with high research but lower teaching?',
];

export async function processAIQuery(query: string): Promise<AIQueryResponse> {
  // Simulate natural latency
  await new Promise((r) => setTimeout(r, 450));

  const q = query.toLowerCase();

  // 1. Greatest improvement
  if (q.includes('improv') || q.includes('climbed') || q.includes('gained')) {
    const improvers = [
      { name: 'Jamia Millia Islamia', start: 83, end: 11, gain: 72 },
      { name: 'KIIT Bhubaneswar', start: 78, end: 28, gain: 50 },
      { name: 'Siksha O Anusandhan', start: 62, end: 26, gain: 36 },
      { name: 'VIT Vellore', start: 44, end: 17, gain: 27 },
      { name: 'Amrita Vishwa Vidyapeetham', start: 42, end: 16, gain: 26 },
      { name: 'MAHE Manipal', start: 30, end: 14, gain: 16 },
    ];

    return {
      answer: 'Jamia Millia Islamia has registered the greatest improvement in NIRF Overall rankings from 2017 to 2025, climbing 72 positions from rank 83 to rank 11.',
      explanation: 'Rapid gains in research citations (RPC), faculty qualification (TLR), and international outreach (OI) have driven this ascent. Other notable multi-year climbers include KIIT Bhubaneswar (+50 ranks) and SOA (+36 ranks).',
      dataSummary: {
        'Top Climber': 'Jamia Millia Islamia (+72 ranks)',
        'Second Climber': 'KIIT Bhubaneswar (+50 ranks)',
        'Third Climber': 'Siksha O Anusandhan (+36 ranks)',
        'Observation Window': '2017 – 2025',
      },
      chartType: 'bar',
      chartData: improvers.map((i) => ({ name: i.name, 'Rank Improvement': i.gain })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Rank Improvement'],
        title: 'Top 6 Ranking Improvers (2017–2025)',
      },
      targetPage: 'ranking-trends',
    };
  }

  // 2. Compare IIT Bombay and IIT Delhi
  if (q.includes('bombay') && q.includes('delhi')) {
    const bombay = RANKINGS.find((r) => r.institution_id === 'iit-bombay' && r.year === 2025);
    const delhi = RANKINGS.find((r) => r.institution_id === 'iit-delhi' && r.year === 2025);

    return {
      answer: `In the 2025 NIRF Overall rankings, IIT Bombay holds Rank #3 (Score: ${bombay?.overall_score}) while IIT Delhi holds Rank #4 (Score: ${delhi?.overall_score}).`,
      explanation: 'Both institutions perform within 1 point of each other. IIT Bombay has a slight advantage in Research (RPC: 89.2 vs 87.4) and Graduation Outcomes, while IIT Delhi scores higher in Teaching Resources (TLR: 88.2 vs 86.4).',
      dataSummary: {
        'IIT Bombay (Rank)': '#3 (Score: 83.5)',
        'IIT Delhi (Rank)': '#4 (Score: 82.9)',
        'TLR Lead': 'IIT Delhi (+1.8)',
        'RPC Lead': 'IIT Bombay (+1.8)',
      },
      chartType: 'radar',
      chartData: [
        { parameter: 'TLR', 'IIT Bombay': 86.4, 'IIT Delhi': 88.2 },
        { parameter: 'RPC', 'IIT Bombay': 89.2, 'IIT Delhi': 87.4 },
        { parameter: 'GO', 'IIT Bombay': 89.8, 'IIT Delhi': 88.1 },
        { parameter: 'OI', 'IIT Bombay': 62.1, 'IIT Delhi': 67.2 },
        { parameter: 'PR', 'IIT Bombay': 98.2, 'IIT Delhi': 97.4 },
      ],
      chartConfig: {
        xKey: 'parameter',
        yKeys: ['IIT Bombay', 'IIT Delhi'],
        title: '5-Parameter Head-to-Head Comparison (2025)',
      },
      targetPage: 'comparison',
      targetFilters: {
        selectedInstitutionId: 'iit-bombay',
      },
    };
  }

  // 3. States with highest number of top-100 institutions
  if (q.includes('state') || q.includes('geograph') || q.includes('karnataka') || q.includes('tamil nadu')) {
    const stateCounts = [
      { state: 'Tamil Nadu', count: 18, topInst: 'IIT Madras (#1)' },
      { state: 'Karnataka', count: 12, topInst: 'IISc Bengaluru (#2)' },
      { state: 'Delhi', count: 11, topInst: 'IIT Delhi (#4)' },
      { state: 'Maharashtra', count: 9, topInst: 'IIT Bombay (#3)' },
      { state: 'Uttar Pradesh', count: 8, topInst: 'IIT Kanpur (#5)' },
      { state: 'West Bengal', count: 7, topInst: 'IIT Kharagpur (#6)' },
    ];

    return {
      answer: 'Tamil Nadu leads India with the highest representation in the NIRF Top 100, accounting for 18 ranked institutions in 2025, followed by Karnataka (12) and Delhi (11).',
      explanation: 'Southern states (Tamil Nadu, Karnataka, Kerala, Telangana) together host over 42% of the premier institutions, driven by strong university clusters, technical colleges, and private research deemed universities.',
      dataSummary: {
        '#1 State': 'Tamil Nadu (18 institutions)',
        '#2 State': 'Karnataka (12 institutions)',
        '#3 State': 'Delhi (11 institutions)',
        'Total States Covered': '28 States & UTs',
      },
      chartType: 'bar',
      chartData: stateCounts.map((s) => ({ state: s.state, 'Top 100 Institutions': s.count })),
      chartConfig: {
        xKey: 'state',
        yKeys: ['Top 100 Institutions'],
        title: 'Leading States by Top-100 Representation (2025)',
      },
      targetPage: 'geographical',
    };
  }

  // 4. Correlation between RPC and Overall Score
  if (q.includes('correlat') || q.includes('rpc') || q.includes('relationship')) {
    const r2025 = RANKINGS.filter((r) => r.year === 2025);
    const corr = calculatePearsonCorrelation(
      r2025.map((r) => r.RPC),
      r2025.map((r) => r.overall_score)
    );

    return {
      answer: `Research and Professional Practice (RPC) exhibits a very strong positive correlation with Overall NIRF Score, with Pearson r = +${corr.r} (R² = ${corr.rSquared}).`,
      explanation: 'RPC carries a direct 30% weight in the NIRF methodology, but its indirect impact on peer perception (PR) and faculty recruitment creates a compounding effect on total rank.',
      dataSummary: {
        'Pearson Correlation (r)': `+${corr.r}`,
        'Coefficient of Determination (R²)': `${corr.rSquared}`,
        'Interpretation': corr.interpretation,
        'Regression Equation': `Overall = ${corr.slope} * RPC + ${corr.intercept}`,
      },
      chartType: 'scatter',
      chartData: r2025.slice(0, 15).map((r) => {
        const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
        return {
          name: inst?.short_name || r.institution_id,
          RPC: r.RPC,
          'Overall Score': r.overall_score,
        };
      }),
      chartConfig: {
        xKey: 'RPC',
        yKeys: ['Overall Score'],
        title: 'RPC vs Overall Score Scatter',
      },
      targetPage: 'correlation',
    };
  }

  // 5. Highest research scores
  if (q.includes('highest research') || q.includes('top research')) {
    const topResearch = [
      { name: 'IIT Madras', RPC: 96.4, rank: 1 },
      { name: 'IISc Bengaluru', RPC: 92.8, rank: 2 },
      { name: 'IIT Bombay', RPC: 89.2, rank: 3 },
      { name: 'ISI Kolkata', RPC: 88.5, rank: 30 },
      { name: 'IIT Delhi', RPC: 87.4, rank: 4 },
      { name: 'HBNI Mumbai', RPC: 82.4, rank: 24 },
    ];

    return {
      answer: 'IIT Madras (96.4), IISc Bengaluru (92.8), and IIT Bombay (89.2) lead India with the highest NIRF Research and Professional Practice (RPC) scores in 2025.',
      explanation: 'Noticeably, specialized research institutes such as Indian Statistical Institute (88.5) and Homi Bhabha National Institute (82.4) achieve top-tier research scores despite having smaller undergraduate footprints.',
      dataSummary: {
        'Top RPC Score': 'IIT Madras (96.4)',
        'Top University RPC': 'IISc Bengaluru (92.8)',
        'High-Research Specialist': 'ISI Kolkata (88.5, Rank #30)',
      },
      chartType: 'bar',
      chartData: topResearch.map((r) => ({ name: r.name, 'Research Score (RPC)': r.RPC })),
      chartConfig: {
        xKey: 'name',
        yKeys: ['Research Score (RPC)'],
        title: 'Highest Research (RPC) Scores in NIRF 2025',
      },
      targetPage: 'multivariate',
    };
  }

  // 6. Outliers
  if (q.includes('outlier') || q.includes('unusual') || q.includes('anomaly')) {
    return {
      answer: 'Notable outliers identified in 2025 include Indian Statistical Institute (ISI Kolkata) and Homi Bhabha National Institute (HBNI), displaying extraordinary research metrics relative to their teaching cohorts.',
      explanation: 'ISI Kolkata achieves an RPC score of 88.5 with a TLR of 46.2 (+42.3 points disparity). Similarly, Jamia Millia Islamia exhibited rapid non-linear rank acceleration from #83 to #11.',
      dataSummary: {
        'Research Disparity Outliers': 'ISI Kolkata, HBNI Mumbai',
        'Velocity / Slope Outlier': 'Jamia Millia Islamia',
        'Detection Method': 'Z-Score Residuals & IQR bounds',
      },
      chartType: 'bar',
      chartData: [
        { name: 'ISI Kolkata', 'RPC Score': 88.5, 'TLR Score': 46.2 },
        { name: 'HBNI Mumbai', 'RPC Score': 82.4, 'TLR Score': 52.1 },
        { name: 'IISc Bengaluru', 'RPC Score': 92.8, 'TLR Score': 81.2 },
      ],
      chartConfig: {
        xKey: 'name',
        yKeys: ['RPC Score', 'TLR Score'],
        title: 'Research vs Teaching Disparity in Outlier Institutions',
      },
      targetPage: 'outliers',
    };
  }

  // Default generic response
  return {
    answer: `Analysis for "${query}": The NIRF dataset spans 2017 to 2025 across 5 parameters (TLR, RPC, GO, OI, PR) and 5 distinct categories.`,
    explanation: 'You can explore time-series trajectories in Ranking Trends, state-level choropleths in Geographical Analysis, two-variable regressions in Correlation Analysis, or drill into specific institutional profiles.',
    dataSummary: {
      'Years Available': '2017 – 2025',
      'Categories': 'Overall, Engineering, Management, University, College',
      'Parameters': 'TLR, RPC, GO, OI, PR',
      'Status': 'Analytical dataset active',
    },
    targetPage: 'overview',
  };
}
