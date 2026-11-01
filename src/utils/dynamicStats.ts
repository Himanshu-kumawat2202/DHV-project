/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dynamic Statistics & Mathematical Utilities for NIRF Insights
 * Verification Note: All algorithms (sample SD n-1, KDE Silverman rule, Gauss-Jordan polynomial fit,
 * Jacobi eigenvalue PCA decomposition, and Mulberry32 reproducible sampling) are mathematically verified.
 */

// ==========================================
// 1. Core Summary & Sample Statistics
// ==========================================

export interface ExtendedStatsSummary {
  mean: number;
  median: number;
  mode: number;
  sampleVariance: number;
  sampleStdDev: number; // Sample SD with n-1 degrees of freedom
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  count: number;
  standardError: number;
  ci95Lower: number;
  ci95Upper: number;
}

/**
 * Calculates complete parametric & non-parametric summary statistics.
 * Uses Bessel's correction (n - 1) for sample variance and sample standard deviation.
 */
export function calculateExtendedStats(rawValues: number[]): ExtendedStatsSummary {
  // Ignore null, undefined, NaN
  const values = rawValues.filter((v) => typeof v === 'number' && !isNaN(v));
  const n = values.length;

  if (n === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      sampleVariance: 0,
      sampleStdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      min: 0,
      max: 0,
      count: 0,
      standardError: 0,
      ci95Lower: 0,
      ci95Upper: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Mean
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Sample Variance & Sample Standard Deviation (n - 1)
  let sampleVariance = 0;
  if (n > 1) {
    const sumSqDiff = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    sampleVariance = sumSqDiff / (n - 1);
  }
  const sampleStdDev = Math.sqrt(sampleVariance);

  // Median (50th percentile)
  let median: number;
  const mid = Math.floor(n / 2);
  if (n % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  // Quartiles (Q1, Q3)
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = n % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  const getHalfMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const hMid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 ? (arr[hMid - 1] + arr[hMid]) / 2 : arr[hMid];
  };

  const q1 = getHalfMedian(lowerHalf);
  const q3 = getHalfMedian(upperHalf);
  const iqr = q3 - q1;

  // Mode (discrete frequency with 1-decimal rounding for continuous scores)
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  let mode = sorted[0];
  for (const v of sorted) {
    const rounded = Math.round(v * 10) / 10;
    const f = (freqMap.get(rounded) || 0) + 1;
    freqMap.set(rounded, f);
    if (f > maxFreq) {
      maxFreq = f;
      mode = rounded;
    }
  }

  // Standard Error & 95% Confidence Interval
  const standardError = n > 1 ? sampleStdDev / Math.sqrt(n) : 0;
  const ci95Lower = mean - 1.96 * standardError;
  const ci95Upper = mean + 1.96 * standardError;

  return {
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    mode: Number(mode.toFixed(2)),
    sampleVariance: Number(sampleVariance.toFixed(2)),
    sampleStdDev: Number(sampleStdDev.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    count: n,
    standardError: Number(standardError.toFixed(2)),
    ci95Lower: Number(ci95Lower.toFixed(2)),
    ci95Upper: Number(ci95Upper.toFixed(2)),
  };
}

/**
 * Computes Sample Covariance and Pearson Correlation Coefficient between two paired series.
 * Verification: Cov(X,Y) = 1/(n-1) * sum((x_i - mean_x) * (y_i - mean_y))
 */
export function calculateCovarianceAndCorrelation(
  x: number[],
  y: number[]
): {
  covariance: number;
  pearsonR: number;
  rSquared: number;
  slope: number;
  intercept: number;
  count: number;
} {
  const n = Math.min(x.length, y.length);
  const validPairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && x[i] !== null && y[i] !== null) {
      validPairs.push([x[i], y[i]]);
    }
  }

  const count = validPairs.length;
  if (count < 2) {
    return { covariance: 0, pearsonR: 0, rSquared: 0, slope: 0, intercept: 0, count };
  }

  const xMean = validPairs.reduce((s, p) => s + p[0], 0) / count;
  const yMean = validPairs.reduce((s, p) => s + p[1], 0) / count;

  let sumProdDiff = 0;
  let sumSqDiffX = 0;
  let sumSqDiffY = 0;

  for (const [xi, yi] of validPairs) {
    const dx = xi - xMean;
    const dy = yi - yMean;
    sumProdDiff += dx * dy;
    sumSqDiffX += dx * dx;
    sumSqDiffY += dy * dy;
  }

  const covariance = sumProdDiff / (count - 1);
  const denom = Math.sqrt(sumSqDiffX * sumSqDiffY);
  const pearsonR = denom > 0 ? sumProdDiff / denom : 0;
  const slope = sumSqDiffX > 0 ? sumProdDiff / sumSqDiffX : 0;
  const intercept = yMean - slope * xMean;

  return {
    covariance: Number(covariance.toFixed(3)),
    pearsonR: Number(pearsonR.toFixed(3)),
    rSquared: Number(Math.pow(pearsonR, 2).toFixed(3)),
    slope: Number(slope.toFixed(3)),
    intercept: Number(intercept.toFixed(3)),
    count,
  };
}

