/**
 * Statistical utility functions for NIRF Insights
 */

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(2));
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
  return Number(sorted[mid].toFixed(2));
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = calculateMean(values);
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    (values.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

export function calculateQuartiles(values: number[]): {
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
} {
  if (values.length === 0) {
    return { q1: 0, q2: 0, q3: 0, iqr: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q2 = calculateMedian(sorted);

  const mid = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf =
    sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  const q1 = calculateMedian(lowerHalf);
  const q3 = calculateMedian(upperHalf);
  const iqr = Number((q3 - q1).toFixed(2));

  return { q1, q2, q3, iqr };
}

export function calculateStatsSummary(values: number[]): {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
} {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      count: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = Number(sorted[0].toFixed(2));
  const max = Number(sorted[sorted.length - 1].toFixed(2));
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  const { q1, q2: median, q3, iqr } = calculateQuartiles(values);

  return {
    mean,
    median,
    min,
    max,
    stdDev,
    q1,
    q3,
    iqr,
    count: values.length,
  };
}

/**
 * Calculates Pearson Correlation Coefficient between two series
 */
export function calculatePearsonCorrelation(
  x: number[],
  y: number[]
): {
  r: number;
  rSquared: number;
  interpretation: string;
  slope: number;
  intercept: number;
} {
  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return {
      r: 0,
      rSquared: 0,
      interpretation: 'Insufficient data',
      slope: 0,
      intercept: 0,
    };
  }

  const validPairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i])) {
      validPairs.push([x[i], y[i]]);
    }
  }

  const count = validPairs.length;
  if (count < 2) {
    return {
      r: 0,
      rSquared: 0,
      interpretation: 'Insufficient data',
      slope: 0,
      intercept: 0,
    };
  }

  const xVals = validPairs.map((p) => p[0]);
  const yVals = validPairs.map((p) => p[1]);

  const xMean = xVals.reduce((a, b) => a + b, 0) / count;
  const yMean = yVals.reduce((a, b) => a + b, 0) / count;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < count; i++) {
    const dx = xVals[i] - xMean;
    const dy = yVals[i] - yMean;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) {
    return {
      r: 0,
      rSquared: 0,
      interpretation: 'No variance in one variable',
      slope: 0,
      intercept: yMean,
    };
  }

  const r = Number((numerator / Math.sqrt(denomX * denomY)).toFixed(3));
  const rSquared = Number(Math.pow(r, 2).toFixed(3));
  const slope = Number((numerator / denomX).toFixed(3));
  const intercept = Number((yMean - slope * xMean).toFixed(3));

  let interpretation = 'Weak';
  const absR = Math.abs(r);
  if (absR >= 0.8) {
    interpretation = r > 0 ? 'Very Strong Positive' : 'Very Strong Negative';
  } else if (absR >= 0.6) {
    interpretation = r > 0 ? 'Strong Positive' : 'Strong Negative';
  } else if (absR >= 0.4) {
    interpretation = r > 0 ? 'Moderate Positive' : 'Moderate Negative';
  } else if (absR >= 0.2) {
    interpretation = r > 0 ? 'Weak Positive' : 'Weak Negative';
  } else {
    interpretation = 'Negligible or No Linear Association';
  }

  return { r, rSquared, interpretation, slope, intercept };
}

/**
 * NIRF Rank movement calculation:
 * Rank 1 is better than Rank 10!
 * If previousRank is 15 and currentRank is 8, rank improvement = 15 - 8 = +7 ranks.
 * If previousRank is 5 and currentRank is 12, rank improvement = 5 - 12 = -7 ranks (decline).
 */
export function calculateRankMovement(
  previousRank: number | null,
  currentRank: number | null
): {
  delta: number | null;
  direction: 'improved' | 'declined' | 'retained' | 'unranked';
  description: string;
} {
  if (previousRank === null || currentRank === null) {
    return {
      delta: null,
      direction: 'unranked',
      description: 'Data not available for one of the years',
    };
  }

  const delta = previousRank - currentRank; // Positive = climbed up
  if (delta > 0) {
    return {
      delta,
      direction: 'improved',
      description: `Climbed ${delta} ${delta === 1 ? 'rank' : 'ranks'} (from #${previousRank} to #${currentRank})`,
    };
  } else if (delta < 0) {
    return {
      delta,
      direction: 'declined',
      description: `Dropped ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'rank' : 'ranks'} (from #${previousRank} to #${currentRank})`,
    };
  } else {
    return {
      delta: 0,
      direction: 'retained',
      description: `Maintained position at #${currentRank}`,
    };
  }
}

/**
 * Assigns a rank band based on rank number
 */
export function getRankBand(
  rank: number | null,
  bands: { min: number; max: number; label: string }[] = [
    { min: 1, max: 10, label: '1–10' },
    { min: 11, max: 50, label: '11–50' },
    { min: 51, max: 100, label: '51–100' },
    { min: 101, max: 200, label: '101–200' },
  ]
): string {
  if (rank === null) return 'Unranked';
  for (const band of bands) {
    if (rank >= band.min && rank <= band.max) {
      return band.label;
    }
  }
  return '201+';
}

/**
 * Z-score calculation
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return Number(((value - mean) / stdDev).toFixed(2));
}
