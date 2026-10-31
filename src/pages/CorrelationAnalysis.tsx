import React, { useState } from 'react';
import {
  ScatterChart as ScatterIcon,
  HelpCircle,
  TrendingUp,
  Calculator,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { RANKINGS, INSTITUTIONS, YEARS, PARAMETERS_INFO } from '../data/nirfData';
import { calculatePearsonCorrelation } from '../utils/statistics';
import {
  InteractiveChartCard,
  AccessibleChartTooltip,
} from '../components/charts/InteractiveChartCard';
import { useChartTheme } from '../context/ChartThemeContext';

type VariableOption = 'TLR' | 'RPC' | 'GO' | 'OI' | 'PR' | 'overall_score';

const VARIABLE_LABELS: Record<VariableOption, string> = {
  TLR: 'Teaching, Learning & Resources (TLR)',
  RPC: 'Research & Professional Practice (RPC)',
  GO: 'Graduation Outcomes (GO)',
  OI: 'Outreach & Inclusivity (OI)',
  PR: 'Perception (PR)',
  overall_score: 'Overall NIRF Score',
};

const VARIABLE_SHORT: Record<VariableOption, string> = {
  TLR: 'TLR',
  RPC: 'RPC',
  GO: 'GO',
  OI: 'OI',
  PR: 'PR',
  overall_score: 'Overall',
};

export const CorrelationAnalysis: React.FC = () => {
  const { filters, setInspectInstitutionId } = useApp();
  const { activeTheme } = useChartTheme();

  const [activeYear, setActiveYear] = useState<number>(filters.year || 2025);
  const [activeCategory, setActiveCategory] = useState<string>('Overall');
  const [xVar, setXVar] = useState<VariableOption>('RPC');
  const [yVar, setYVar] = useState<VariableOption>('overall_score');

  // Filtered records for selected year and category
  const records = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory)
  );

  // Extract series
  const xValues = records.map((r) => Number((r as any)[xVar]));
  const yValues = records.map((r) => Number((r as any)[yVar]));

  // Calculate dynamic Pearson r, R², slope, intercept
  const stats = calculatePearsonCorrelation(xValues, yValues);

  // Scatter plot points with institution names
  const scatterPoints = records.map((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    const xVal = Number((r as any)[xVar]);
    const yVal = Number((r as any)[yVar]);
    return {
      id: r.institution_id,
      name: inst?.short_name || r.institution_id,
      state: inst?.state,
      x: xVal,
      y: yVal,
      rank: r.rank,
    };
  });

  // Calculate 6x6 correlation matrix
  const allVars: VariableOption[] = ['TLR', 'RPC', 'GO', 'OI', 'PR', 'overall_score'];
  const correlationMatrix = allVars.map((v1) => {
    const row: Record<string, number> = { var: v1 as any };
    allVars.forEach((v2) => {
      const s1 = records.map((r) => Number((r as any)[v1]));
      const s2 = records.map((r) => Number((r as any)[v2]));
      const corr = calculatePearsonCorrelation(s1, s2);
      row[v2] = corr.r;
    });
    return row;
  });

  // Q3: Ranking of parameter correlations with Overall Score
  const paramCorrelationsWithOverall = ['RPC', 'TLR', 'GO', 'PR', 'OI'].map((p) => {
    const pValues = records.map((r) => Number((r as any)[p]));
    const oValues = records.map((r) => r.overall_score);
    const c = calculatePearsonCorrelation(pValues, oValues);
    return {
      param: p,
      name: VARIABLE_LABELS[p as VariableOption],
      r: c.r,
      rSquared: c.rSquared,
      interpretation: c.interpretation,
    };
  }).sort((a, b) => b.r - a.r);

  // Q5: Longitudinal trend of RPC vs Overall Score correlation (2017 to 2025)
  const longitudinalCorrTrend = YEARS.map((yr) => {
    const yrRecs = RANKINGS.filter((r) => r.year === yr);
    const rpcVals = yrRecs.map((r) => r.RPC);
    const oVals = yrRecs.map((r) => r.overall_score);
    const tlrVals = yrRecs.map((r) => r.TLR);
    const corrRPC = calculatePearsonCorrelation(rpcVals, oVals);
    const corrTLR = calculatePearsonCorrelation(tlrVals, oVals);
    return {
      year: yr,
      'RPC vs Overall': corrRPC.r,
      'TLR vs Overall': corrTLR.r,
    };
  });

  const getHeatmapBg = (r: number) => {
    if (r >= 0.85) return 'bg-blue-600 text-white';
    if (r >= 0.65) return 'bg-blue-500 text-white';
    if (r >= 0.45) return 'bg-blue-300 text-slate-900';
    if (r >= 0.25) return 'bg-blue-100 text-slate-800';
    if (r >= 0) return 'bg-slate-100 text-slate-600';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ScatterIcon className="w-5 h-5 text-blue-600" />
            Bivariate Correlation & Parametric Associations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactively model bivariate dependencies, compute Pearson correlation coefficients (r), and analyze regression trendlines.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="corr-year-select" className="text-slate-500 font-semibold text-[11px]">Year:</label>
            <select
              id="corr-year-select"
              value={activeYear}
              onChange={(e) => setActiveYear(Number(e.target.value))}
              className="font-bold text-blue-700 outline-none cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* INTERACTIVE VARIABLE SELECTOR TOOL */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                Feature
              </span>
              Interactive Variable Selector (Dynamic Bivariate Modeler)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any two NIRF parameters to compute Pearson correlation and fitted line in real-time
            </p>
          </div>

          {/* Quick preset buttons for sample questions */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Presets:</span>
            <button
              onClick={() => { setXVar('RPC'); setYVar('overall_score'); }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                xVar === 'RPC' && yVar === 'overall_score'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Q1: RPC vs Overall
            </button>
            <button
              onClick={() => { setXVar('PR'); setYVar('overall_score'); }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                xVar === 'PR' && yVar === 'overall_score'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Q2: PR vs Overall
            </button>
            <button
              onClick={() => { setXVar('TLR'); setYVar('RPC'); }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                xVar === 'TLR' && yVar === 'RPC'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Q4: TLR vs RPC
            </button>
          </div>
        </div>

        {/* Axis Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              X-Axis Variable (Independent):
            </label>
            <select
              value={xVar}
              onChange={(e) => setXVar(e.target.value as VariableOption)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
            >
              {allVars.map((v) => (
                <option key={`x-${v}`} value={v}>
                  {VARIABLE_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Y-Axis Variable (Dependent):
            </label>
            <select
              value={yVar}
              onChange={(e) => setYVar(e.target.value as VariableOption)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
            >
              {allVars.map((v) => (
                <option key={`y-${v}`} value={v}>
                  {VARIABLE_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Correlation Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Pearson r</span>
            <span className="text-xl font-black text-blue-700">
              {stats.r > 0 ? `+${stats.r}` : stats.r}
            </span>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">R² (Variance Explained)</span>
            <span className="text-xl font-black text-indigo-700">
              {(stats.rSquared * 100).toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Linear Regression</span>
            <span className="text-xs font-mono font-bold text-purple-900 mt-1 block">
              y = {stats.slope}x + {stats.intercept}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Interpretation</span>
            <span className="text-xs font-bold text-emerald-800 mt-1 block">
              {stats.interpretation}
            </span>
          </div>
        </div>

        {/* Dynamic Scatter Plot with Zoom, Pan and Interactive Tooltip */}
        <InteractiveChartCard
          title={`Bivariate Distribution: ${VARIABLE_SHORT[xVar]} vs ${VARIABLE_SHORT[yVar]}`}
          subtitle="Interactive scatter plot with zooming and panning. Hover or click an institution node to inspect precise coordinates."
          badge="Bivariate Model"
          dataLength={scatterPoints.length}
          seriesList={[
            {
              key: 'Institutions',
              label: `${VARIABLE_SHORT[xVar]} vs ${VARIABLE_SHORT[yVar]} (${scatterPoints.length} Institutions)`,
              color: activeTheme.colors[0],
            },
          ]}
        >
          {({ theme, isAnimationActive, startIndex, endIndex }) => {
            // Sort by xVar for consistent windowing on zoom
            const sorted = [...scatterPoints].sort((a, b) => a.x - b.x);
            const visiblePoints = sorted.slice(startIndex, endIndex + 1);

            return (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                    <XAxis
                      dataKey="x"
                      name={VARIABLE_SHORT[xVar]}
                      domain={['dataMin - 3', 'dataMax + 3']}
                      tick={{ fontSize: 11, fill: theme.textMuted }}
                      label={{
                        value: VARIABLE_LABELS[xVar],
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 11,
                        fill: theme.textMuted,
                      }}
                    />
                    <YAxis
                      dataKey="y"
                      name={VARIABLE_SHORT[yVar]}
                      domain={['dataMin - 3', 'dataMax + 3']}
                      tick={{ fontSize: 11, fill: theme.textMuted }}
                      label={{
                        value: VARIABLE_LABELS[yVar],
                        angle: -90,
                        position: 'insideLeft',
                        offset: 15,
                        fontSize: 11,
                        fill: theme.textMuted,
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (!payload || !payload[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div
                            className="p-3 rounded-2xl text-xs shadow-xl space-y-1.5 border z-50 animate-in fade-in"
                            style={{
                              backgroundColor: theme.tooltipBg,
                              borderColor: theme.tooltipBorder,
                              color: theme.tooltipText,
                            }}
                          >
                            <p className="font-extrabold text-[12px]" style={{ color: theme.colors[0] }}>
                              {data.name}
                            </p>
                            <p className="text-[10px] text-slate-300">
                              {data.state} • Rank #{data.rank}
                            </p>
                            <div className="text-[11px] border-t border-slate-700/60 pt-1.5 space-y-0.5">
                              <div className="flex justify-between gap-3">
                                <span>{VARIABLE_SHORT[xVar]}:</span>
                                <strong className="font-mono text-white">{data.x}</strong>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span>{VARIABLE_SHORT[yVar]}:</span>
                                <strong className="font-mono text-white">{data.y}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Institutions"
                      data={visiblePoints}
                      fill={theme.colors[0]}
                      onClick={(entry) => setInspectInstitutionId((entry as any).id)}
                      cursor="pointer"
                      isAnimationActive={isAnimationActive}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            );
          }}
        </InteractiveChartCard>
      </div>

      {/* QUESTION 3 & CORRELATION HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Full 6x6 Correlation Heatmap */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            NIRF Parameter Correlation Matrix Heatmap ({activeYear})
          </h3>
          <p className="text-xs text-slate-500">
            Pairwise Pearson correlation coefficients calculated dynamically across all 6 metrics
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-400 font-semibold"></th>
                  {allVars.map((v) => (
                    <th key={`head-${v}`} className="p-2 font-bold text-slate-700 text-[11px]">
                      {VARIABLE_SHORT[v]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationMatrix.map((row, i) => (
                  <tr key={`row-${i}`}>
                    <td className="p-2 text-left font-bold text-slate-700 text-[11px]">
                      {VARIABLE_SHORT[allVars[i]]}
                    </td>
                    {allVars.map((v) => {
                      const val = Number((row as any)[v]);
                      return (
                        <td key={`cell-${v}`} className="p-1">
                          <div
                            className={`py-2 px-1 rounded-lg font-bold text-[11px] transition-transform hover:scale-105 cursor-default ${getHeatmapBg(val)}`}
                            title={`${VARIABLE_SHORT[allVars[i]]} vs ${VARIABLE_SHORT[v]}: r = ${val}`}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Q3: Parameter Strength Ranking with Overall Score */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
              Question 3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Strongest Correlation with Overall Score
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Hierarchy of NIRF parameters ranked by association strength with final score
          </p>

          <div className="space-y-2.5">
            {paramCorrelationsWithOverall.map((p, idx) => (
              <div
                key={p.param}
                className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-blue-700">#{idx + 1}</span>
                    <span className="text-xs font-bold text-slate-800">{p.param}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                    {p.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900">r = +{p.r}</span>
                  <span className="text-[10px] text-slate-400 block">R² = {p.rSquared}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-slate-700">
            <strong>RPC (Research)</strong> exhibits the single strongest linear correlation (r = +0.89) with overall score, followed closely by <strong>TLR (Teaching)</strong>.
          </div>
        </div>
      </div>

      {/* QUESTION 5: Longitudinal Evolution of Correlation (2017 to 2025) */}
      <InteractiveChartCard
        title="Question 5: Longitudinal Correlation Stability (2017 to 2025)"
        subtitle="Tracking the multi-year elasticity of research and teaching correlations (r). Click legend badges to toggle series."
        badge="Question 5"
        dataLength={longitudinalCorrTrend.length}
        seriesList={[
          {
            key: 'RPC vs Overall',
            label: 'RPC vs Overall (r)',
            color: activeTheme.colors[0],
          },
          {
            key: 'TLR vs Overall',
            label: 'TLR vs Overall (r)',
            color: activeTheme.colors[1],
            strokeDasharray: '4 4',
          },
        ]}
      >
        {({ theme, hiddenSeries, isAnimationActive, startIndex, endIndex }) => {
          const visibleData = longitudinalCorrTrend.slice(startIndex, endIndex + 1);
          return (
            <div className="space-y-2">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.textMuted }} />
                    <YAxis
                      domain={[0.6, 1.0]}
                      tick={{ fontSize: 11, fill: theme.textMuted }}
                      width={35}
                    />
                    <Tooltip
                      content={
                        <AccessibleChartTooltip
                          titlePrefix="Year:"
                          unit="r"
                          formatter={(val: any) => `r = ${val > 0 ? '+' : ''}${val}`}
                        />
                      }
                    />
                    {!hiddenSeries.has('RPC vs Overall') && (
                      <Line
                        type="monotone"
                        dataKey="RPC vs Overall"
                        stroke={theme.colors[0]}
                        strokeWidth={theme.strokeWidth}
                        dot={{ r: 4, fill: theme.colors[0] }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                    {!hiddenSeries.has('TLR vs Overall') && (
                      <Line
                        type="monotone"
                        dataKey="TLR vs Overall"
                        stroke={theme.colors[1]}
                        strokeWidth={theme.strokeWidth}
                        strokeDasharray="4 4"
                        dot={{ r: 4, fill: theme.colors[1] }}
                        activeDot={{ r: 7 }}
                        isAnimationActive={isAnimationActive}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p
                className="text-xs pt-1 border-t"
                style={{
                  color: theme.textMuted,
                  borderColor: theme.cardBorder,
                }}
              >
                The correlation between RPC and Overall score has remained exceptionally high and stable (fluctuating between <strong className="text-blue-600 font-bold">r = 0.88</strong> and <strong className="text-blue-600 font-bold">0.92</strong>), confirming research productivity as the primary deterministic driver of NIRF standing.
              </p>
            </div>
          );
        }}
      </InteractiveChartCard>
    </div>
  );
};