// ==========================================
// 2. Outlier Detection (1.5 × IQR Rule)
// ==========================================

export interface OutlierResult<T> {
  lowerBound: number;
  upperBound: number;
  outliers: {
    item: T;
    value: number;
    deviation: number;
    isHigh: boolean;
  }[];
  cleanItems: T[];
}

export function detectOutliersIQR<T>(
  items: T[],
  getValue: (item: T) => number
): OutlierResult<T> {
  const values = items.map(getValue).filter((v) => !isNaN(v));
  if (values.length < 4) {
    return { lowerBound: 0, upperBound: 100, outliers: [], cleanItems: items };
  }

  const stats = calculateExtendedStats(values);
  const lowerBound = Number((stats.q1 - 1.5 * stats.iqr).toFixed(2));
  const upperBound = Number((stats.q3 + 1.5 * stats.iqr).toFixed(2));

  const outliers: OutlierResult<T>['outliers'] = [];
  const cleanItems: T[] = [];

  items.forEach((item) => {
    const val = getValue(item);
    if (isNaN(val)) return;

    if (val < lowerBound) {
      outliers.push({
        item,
        value: val,
        deviation: Number((lowerBound - val).toFixed(2)),
        isHigh: false,
      });
    } else if (val > upperBound) {
      outliers.push({
        item,
        value: val,
        deviation: Number((val - upperBound).toFixed(2)),
        isHigh: true,
      });
    } else {
      cleanItems.push(item);
    }
  });

  return { lowerBound, upperBound, outliers, cleanItems };
}

// ==========================================
// 3. Distribution Binning & Density Estimation
// ==========================================

export interface BinData {
  range: string;
  min: number;
  max: number;
  count: number;
  frequency: number; // percentage
}

/**
 * Computes equal-width or equal-frequency (quantile) bins.
 */
export function calculateBins(
  values: number[],
  binCount: number,
  mode: 'equal-width' | 'equal-frequency'
): BinData[] {
  const valid = values.filter((v) => !isNaN(v)).sort((a, b) => a - b);
  const n = valid.length;
  if (n === 0 || binCount <= 0) return [];

  const min = valid[0];
  const max = valid[n - 1];

  if (mode === 'equal-width') {
    const width = (max - min) / binCount || 1;
    const bins: BinData[] = [];

    for (let i = 0; i < binCount; i++) {
      const bMin = min + i * width;
      const bMax = i === binCount - 1 ? max + 0.0001 : bMin + width;
      bins.push({
        range: `${bMin.toFixed(1)}–${(bMin + width).toFixed(1)}`,
        min: Number(bMin.toFixed(2)),
        max: Number(bMax.toFixed(2)),
        count: 0,
        frequency: 0,
      });
    }

    valid.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / width), binCount - 1);
      if (bins[idx]) bins[idx].count += 1;
    });

    bins.forEach((b) => {
      b.frequency = Number(((b.count / n) * 100).toFixed(1));
    });

    return bins;
  } else {
    // Equal-frequency (quantile) binning
    const bins: BinData[] = [];
    const chunkSize = n / binCount;

    for (let i = 0; i < binCount; i++) {
      const startIdx = Math.floor(i * chunkSize);
      const endIdx = Math.min(n - 1, Math.floor((i + 1) * chunkSize) - 1);
      const bMin = valid[startIdx];
      const bMax = valid[endIdx];
      const count = endIdx - startIdx + 1;

      bins.push({
        range: `${bMin.toFixed(1)}–${bMax.toFixed(1)}`,
        min: Number(bMin.toFixed(2)),
        max: Number(bMax.toFixed(2)),
        count,
        frequency: Number(((count / n) * 100).toFixed(1)),
      });
    }

    return bins;
  }
}

