import React, { createContext, useContext, useState, useEffect } from 'react';

export type ChartThemeId = 'academic-blue' | 'dark-mode' | 'high-contrast' | 'emerald-sage';

export interface ChartThemeDefinition {
  id: ChartThemeId;
  name: string;
  description: string;
  isDark: boolean;
  isHighContrast: boolean;
  colors: string[]; // Series colors 0-5
  background: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textMuted: string;
  gridColor: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  strokeWidth: number;
}

export const PREDEFINED_THEMES: Record<ChartThemeId, ChartThemeDefinition> = {
  'academic-blue': {
    id: 'academic-blue',
    name: 'Academic Blue (Default)',
    description: "Official NIRF Insights palette with deep academic blue, emerald, and indigo",
    isDark: false,
    isHighContrast: false,
    colors: ['#2459D3', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'],
    background: '#F7F8FC',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    textColor: '#1E293B',
    textMuted: '#64748B',
    gridColor: '#E2E8F0',
    tooltipBg: '#0F172A',
    tooltipText: '#F8FAFC',
    tooltipBorder: '#334155',
    strokeWidth: 2.5,
  },
  'dark-mode': {
    id: 'dark-mode',
    name: 'Obsidian Dark',
    description: 'High-luminance neon colors on deep charcoal slate background for low-light analysis',
    isDark: true,
    isHighContrast: false,
    colors: ['#38BDF8', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#2DD4BF'],
    background: '#0B0F19',
    cardBg: '#131B2E',
    cardBorder: '#1E293B',
    textColor: '#F1F5F9',
    textMuted: '#94A3B8',
    gridColor: '#1E293B',
    tooltipBg: '#0F172A',
    tooltipText: '#F8FAFC',
    tooltipBorder: '#38BDF8',
    strokeWidth: 2.5,
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast (WCAG AAA)',
    description: 'Maximum contrast compliant palette with thick strokes and vivid distinguishable hues',
    isDark: false,
    isHighContrast: true,
    colors: ['#005AB5', '#DC3220', '#009E73', '#E69F00', '#785EF0', '#D55E00'],
    background: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: '#000000',
    textColor: '#000000',
    textMuted: '#1E293B',
    gridColor: '#94A3B8',
    tooltipBg: '#000000',
    tooltipText: '#FFFFFF',
    tooltipBorder: '#000000',
    strokeWidth: 3.5,
  },
  'emerald-sage': {
    id: 'emerald-sage',
    name: 'Emerald Sage',
    description: 'Earthy botanical palette focused on natural greens, warm gold, and rich teal',
    isDark: false,
    isHighContrast: false,
    colors: ['#059669', '#D97706', '#2563EB', '#7C3AED', '#DC2626', '#0D9488'],
    background: '#FAFAF9',
    cardBg: '#FFFFFF',
    cardBorder: '#E7E5E4',
    textColor: '#1C1917',
    textMuted: '#57534E',
    gridColor: '#E7E5E4',
    tooltipBg: '#1C1917',
    tooltipText: '#F5F5F4',
    tooltipBorder: '#44403C',
    strokeWidth: 2.5,
  },
};

interface CustomThemeOverrides {
  customColors?: string[];
  strokeWidth?: number;
  showGrid?: boolean;
}

interface ChartThemeContextType {
  themeId: ChartThemeId;
  setThemeId: (id: ChartThemeId) => void;
  activeTheme: ChartThemeDefinition;
  overrides: CustomThemeOverrides;
  setCustomColor: (index: number, color: string) => void;
  setCustomStrokeWidth: (width: number) => void;
  setShowGrid: (show: boolean) => void;
  resetThemeCustomizations: () => void;
  // Accessibility & Motion
  prefersReducedMotion: boolean;
  reducedMotionOverride: boolean | null;
  setReducedMotionOverride: (override: boolean | null) => void;
  effectiveReducedMotion: boolean;
  // Theme modal controls
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ChartThemeContext = createContext<ChartThemeContextType | undefined>(undefined);

export const ChartThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ChartThemeId>('academic-blue');
  const [overrides, setOverrides] = useState<CustomThemeOverrides>({});
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Reduced motion detection
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [reducedMotionOverride, setReducedMotionOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setSystemReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const effectiveReducedMotion =
    reducedMotionOverride !== null ? reducedMotionOverride : systemReducedMotion;

  const baseTheme = PREDEFINED_THEMES[themeId] || PREDEFINED_THEMES['academic-blue'];

  // Apply any active overrides
  const activeTheme: ChartThemeDefinition = {
    ...baseTheme,
    colors: overrides.customColors && overrides.customColors.length
      ? overrides.customColors
      : baseTheme.colors,
    strokeWidth: overrides.strokeWidth !== undefined ? overrides.strokeWidth : baseTheme.strokeWidth,
  };

  const setCustomColor = (index: number, color: string) => {
    setOverrides((prev) => {
      const currentColors = [...(prev.customColors || baseTheme.colors)];
      currentColors[index] = color;
      return { ...prev, customColors: currentColors };
    });
  };

  const setCustomStrokeWidth = (strokeWidth: number) => {
    setOverrides((prev) => ({ ...prev, strokeWidth }));
  };

  const setShowGrid = (showGrid: boolean) => {
    setOverrides((prev) => ({ ...prev, showGrid }));
  };

  const resetThemeCustomizations = () => {
    setOverrides({});
  };

  return (
    <ChartThemeContext.Provider
      value={{
        themeId,
        setThemeId,
        activeTheme,
        overrides,
        setCustomColor,
        setCustomStrokeWidth,
        setShowGrid,
        resetThemeCustomizations,
        prefersReducedMotion: systemReducedMotion,
        reducedMotionOverride,
        setReducedMotionOverride,
        effectiveReducedMotion,
        isThemeModalOpen,
        setIsThemeModalOpen,
      }}
    >
      {children}
    </ChartThemeContext.Provider>
  );
};

export const useChartTheme = () => {
  const ctx = useContext(ChartThemeContext);
  if (!ctx) throw new Error('useChartTheme must be used within ChartThemeProvider');
  return ctx;
};
