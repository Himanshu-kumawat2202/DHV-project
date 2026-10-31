import test from 'node:test';
import assert from 'node:assert/strict';
import { PREDEFINED_THEMES, ChartThemeDefinition } from '../context/ChartThemeContext';

test('PREDEFINED_THEMES contains all required themes', () => {
  assert.ok(PREDEFINED_THEMES['academic-blue'], 'Academic blue should exist');
  assert.ok(PREDEFINED_THEMES['dark-mode'], 'Dark mode should exist');
  assert.ok(PREDEFINED_THEMES['high-contrast'], 'High contrast should exist');
  assert.ok(PREDEFINED_THEMES['emerald-sage'], 'Emerald sage should exist');
});

test('High contrast theme meets accessibility criteria', () => {
  const hc = PREDEFINED_THEMES['high-contrast'];
  assert.equal(hc.isHighContrast, true);
  assert.ok(hc.strokeWidth >= 3.0, 'High contrast should have thick stroke for readability');
  assert.equal(hc.textColor, '#000000', 'High contrast text should be pure black on white');
  assert.equal(hc.cardBorder, '#000000', 'High contrast border should be distinct');
});

test('Dark mode theme provides dark backgrounds and luminous colors', () => {
  const dark = PREDEFINED_THEMES['dark-mode'];
  assert.equal(dark.isDark, true);
  assert.ok(dark.cardBg.startsWith('#1'), 'Dark card should be dark slate/navy');
  assert.ok(dark.colors.length >= 6, 'Should provide at least 6 distinct series colors');
});

test('Zoom range clamp calculation utility works deterministically', () => {
  // Pure zoom range logic
  function calculateZoomWindow(
    dataLength: number,
    zoomLevel: number,
    panIndex: number
  ): { startIndex: number; endIndex: number } {
    if (dataLength <= 2 || zoomLevel <= 1) {
      return { startIndex: 0, endIndex: dataLength - 1 };
    }
    const visibleCount = Math.max(2, Math.round(dataLength / zoomLevel));
    const maxStart = dataLength - visibleCount;
    const clampedStart = Math.max(0, Math.min(panIndex, maxStart));
    const clampedEnd = Math.min(dataLength - 1, clampedStart + visibleCount - 1);
    return { startIndex: clampedStart, endIndex: clampedEnd };
  }

  const res1 = calculateZoomWindow(9, 1, 0);
  assert.equal(res1.startIndex, 0);
  assert.equal(res1.endIndex, 8);

  const res2 = calculateZoomWindow(9, 2, 0);
  assert.equal(res2.startIndex, 0);
  assert.equal(res2.endIndex, 4);

  const res3 = calculateZoomWindow(9, 2, 4);
  assert.equal(res3.startIndex, 4);
  assert.equal(res3.endIndex, 8);
});

test('Legend toggle state tracks active series correctly', () => {
  // Pure legend toggle logic
  function toggleSeries(
    hiddenSeries: Set<string>,
    seriesKey: string
  ): Set<string> {
    const next = new Set(hiddenSeries);
    if (next.has(seriesKey)) {
      next.delete(seriesKey);
    } else {
      next.add(seriesKey);
    }
    return next;
  }

  const initial = new Set<string>();
  const afterHide = toggleSeries(initial, 'TLR');
  assert.ok(afterHide.has('TLR'));
  assert.equal(afterHide.size, 1);

  const afterUnhide = toggleSeries(afterHide, 'TLR');
  assert.ok(!afterUnhide.has('TLR'));
  assert.equal(afterUnhide.size, 0);
});
