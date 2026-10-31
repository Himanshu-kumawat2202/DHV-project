import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Palette,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from 'lucide-react';
import { useChartTheme } from '../../context/ChartThemeContext';

export interface InteractiveChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: (props: {
    theme: ReturnType<typeof useChartTheme>['activeTheme'];
    zoomLevel: number;
    panOffset: number;
    hiddenSeries: Set<string>;
    toggleSeries: (key: string) => void;
    isAnimationActive: boolean;
    startIndex: number;
    endIndex: number;
  }) => React.ReactNode;
  dataLength?: number;
  seriesList?: { key: string; label: string; color: string; strokeDasharray?: string }[];
  enableZoom?: boolean;
  className?: string;
}

export const InteractiveChartCard: React.FC<InteractiveChartCardProps> = ({
  title,
  subtitle,
  badge,
  children,
  dataLength = 9,
  seriesList = [],
  enableZoom = true,
  className = '',
}) => {
  const {
    activeTheme,
    effectiveReducedMotion,
    setIsThemeModalOpen,
    themeId,
  } = useChartTheme();

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = 100%, 2 = 200%, 3 = 300%
  const [panOffset, setPanOffset] = useState<number>(0);

  // Legend toggling state
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset(0);
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  const handlePanLeft = () => {
    setPanOffset((prev) => Math.max(0, prev - 1));
  };

  const handlePanRight = () => {
    if (dataLength <= 2 || zoomLevel <= 1) return;
    const visibleCount = Math.max(2, Math.round(dataLength / zoomLevel));
    const maxStart = Math.max(0, dataLength - visibleCount);
    setPanOffset((prev) => Math.min(maxStart, prev + 1));
  };

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Prevent hiding ALL series
        if (seriesList.length > 0 && next.size >= seriesList.length - 1) {
          return next;
        }
        next.add(key);
      }
      return next;
    });
  };

  // Calculate slice indices for windowing
  const visibleCount = zoomLevel > 1 ? Math.max(2, Math.round(dataLength / zoomLevel)) : dataLength;
  const maxStart = Math.max(0, dataLength - visibleCount);
  const clampedStart = Math.min(panOffset, maxStart);
  const clampedEnd = Math.min(dataLength - 1, clampedStart + visibleCount - 1);

  return (
    <div
      className={`p-5 rounded-3xl transition-all duration-200 border shadow-2xs ${className}`}
      style={{
        backgroundColor: activeTheme.cardBg,
        borderColor: activeTheme.cardBorder,
        color: activeTheme.textColor,
        borderWidth: activeTheme.isHighContrast ? '2px' : '1px',
      }}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-bold tracking-tight"
              style={{ color: activeTheme.textColor }}
            >
              {title}
            </h3>
            {badge && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: activeTheme.isDark ? '#1E293B' : '#EFF6FF',
                  color: activeTheme.isDark ? '#38BDF8' : '#2459D3',
                  border: `1px solid ${activeTheme.isDark ? '#334155' : '#BFDBFE'}`,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              className="text-xs mt-0.5"
              style={{ color: activeTheme.textMuted }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls: Zoom, Pan, Theme */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {enableZoom && dataLength > 3 && (
            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{
                backgroundColor: activeTheme.isDark ? '#0F172A' : '#F8FAFC',
                borderColor: activeTheme.cardBorder,
              }}
            >
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1 rounded-lg hover:bg-slate-200/50 disabled:opacity-30 transition-colors"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-1 rounded-lg hover:bg-slate-200/50 disabled:opacity-30 transition-colors"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {zoomLevel > 1 && (
                <>
                  <button
                    onClick={handlePanLeft}
                    disabled={clampedStart <= 0}
                    className="p-1 rounded-lg hover:bg-slate-200/50 disabled:opacity-30 transition-colors"
                    title="Pan Left (<)"
                    aria-label="Pan Left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handlePanRight}
                    disabled={clampedEnd >= dataLength - 1}
                    className="p-1 rounded-lg hover:bg-slate-200/50 disabled:opacity-30 transition-colors"
                    title="Pan Right (>)"
                    aria-label="Pan Right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1 rounded-lg hover:bg-slate-200/50 text-blue-600 transition-colors text-[10px] font-bold flex items-center gap-0.5"
                    title="Reset Zoom Range"
                    aria-label="Reset Zoom Range"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <span
                    className="px-1 text-[10px] font-mono font-bold"
                    style={{ color: activeTheme.textMuted }}
                  >
                    {Math.round(zoomLevel * 100)}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Theme Quick Manager Trigger */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all hover:scale-102 active:scale-98"
            style={{
              backgroundColor: activeTheme.isDark ? '#1E293B' : '#F1F5F9',
              borderColor: activeTheme.cardBorder,
              color: activeTheme.textColor,
            }}
            title="Configure Chart Themes & Display Options"
          >
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Theme</span>
          </button>
        </div>
      </div>

      {/* Interactive Legend with Series Toggling */}
      {seriesList.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 mb-3 pb-2.5 border-b text-xs"
          style={{ borderColor: activeTheme.cardBorder }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{ color: activeTheme.textMuted }}
          >
            Series (click to toggle):
          </span>
          {seriesList.map((series) => {
            const isHidden = hiddenSeries.has(series.key);
            return (
              <button
                key={series.key}
                onClick={() => toggleSeries(series.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSeries(series.key);
                  }
                }}
                aria-pressed={!isHidden}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  isHidden ? 'opacity-40 line-through bg-transparent' : 'shadow-2xs'
                }`}
                style={{
                  borderColor: isHidden ? activeTheme.cardBorder : series.color,
                  backgroundColor: isHidden
                    ? 'transparent'
                    : activeTheme.isDark
                    ? '#1E293B'
                    : '#FFFFFF',
                  color: isHidden ? activeTheme.textMuted : activeTheme.textColor,
                }}
                title={isHidden ? `Click to show ${series.label}` : `Click to hide ${series.label}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: series.color,
                    boxShadow: !isHidden ? `0 0 6px ${series.color}60` : 'none',
                  }}
                />
                <span className="text-[11px] font-bold">{series.label}</span>
                {isHidden ? (
                  <EyeOff className="w-3 h-3 text-slate-400" />
                ) : (
                  <Eye className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Render chart */}
      {children({
        theme: activeTheme,
        zoomLevel,
        panOffset: clampedStart,
        hiddenSeries,
        toggleSeries,
        isAnimationActive: !effectiveReducedMotion,
        startIndex: clampedStart,
        endIndex: clampedEnd,
      })}
    </div>
  );
};

/**
 * Accessible Custom Tooltip for Recharts with precise formatting
 */
export const AccessibleChartTooltip: React.FC<any> = ({
  active,
  payload,
  label,
  formatter,
  titlePrefix = '',
  unit = 'pts',
}) => {
  const { activeTheme } = useChartTheme();

  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border z-50 animate-in fade-in zoom-in-95 duration-100 max-w-xs"
      style={{
        backgroundColor: activeTheme.tooltipBg,
        borderColor: activeTheme.tooltipBorder,
        color: activeTheme.tooltipText,
        borderWidth: activeTheme.isHighContrast ? '2px' : '1px',
      }}
    >
      <div
        className="font-bold text-[11px] pb-1 border-b flex items-center justify-between"
        style={{ borderColor: activeTheme.isDark ? '#334155' : '#475569' }}
      >
        <span>
          {titlePrefix} {label}
        </span>
        <span
          className="text-[10px] font-normal"
          style={{ color: activeTheme.isDark ? '#94A3B8' : '#CBD5E1' }}
        >
          {payload.length} series
        </span>
      </div>

      <div className="space-y-1">
        {payload.map((item: any, idx: number) => {
          const val = typeof item.value === 'number' ? Number(item.value.toFixed(2)) : item.value;
          const displayVal = formatter ? formatter(val, item.name, item) : `${val} ${unit}`;
          return (
            <div key={idx} className="flex items-center justify-between gap-4 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color || item.fill || activeTheme.colors[idx % activeTheme.colors.length] }}
                />
                <span className="truncate text-slate-200">{item.name}:</span>
              </div>
              <span className="font-extrabold font-mono text-white flex-shrink-0">
                {displayVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
