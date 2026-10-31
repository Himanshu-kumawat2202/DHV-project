import {
  Institution,
  RankingRecord,
  CategoryType,
  ParameterKey,
  FilterState,
  StatSummary,
  TransitionItem,
  OutlierItem,
} from '../types';
import { INSTITUTIONS, RANKINGS } from '../data/nirfData';
import {
  calculateStatsSummary,
  calculatePearsonCorrelation,
  calculateRankMovement,
  getRankBand,
  calculateZScore,
} from '../utils/statistics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  isPrototype: boolean;
}

export const apiService = {
  getInstitutions: async (category?: CategoryType | 'All', state?: string): Promise<ApiResponse<Institution[]>> => {
    let result = [...INSTITUTIONS];
    if (category && category !== 'All') {
      result = result.filter((i) => i.category === category);
    }
    if (state && state !== 'All') {
      result = result.filter((i) => i.state.toLowerCase() === state.toLowerCase());
    }
    return {
      success: true,
      data: result,
      isPrototype: !import.meta.env.VITE_API_BASE_URL,
    };
  },

  getRankings: async (filters: Partial<FilterState>): Promise<ApiResponse<RankingRecord[]>> => {
    let records = [...RANKINGS];

    if (filters.year) {
      records = records.filter((r) => r.year === filters.year);
    }
    if (filters.category && filters.category !== 'All') {
      records = records.filter((r) => r.category === filters.category);
    }
    if (filters.selectedInstitutionId) {
      records = records.filter((r) => r.institution_id === filters.selectedInstitutionId);
    }

    return {
      success: true,
      data: records,
      isPrototype: !import.meta.env.VITE_API_BASE_URL,
    };
  },

  getInstitutionById: async (id: string): Promise<ApiResponse<{ institution: Institution; rankings: RankingRecord[] } | null>> => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === id);
    if (!inst) {
      return { success: false, data: null, message: 'Institution not found', isPrototype: true };
    }
    const historical = RANKINGS.filter((r) => r.institution_id === id).sort((a, b) => a.year - b.year);
    return {
      success: true,
      data: {
        institution: inst,
        rankings: historical,
      },
      isPrototype: true,
    };
  },

  getYearlyAverages: async (category?: CategoryType | 'All'): Promise<ApiResponse<{ year: number; avgScore: number; avgTLR: number; avgRPC: number; avgGO: number; avgOI: number; avgPR: number; count: number }[]>> => {
    const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const averages = years.map((yr) => {
      let filtered = RANKINGS.filter((r) => r.year === yr);
      if (category && category !== 'All') {
        filtered = filtered.filter((r) => r.category === category);
      }
      const count = filtered.length || 1;
      return {
        year: yr,
        avgScore: Number((filtered.reduce((acc, r) => acc + r.overall_score, 0) / count).toFixed(2)),
        avgTLR: Number((filtered.reduce((acc, r) => acc + r.TLR, 0) / count).toFixed(2)),
        avgRPC: Number((filtered.reduce((acc, r) => acc + r.RPC, 0) / count).toFixed(2)),
        avgGO: Number((filtered.reduce((acc, r) => acc + r.GO, 0) / count).toFixed(2)),
        avgOI: Number((filtered.reduce((acc, r) => acc + r.OI, 0) / count).toFixed(2)),
        avgPR: Number((filtered.reduce((acc, r) => acc + r.PR, 0) / count).toFixed(2)),
        count: filtered.length,
      };
    });

    return {
      success: true,
      data: averages,
      isPrototype: true,
    };
  },

  getGeographicalStats: async (year: number = 2025, category: CategoryType | 'All' = 'Overall', rankLimit: number = 100) => {
    let yearRecords = RANKINGS.filter((r) => r.year === year && r.rank <= rankLimit);
    if (category !== 'All') {
      yearRecords = yearRecords.filter((r) => r.category === category);
    }

    const stateMap = new Map<string, { count: number; institutions: { name: string; rank: number; score: number }[]; totalScore: number }>();

    yearRecords.forEach((rec) => {
      const inst = INSTITUTIONS.find((i) => i.institution_id === rec.institution_id);
      if (!inst) return;
      const existing = stateMap.get(inst.state) || { count: 0, institutions: [], totalScore: 0 };
      existing.count += 1;
      existing.totalScore += rec.overall_score;
      existing.institutions.push({
        name: inst.short_name,
        rank: rec.rank,
        score: rec.overall_score,
      });
      stateMap.set(inst.state, existing);
    });

    const stateStats = Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      count: data.count,
      avgScore: Number((data.totalScore / data.count).toFixed(2)),
      topInstitution: data.institutions.sort((a, b) => a.rank - b.rank)[0],
      institutions: data.institutions,
    })).sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: stateStats,
      isPrototype: true,
    };
  },

  getScoreDistributionStats: async (year: number, category: CategoryType | 'All') => {
    let records = RANKINGS.filter((r) => r.year === year);
    if (category !== 'All') {
      records = records.filter((r) => r.category === category);
    }
    const scores = records.map((r) => r.overall_score);
    const summary = calculateStatsSummary(scores);

    // Histogram bins (e.g. 40-50, 50-60, 60-70, 70-80, 80-90, 90-100)
    const bins = [
      { range: '40–50', min: 40, max: 50, count: 0 },
      { range: '50–60', min: 50, max: 60, count: 0 },
      { range: '60–70', min: 60, max: 70, count: 0 },
      { range: '70–80', min: 70, max: 80, count: 0 },
      { range: '80–90', min: 80, max: 90, count: 0 },
      { range: '90–100', min: 90, max: 100, count: 0 },
    ];

    scores.forEach((s) => {
      const b = bins.find((bin) => s >= bin.min && s < bin.max) || (s >= 90 ? bins[5] : bins[0]);
      if (b) b.count += 1;
    });

    return {
      success: true,
      data: {
        summary,
        bins,
        total: scores.length,
      },
      isPrototype: true,
    };
  },

  getTransitions: async (startYear: number, endYear: number, category: CategoryType | 'All' = 'Overall'): Promise<ApiResponse<TransitionItem[]>> => {
    const items: TransitionItem[] = [];

    const insts = category === 'All' ? INSTITUTIONS : INSTITUTIONS.filter((i) => i.category === category);

    insts.forEach((inst) => {
      const recStart = RANKINGS.find((r) => r.institution_id === inst.institution_id && r.year === startYear && (category === 'All' || r.category === category));
      const recEnd = RANKINGS.find((r) => r.institution_id === inst.institution_id && r.year === endYear && (category === 'All' || r.category === category));

      const startRank = recStart ? recStart.rank : null;
      const endRank = recEnd ? recEnd.rank : null;

      if (!startRank && !endRank) return;

      const startBand = getRankBand(startRank);
      const endBand = getRankBand(endRank);

      let status: TransitionItem['status'] = 'retained';
      let rankChange: number | null = null;

      if (startRank === null && endRank !== null) {
        status = 'new_entrant';
      } else if (startRank !== null && endRank === null) {
        status = 'exited';
      } else if (startRank !== null && endRank !== null) {
        const move = calculateRankMovement(startRank, endRank);
        status = move.direction === 'improved' ? 'improved' : move.direction === 'declined' ? 'declined' : 'retained';
        rankChange = move.delta;
      }

      items.push({
        institution_id: inst.institution_id,
        name: inst.short_name,
        state: inst.state,
        startRank,
        endRank,
        startBand,
        endBand,
        rankChange,
        status,
      });
    });

    return {
      success: true,
      data: items,
      isPrototype: true,
    };
  },

  getOutliers: async (year: number = 2025, thresholdZ: number = 1.5): Promise<ApiResponse<OutlierItem[]>> => {
    const records = RANKINGS.filter((r) => r.year === year);
    const outliers: OutlierItem[] = [];

    // 1. High Research (RPC) relative to Overall score
    const rpcScores = records.map((r) => r.RPC);
    const overallScores = records.map((r) => r.overall_score);
    const { slope, intercept } = calculatePearsonCorrelation(overallScores, rpcScores);

    // Compute residuals for RPC = slope * overall + intercept
    const residuals = records.map((r) => {
      const expected = slope * r.overall_score + intercept;
      return { r, expected, residual: r.RPC - expected };
    });

    const residualValues = residuals.map((x) => x.residual);
    const resSummary = calculateStatsSummary(residualValues);

    residuals.forEach(({ r, expected, residual }) => {
      const zScore = calculateZScore(residual, resSummary.mean, resSummary.stdDev);
      if (Math.abs(zScore) >= thresholdZ) {
        const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
        if (!inst) return;
        outliers.push({
          institution: inst,
          ranking: r,
          metricName: 'RPC vs Expected (Regression Residual)',
          metricValue: r.RPC,
          expectedValue: Number(expected.toFixed(1)),
          residual: Number(residual.toFixed(1)),
          zScore,
          reason: zScore > 0
            ? `Significantly higher research output (${r.RPC}) than typical institutions with score ${r.overall_score}.`
            : `Research output (${r.RPC}) is substantially lower than expected for overall score ${r.overall_score}.`,
          severity: Math.abs(zScore) > 2 ? 'high' : 'medium',
        });
      }
    });

    // 2. High RPC vs low TLR disparity (RPC - TLR > 25)
    records.forEach((r) => {
      const diff = r.RPC - r.TLR;
      if (diff > 25) {
        const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
        if (!inst || outliers.some((o) => o.institution.institution_id === inst.institution_id && o.metricName.includes('Disparity'))) return;
        outliers.push({
          institution: inst,
          ranking: r,
          metricName: 'Research vs Teaching Disparity',
          metricValue: diff,
          expectedValue: 0,
          residual: diff,
          zScore: 2.2,
          reason: `High Research (RPC ${r.RPC}) combined with significantly lower Teaching Resources (TLR ${r.TLR}) (Gap: +${diff.toFixed(1)} points).`,
          severity: 'high',
        });
      }
    });

    return {
      success: true,
      data: outliers,
      isPrototype: true,
    };
  },
};
