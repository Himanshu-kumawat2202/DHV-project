import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateQuartiles,
  calculatePearsonCorrelation,
  calculateRankMovement,
  getRankBand,
  calculateZScore,
} from './statistics';

test('calculateMean calculates mean correctly', () => {
  assert.equal(calculateMean([10, 20, 30, 40, 50]), 30);
  assert.equal(calculateMean([]), 0);
  assert.equal(calculateMean([5]), 5);
});

test('calculateMedian handles odd and even counts', () => {
  assert.equal(calculateMedian([5, 1, 3]), 3);
  assert.equal(calculateMedian([1, 2, 3, 4]), 2.5);
  assert.equal(calculateMedian([]), 0);
});

test('calculateStandardDeviation computes sample stdev', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9];
  const sd = calculateStandardDeviation(values);
  assert.equal(sd, 2.14);
});

test('calculateQuartiles computes Q1, Q2, Q3 and IQR', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80];
  const q = calculateQuartiles(values);
  assert.equal(q.q2, 45);
  assert.ok(q.iqr > 0);
});

test('calculatePearsonCorrelation computes r and linear regression', () => {
  // Perfect linear relationship y = 2x + 1
  const x = [1, 2, 3, 4, 5];
  const y = [3, 5, 7, 9, 11];
  const result = calculatePearsonCorrelation(x, y);
  assert.equal(result.r, 1);
  assert.equal(result.slope, 2);
  assert.equal(result.intercept, 1);
  assert.equal(result.interpretation, 'Very Strong Positive');
});

test('calculateRankMovement respects NIRF rank 1 is best', () => {
  // 15 to 8 is climbing 7 ranks
  const move1 = calculateRankMovement(15, 8);
  assert.equal(move1.delta, 7);
  assert.equal(move1.direction, 'improved');

  // 4 to 10 is dropping 6 ranks
  const move2 = calculateRankMovement(4, 10);
  assert.equal(move2.delta, -6);
  assert.equal(move2.direction, 'declined');

  // Same rank
  const move3 = calculateRankMovement(1, 1);
  assert.equal(move3.delta, 0);
  assert.equal(move3.direction, 'retained');
});

test('getRankBand correctly assigns rank brackets', () => {
  assert.equal(getRankBand(1), '1–10');
  assert.equal(getRankBand(10), '1–10');
  assert.equal(getRankBand(25), '11–50');
  assert.equal(getRankBand(75), '51–100');
  assert.equal(getRankBand(150), '101–200');
  assert.equal(getRankBand(250), '201+');
  assert.equal(getRankBand(null), 'Unranked');
});

test('calculateZScore computes correct standard score', () => {
  assert.equal(calculateZScore(80, 70, 5), 2);
  assert.equal(calculateZScore(60, 70, 5), -2);
});
