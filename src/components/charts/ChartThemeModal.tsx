import React from 'react';
import {
  X,
  Palette,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Accessibility,
  Eye,
  Shield,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  useChartTheme,
  PREDEFINED_THEMES,
  ChartThemeId,
} from '../../context/ChartThemeContext';

export const ChartThemeModal: React.FC = () => {
  const {
    themeId,
    setThemeId,
    activeTheme,
    overrides,
    setCustomColor,
    setCustomStrokeWidth,
    setShowGrid,
    resetThemeCustomizations,
    prefersReducedMotion,
    reducedMotionOverride,
    setReducedMotionOverride,
    effectiveReducedMotion,
    isThemeModalOpen,
    setIsThemeModalOpen,
  } = useChartTheme();

  if (!isThemeModalOpen) return null;

  // Mini preview mock data
  const sampleData = [
    { name: '2021', s1: 65, s2: 45, s3: 55 },
    { name: '2022', s1: 72, s2: 52, s3: 60 },
    { name: '2023', s1: 78, s2: 60, s3: 68 },
    { name: '2024', s1: 82, s2: 64, s3: 74 },
    { name: '2025', s1: 88, s2: 70, s3: 80 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Data Visualization Theme Manager
              </h3>
              <p className="text-xs text-slate-500">
                Select visual palettes, customize series styles, and configure accessibility settings across all charts.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close Theme Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Predefined Themes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              1. Choose Predefined Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(PREDEFINED_THEMES) as ChartThemeId[]).map((key) => {
                const t = PREDEFINED_THEMES[key];
                const isSelected = themeId === key;
                return (
                  <button
                    key={key}
                    onClick={() => setThemeId(key)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative group ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{t.name}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight mb-2.5">
                      {t.description}
                    </p>

                    {/* Color Swatch Strip */}
                    <div className="flex items-center gap-1.5">
                      {t.colors.map((c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Live Theme Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Real-Time Visualization Preview
            </label>
            <div
              className="p-4 rounded-2xl border transition-colors"
              style={{
                backgroundColor: activeTheme.cardBg,
                borderColor: activeTheme.cardBorder,
                borderWidth: activeTheme.isHighContrast ? '2px' : '1px',
              }}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold" style={{ color: activeTheme.textColor }}>
                  Theme Preview: {activeTheme.name}
                </span>
                <span className="text-[10px]" style={{ color: activeTheme.textMuted }}>
                  Stroke: {activeTheme.strokeWidth}px • Grid: {overrides.showGrid !== false ? 'Active' : 'Off'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 h-36">
                {/* Line preview */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sampleData}>
                    {overrides.showGrid !== false && (
                      <CartesianGrid strokeDasharray="3 3" stroke={activeTheme.gridColor} />
                    )}
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: activeTheme.textMuted }} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 9, fill: activeTheme.textMuted }} width={25} />
                    <Line
                      type="monotone"
                      dataKey="s1"
                      stroke={activeTheme.colors[0]}
                      strokeWidth={activeTheme.strokeWidth}
                      dot={{ r: 3, fill: activeTheme.colors[0] }}
                      isAnimationActive={!effectiveReducedMotion}
                    />
                    <Line
                      type="monotone"
                      dataKey="s2"
                      stroke={activeTheme.colors[1]}
                      strokeWidth={activeTheme.strokeWidth}
                      strokeDasharray={activeTheme.isHighContrast ? '4 4' : undefined}
                      dot={{ r: 3, fill: activeTheme.colors[1] }}
                      isAnimationActive={!effectiveReducedMotion}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Bar preview */}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleData}>
                    {overrides.showGrid !== false && (
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={activeTheme.gridColor} />
                    )}
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: activeTheme.textMuted }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: activeTheme.textMuted }} width={25} />
                    <Bar
                      dataKey="s3"
                      fill={activeTheme.colors[2] || activeTheme.colors[0]}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={!effectiveReducedMotion}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Section 3: Fine-Grained Palette & Style Customization */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Customize Colors & Styles
              </label>
              <button
                onClick={resetThemeCustomizations}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Customizations</span>
              </button>
            </div>

            {/* Custom Series Color Pickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              {activeTheme.colors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setCustomColor(idx, e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0"
                    title={`Change Series ${idx + 1} Color`}
                  />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Series {idx + 1}</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 uppercase">{color}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sliders for stroke and grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Line Stroke Width</span>
                  <span className="font-bold text-blue-600">{activeTheme.strokeWidth} px</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.5"
                  value={activeTheme.strokeWidth}
                  onChange={(e) => setCustomStrokeWidth(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Cartesian Grid Lines</span>
                  <span className="text-[10px] text-slate-500">Show or hide background grid</span>
                </div>
                <input
                  type="checkbox"
                  checked={overrides.showGrid !== false}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Accessibility & Motion Preferences */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">
                Accessibility & Motion Preferences
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              System prefers reduced motion: <strong>{prefersReducedMotion ? 'Enabled (Reduce Motion)' : 'Standard (Animations Allowed)'}</strong>.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <button
                onClick={() => setReducedMotionOverride(null)}
                className={`px-3 py-1 rounded-xl font-semibold border transition-colors ${
                  reducedMotionOverride === null
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Follow System
              </button>
              <button
                onClick={() => setReducedMotionOverride(true)}
                className={`px-3 py-1 rounded-xl font-semibold border transition-colors ${
                  reducedMotionOverride === true
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Force Reduce Motion (Instant charts)
              </button>
              <button
                onClick={() => setReducedMotionOverride(false)}
                className={`px-3 py-1 rounded-xl font-semibold border transition-colors ${
                  reducedMotionOverride === false
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Allow Smooth Animations
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Selected theme: <strong className="text-slate-800">{activeTheme.name}</strong>
          </span>
          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