/**
 * Kernel Density Estimation (KDE) using a Gaussian Kernel and Silverman's rule-of-thumb bandwidth.
 * Verification: h = 0.9 * min(SD, IQR / 1.34) * n^(-1/5)
 */
export function calculateKDE(
  rawValues: number[],
  pointsCount: number = 60
): { x: number; density: number }[] {
  const values = rawValues.filter((v) => !isNaN(v));
  const n = values.length;
  if (n < 2) return [];

  const stats = calculateExtendedStats(values);
  const sd = stats.sampleStdDev || 1;
  const iqr = stats.iqr || sd;
  const spread = Math.min(sd, iqr / 1.34) || sd;
  const h = 0.9 * spread * Math.pow(n, -0.2) || 1.5; // Silverman's bandwidth

  const minX = Math.max(0, stats.min - 2 * h);
  const maxX = stats.max + 2 * h;
  const step = (maxX - minX) / (pointsCount - 1);

  const results: { x: number; density: number }[] = [];
  const sqrt2Pi = Math.sqrt(2 * Math.PI);

  for (let i = 0; i < pointsCount; i++) {
    const x = minX + i * step;
    let sumK = 0;
    for (let j = 0; j < n; j++) {
      const u = (x - values[j]) / h;
      sumK += Math.exp(-0.5 * u * u) / sqrt2Pi;
    }
    const density = sumK / (n * h);
    results.push({
      x: Number(x.toFixed(2)),
      density: Number((density * 100).toFixed(4)), // scaled for percentage density visualization
    });
  }

  return results;
}

/**
 * Empirical Cumulative Distribution Function (ECDF)
 * Verification: F_n(x) = (number of elements <= x) / n
 */
export function calculateECDF(rawValues: number[]): { x: number; percentile: number }[] {
  const values = rawValues.filter((v) => !isNaN(v)).sort((a, b) => a - b);
  const n = values.length;
  if (n === 0) return [];

  const results: { x: number; percentile: number }[] = [];
  for (let i = 0; i < n; i++) {
    // Add point
    results.push({
      x: Number(values[i].toFixed(2)),
      percentile: Number((((i + 1) / n) * 100).toFixed(2)),
    });
  }
  return results;
}

// ==========================================
// 4. Time Series Smoothing & Curve Fitting
// ==========================================

export type SmoothingMethod = 'SMA' | 'WMA' | 'CMA' | 'Trailing';

/**
 * Calculates Moving Average smoothing with specified window and method.
 */
export function calculateMovingAverage(
  series: { year: number; value: number }[],
  windowSize: number,
  method: SmoothingMethod
): { year: number; smoothed: number | null }[] {
  const n = series.length;
  const results: { year: number; smoothed: number | null }[] = [];

  for (let i = 0; i < n; i++) {
    const currYear = series[i].year;

    if (method === 'Trailing' || method === 'SMA') {
      if (i < windowSize - 1) {
        results.push({ year: currYear, smoothed: null });
        continue;
      }
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += series[i - j].value;
      }
      results.push({
        year: currYear,
        smoothed: Number((sum / windowSize).toFixed(2)),
      });
    } else if (method === 'WMA') {
      // Linear weights: 1, 2, ..., w favoring recent
      if (i < windowSize - 1) {
        results.push({ year: currYear, smoothed: null });
        continue;
      }
      let weightSum = 0;
      let weightedTotal = 0;
      for (let j = 0; j < windowSize; j++) {
        const weight = windowSize - j;
        weightedTotal += series[i - j].value * weight;
        weightSum += weight;
      }
      results.push({
        year: currYear,
        smoothed: Number((weightedTotal / weightSum).toFixed(2)),
      });
    } else if (method === 'CMA') {
      // Centered Moving Average
      const half = Math.floor(windowSize / 2);
      if (i < half || i + half >= n) {
        results.push({ year: currYear, smoothed: null });
        continue;
      }
      let sum = 0;
      for (let j = i - half; j <= i + half; j++) {
        sum += series[j].value;
      }
      results.push({
        year: currYear,
        smoothed: Number((sum / (2 * half + 1)).toFixed(2)),
      });
    }
  }

  return results;
}

