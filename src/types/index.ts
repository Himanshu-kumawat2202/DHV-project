export type CategoryType = 'Overall' | 'Engineering' | 'Management' | 'University' | 'College';

export type ParameterKey = 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR';

export interface ParameterScores {
  TLR: number; // Teaching, Learning & Resources (max 100)
  RPC: number; // Research and Professional Practice (max 100)
  GO: number;  // Graduation Outcomes (max 100)
  OI: number;  // Outreach and Inclusivity (max 100)
  PR: number;  // Perception (max 100)
}

export interface RankingRecord {
  institution_id: string;
  year: number;
  category: CategoryType;
  rank: number;
  overall_score: number;
  TLR: number;
  RPC: number;
  GO: number;
  OI: number;
  PR: number;
}

export interface Institution {
  institution_id: string;
  institution_name: string;
  short_name: string;
  state: string;
  city: string;
  category: CategoryType;
  established_year: number;
  type: 'Public' | 'Private' | 'Institute of National Importance';
  website: string;
}

export interface FilterState {
  year: number;
  category: CategoryType | 'All';
  state: string;
  selectedInstitutionId: string;
  parameter: ParameterKey | 'Overall';
  searchQuery: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Researcher' | 'Faculty' | 'Administrator';
  avatar?: string;
  savedComparisons: SavedComparison[];
  savedAnalyses: SavedAnalysis[];
}

export interface SavedComparison {
  id: string;
  name: string;
  institutionIds: string[];
  category: CategoryType;
  year: number;
  createdAt: string;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  pageId: string;
  filterSummary: string;
  notes: string;
  createdAt: string;
}

export type PageId =
  | 'overview'
  | 'ranking-trends'
  | 'geographical'
  | 'score-distribution'
  | 'comparison'
  | 'correlation'
  | 'multivariate'
  | 'dist-stats'
  | 'transitions'
  | 'outliers'
  | 'explore'
  | 'dynamic-features'
  | 'ai-assistant';

export interface StatSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
}

export interface OutlierItem {
  institution: Institution;
  ranking: RankingRecord;
  metricName: string;
  metricValue: number;
  expectedValue: number;
  residual: number;
  zScore: number;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TransitionItem {
  institution_id: string;
  name: string;
  state: string;
  startRank: number | null;
  endRank: number | null;
  startBand: string;
  endBand: string;
  rankChange: number | null; // positive = improved (e.g. from 15 to 8 is +7)
  status: 'improved' | 'declined' | 'retained' | 'new_entrant' | 'exited';
}

export interface CalculationDetails {
  formula: string;
  filtersApplied: string;
  sampleSize: string;
  sourceDataset: string;
}

export interface AIQueryResponse {
  answer: string;
  explanation?: string;
  dataSummary?: Record<string, any>;
  chartType?: 'bar' | 'line' | 'scatter' | 'radar';
  chartData?: any[];
  chartConfig?: {
    xKey: string;
    yKeys: string[];
    title: string;
  };
  calculationDetails?: CalculationDetails;
  isOutOfScope?: boolean;
  isDatasetQuery?: boolean;
  isError?: boolean;
  targetPage?: PageId;
  targetFilters?: Partial<FilterState>;
}