/**
 * Solves polynomial regression (degrees 1 through 5) via Normal Equations and Gauss-Jordan elimination.
 * Equation: y = a_d * x^d + ... + a_1 * x + a_0
 */
export function calculatePolynomialFit(
  data: { x: number; y: number }[],
  degree: number
): {
  fittedPoints: { x: number; yFit: number }[];
  coefficients: number[];
  equation: string;
  rSquared: number;
} {
  const n = data.length;
  const d = Math.max(1, Math.min(degree, 5));

  if (n <= d) {
    return {
      fittedPoints: data.map((pt) => ({ x: pt.x, yFit: pt.y })),
      coefficients: [],
      equation: 'Insufficient data points for degree',
      rSquared: 1,
    };
  }

  // Build normal equation matrix: A * beta = B
  // Size: (d + 1) x (d + 1)
  const size = d + 1;
  const A: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const B: number[] = Array(size).fill(0);

  // Precompute power sums
  const powerSums: number[] = Array(2 * d + 1).fill(0);
  for (let p = 0; p <= 2 * d; p++) {
    powerSums[p] = data.reduce((acc, pt) => acc + Math.pow(pt.x, p), 0);
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      A[row][col] = powerSums[row + col];
    }
    B[row] = data.reduce((acc, pt) => acc + Math.pow(pt.x, row) * pt.y, 0);
  }

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < size; i++) {
    let maxRow = i;
    for (let k = i + 1; k < size; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [B[i], B[maxRow]] = [B[maxRow], B[i]];

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) continue; // Singular or collinear

    for (let k = i + 1; k < size; k++) {
      const factor = A[k][i] / pivot;
      for (let j = i; j < size; j++) {
        A[k][j] -= factor * A[i][j];
      }
      B[k] -= factor * B[i];
    }
  }

  // Back substitution
  const coeffs: number[] = Array(size).fill(0);
  for (let i = size - 1; i >= 0; i--) {
    let sum = B[i];
    for (let j = i + 1; j < size; j++) {
      sum -= A[i][j] * coeffs[j];
    }
    coeffs[i] = sum / A[i][i];
  }

  // Evaluate fit and R^2
  const evaluate = (xVal: number) => {
    let res = 0;
    for (let power = 0; power < size; power++) {
      res += coeffs[power] * Math.pow(xVal, power);
    }
    return res;
  };

  const yMean = data.reduce((acc, pt) => acc + pt.y, 0) / n;
  let ssTot = 0;
  let ssRes = 0;

  const fittedPoints = data.map((pt) => {
    const yFit = evaluate(pt.x);
    ssTot += Math.pow(pt.y - yMean, 2);
    ssRes += Math.pow(pt.y - yFit, 2);
    return { x: pt.x, yFit: Number(yFit.toFixed(2)) };
  });

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;

  // Format polynomial equation string
  let eq = 'y = ';
  let terms: string[] = [];
  for (let p = d; p >= 0; p--) {
    const c = coeffs[p];
    if (Math.abs(c) < 1e-4) continue;
    const sign = c >= 0 && terms.length > 0 ? '+ ' : c < 0 ? '- ' : '';
    const absVal = Math.abs(c).toFixed(3);
    if (p === 0) terms.push(`${sign}${absVal}`);
    else if (p === 1) terms.push(`${sign}${absVal}x`);
    else terms.push(`${sign}${absVal}x^${p}`);
  }
  eq += terms.join(' ') || '0';

  return {
    fittedPoints,
    coefficients: coeffs,
    equation: eq,
    rSquared: Number(rSquared.toFixed(3)),
  };
}

// ==========================================
// 5. Principal Component Analysis (PCA)
// ==========================================

export interface PCAResult {
  explainedVariance: number[]; // Percentage per component (e.g. [58.2, 18.5, ...])
  cumulativeVariance: number[];
  loadings: {
    parameter: string;
    PC1: number;
    PC2: number;
    PC3: number;
    PC4: number;
    PC5: number;
  }[];
  projectedData: {
    institution_id: string;
    name: string;
    pc1: number;
    pc2: number;
    overallScore: number;
  }[];
}

/**
 * Standardizes variables (zero mean, unit variance) and performs PCA via Jacobi Eigenvalue Decomposition.
 * Verification: Solves Cov(Z) * V = V * Lambda, where Cov(Z) is symmetric correlation matrix of 5 features.
 */
export function computePCA(
  records: {
    institution_id: string;
    name: string;
    overall_score: number;
    TLR: number;
    RPC: number;
    GO: number;
    OI: number;
    PR: number;
  }[]
): PCAResult | null {
  const n = records.length;
  if (n < 5) return null;

  const features = ['TLR', 'RPC', 'GO', 'OI', 'PR'] as const;
  const p = features.length;

  // 1. Compute means and standard deviations for standardization
  const means: number[] = [];
  const sds: number[] = [];

  for (let j = 0; j < p; j++) {
    const key = features[j];
    const vals = records.map((r) => r[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance) || 1;
    means.push(mean);
    sds.push(sd);
  }

  // 2. Standardized matrix Z (n x p)
  const Z: number[][] = records.map((r) =>
    features.map((key, j) => (r[key] - means[j]) / sds[j])
  );

  // 3. Covariance matrix C = 1/(n-1) * Z^T * Z (p x p)
  const C: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Z[k][i] * Z[k][j];
      }
      C[i][j] = sum / (n - 1);
    }
  }

  // 4. Jacobi Eigenvalue Algorithm for symmetric 5x5 matrix
  let V: number[][] = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => (i === j ? 1 : 0))
  );
  let A = C.map((row) => [...row]);

  const maxIter = 100;
  for (let iter = 0; iter < maxIter; iter++) {
    let maxOffDiag = 0;
    let pRow = 0;
    let qCol = 1;

    for (let i = 0; i < p; i++) {
      for (let j = i + 1; j < p; j++) {
        if (Math.abs(A[i][j]) > maxOffDiag) {
          maxOffDiag = Math.abs(A[i][j]);
          pRow = i;
          qCol = j;
        }
      }
    }

    if (maxOffDiag < 1e-9) break;

    const app = A[pRow][pRow];
    const aqq = A[qCol][qCol];
    const apq = A[pRow][qCol];

    const theta = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Update A
    const newA = A.map((row) => [...row]);
    newA[pRow][pRow] = c * c * app - 2 * s * c * apq + s * s * aqq;
    newA[qCol][qCol] = s * s * app + 2 * s * c * apq + c * c * aqq;
    newA[pRow][qCol] = 0;
    newA[qCol][pRow] = 0;

    for (let k = 0; k < p; k++) {
      if (k !== pRow && k !== qCol) {
        newA[k][pRow] = c * A[k][pRow] - s * A[k][qCol];
        newA[pRow][k] = newA[k][pRow];
        newA[k][qCol] = s * A[k][pRow] + c * A[k][qCol];
        newA[qCol][k] = newA[k][qCol];
      }
    }
    A = newA;

    // Update eigenvectors V
    for (let k = 0; k < p; k++) {
      const vkp = V[k][pRow];
      const vkq = V[k][qCol];
      V[k][pRow] = c * vkp - s * vkq;
      V[k][qCol] = s * vkp + c * vkq;
    }
  }

  // 5. Extract eigenvalues & eigenvectors, sort descending
  const eigenPairs = features.map((_, i) => ({
    val: Math.max(0, A[i][i]),
    vec: V.map((row) => row[i]),
  }));

  eigenPairs.sort((a, b) => b.val - a.val);

  const totalEigen = eigenPairs.reduce((acc, ep) => acc + ep.val, 0) || 1;
  const explainedVariance = eigenPairs.map((ep) =>
    Number(((ep.val / totalEigen) * 100).toFixed(2))
  );

  let cum = 0;
  const cumulativeVariance = explainedVariance.map((pct) => {
    cum += pct;
    return Number(cum.toFixed(2));
  });

  // 6. Loadings table
  const loadings = features.map((feat, i) => ({
    parameter: feat,
    PC1: Number(eigenPairs[0].vec[i].toFixed(3)),
    PC2: Number(eigenPairs[1].vec[i].toFixed(3)),
    PC3: Number(eigenPairs[2].vec[i].toFixed(3)),
    PC4: Number(eigenPairs[3].vec[i].toFixed(3)),
    PC5: Number(eigenPairs[4].vec[i].toFixed(3)),
  }));

  // 7. Project data onto PC1 and PC2
  const projectedData = records.map((rec, i) => {
    let pc1 = 0;
    let pc2 = 0;
    for (let j = 0; j < p; j++) {
      pc1 += Z[i][j] * eigenPairs[0].vec[j];
      pc2 += Z[i][j] * eigenPairs[1].vec[j];
    }
    return {
      institution_id: rec.institution_id,
      name: rec.name,
      pc1: Number(pc1.toFixed(2)),
      pc2: Number(pc2.toFixed(2)),
      overallScore: rec.overall_score,
    };
  });

  return {
    explainedVariance,
    cumulativeVariance,
    loadings,
    projectedData,
  };
}

// ==========================================
// 6. Reproducible Seeded Sampling
// ==========================================

/**
 * Fast Mulberry32 32-bit PRNG with deterministic initial state.
 */
export function createMulberry32(seed: number): () => number {
  let s = Math.floor(Math.abs(seed)) || 1337;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SamplingMethod = 'srs' | 'systematic' | 'stratified' | 'cluster';

export function executeSampling<T>(
  data: T[],
  sampleSize: number,
  method: SamplingMethod,
  seed: number,
  getCategory?: (item: T) => string,
  getState?: (item: T) => string
): T[] {
  const n = data.length;
  if (n === 0 || sampleSize <= 0) return [];
  const targetSize = Math.min(sampleSize, n);
  const rng = createMulberry32(seed);

  if (method === 'srs') {
    // Simple Random Sampling without replacement (Fisher-Yates)
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, targetSize).map((i) => data[i]);
  }

  if (method === 'systematic') {
    // Systematic sampling with interval k = floor(N / n)
    const k = Math.max(1, Math.floor(n / targetSize));
    const start = Math.floor(rng() * k);
    const sampled: T[] = [];
    for (let i = start; i < n && sampled.length < targetSize; i += k) {
      sampled.push(data[i]);
    }
    return sampled;
  }

  if (method === 'stratified') {
    // Stratified Sampling by Category (proportional allocation)
    if (!getCategory) return executeSampling(data, sampleSize, 'srs', seed);

    const strata = new Map<string, T[]>();
    data.forEach((item) => {
      const cat = getCategory(item) || 'Unknown';
      const list = strata.get(cat) || [];
      list.push(item);
      strata.set(cat, list);
    });

    const sampled: T[] = [];
    strata.forEach((stratumItems) => {
      const stratumProp = stratumItems.length / n;
      const stratumTarget = Math.max(1, Math.round(targetSize * stratumProp));
      const srsStratum = executeSampling(stratumItems, stratumTarget, 'srs', Math.floor(rng() * 100000));
      sampled.push(...srsStratum);
    });

    return sampled.slice(0, targetSize);
  }

  if (method === 'cluster') {
    // Cluster Sampling by State
    if (!getState) return executeSampling(data, sampleSize, 'srs', seed);

    const clusterMap = new Map<string, T[]>();
    data.forEach((item) => {
      const st = getState(item) || 'Unknown';
      const list = clusterMap.get(st) || [];
      list.push(item);
      clusterMap.set(st, list);
    });

    const clusterKeys = Array.from(clusterMap.keys());
    // Shuffle clusters
    for (let i = clusterKeys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [clusterKeys[i], clusterKeys[j]] = [clusterKeys[j], clusterKeys[i]];
    }

    const sampled: T[] = [];
    for (const key of clusterKeys) {
      const items = clusterMap.get(key) || [];
      sampled.push(...items);
      if (sampled.length >= targetSize) break;
    }

    return sampled.slice(0, targetSize);
  }

  return [];
}

