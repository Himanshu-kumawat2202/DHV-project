import React, { useState } from 'react';
import { INDIA_STATES } from '../../data/indiaGeo';
import { useApp } from '../../context/AppContext';
import { INSTITUTIONS, RANKINGS } from '../../data/nirfData';

interface InteractiveIndiaMapProps {
  year?: number;
  category?: string;
  rankLimit?: number;
  onSelectState?: (stateName: string) => void;
  selectedState?: string;
}

export const InteractiveIndiaMap: React.FC<InteractiveIndiaMapProps> = ({
  year = 2025,
  category = 'Overall',
  rankLimit = 100,
  onSelectState,
  selectedState,
}) => {
  const { filters, updateFilter } = useApp();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeYear = year || filters.year;
  const activeCategory = category || filters.category;

  // Compute state metrics
  const stateDataMap: Record<
    string,
    { count: number; topInst?: string; topRank?: number; avgScore: number }
  > = {};

  const rankingsInLimit = RANKINGS.filter(
    (r) =>
      r.year === activeYear &&
      (activeCategory === 'All' || r.category === activeCategory) &&
      r.rank <= rankLimit
  );

  rankingsInLimit.forEach((r) => {
    const inst = INSTITUTIONS.find((i) => i.institution_id === r.institution_id);
    if (!inst) return;
    if (!stateDataMap[inst.state]) {
      stateDataMap[inst.state] = { count: 0, avgScore: 0 };
    }
    stateDataMap[inst.state].count += 1;
    if (
      !stateDataMap[inst.state].topRank ||
      r.rank < (stateDataMap[inst.state].topRank || 999)
    ) {
      stateDataMap[inst.state].topRank = r.rank;
      stateDataMap[inst.state].topInst = inst.short_name;
    }
    stateDataMap[inst.state].avgScore += r.overall_score;
  });

  // Normalize average score
  Object.keys(stateDataMap).forEach((st) => {
    stateDataMap[st].avgScore = Number(
      (stateDataMap[st].avgScore / stateDataMap[st].count).toFixed(1)
    );
  });

  const maxCount = Math.max(...Object.values(stateDataMap).map((d) => d.count), 1);

  const getColor = (stateName: string) => {
    const isSelected =
      selectedState === stateName ||
      (filters.state !== 'All' && filters.state === stateName);
    if (isSelected) return '#1D4ED8'; // strong active blue

    const data = stateDataMap[stateName];
    if (!data || data.count === 0) return '#E2E8F0'; // light slate for 0 count

    // Heat intensity from count
    const ratio = data.count / maxCount;
    if (ratio > 0.75) return '#2459D3'; // Tier 1 (e.g. Tamil Nadu)
    if (ratio > 0.5) return '#3B82F6';  // Tier 2 (e.g. Karnataka, Delhi)
    if (ratio > 0.25) return '#60A5FA'; // Tier 3 (Maharashtra, UP, WB)
    return '#93C5FD';                   // Tier 4
  };

  const handleStateClick = (stateName: string) => {
    if (onSelectState) {
      onSelectState(stateName);
    } else {
      updateFilter('state', filters.state === stateName ? 'All' : stateName);
    }
  };

  return (
    <div
      className="relative w-full h-[380px] sm:h-[450px] flex items-center justify-center select-none"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setHoveredState(null)}
    >
      <svg
        viewBox="0 0 650 720"
        className="w-full h-full max-h-[440px] drop-shadow-sm transition-all"
      >
        <g>
          {INDIA_STATES.map((state) => {
            const data = stateDataMap[state.name];
            const isHovered = hoveredState === state.name;
            const isSelected =
              selectedState === state.name ||
              (filters.state !== 'All' && filters.state === state.name);

            return (
              <path
                key={state.id}
                d={state.path}
                fill={getColor(state.name)}
                stroke={isSelected ? '#172554' : '#FFFFFF'}
                strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.2}
                className="cursor-pointer transition-colors duration-150 ease-out"
                onMouseEnter={() => setHoveredState(state.name)}
                onClick={() => handleStateClick(state.name)}
              />
            );
          })}

          {/* State centroid labels for high density states */}
          {INDIA_STATES.map((state) => {
            const data = stateDataMap[state.name];
            if (!data || data.count < 3) return null;
            return (
              <text
                key={`lbl-${state.id}`}
                x={state.center[0]}
                y={state.center[1]}
                textAnchor="middle"
                className="text-[10px] font-bold fill-white pointer-events-none drop-shadow-xs"
              >
                {data.count}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredState && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs max-w-xs border border-slate-700 backdrop-blur-xs animate-in fade-in duration-100"
          style={{
            left: `${Math.min(mousePos.x + 12, 340)}px`,
            top: `${Math.max(mousePos.y - 60, 10)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-700/80 pb-1.5 mb-1.5">
            <span className="font-bold text-sm text-blue-300">{hoveredState}</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-[10px] font-semibold text-blue-200">
              {stateDataMap[hoveredState]?.count || 0} in Top {rankLimit}
            </span>
          </div>

          {stateDataMap[hoveredState]?.count ? (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Leading Institute:</span>
                <span className="font-semibold text-slate-100">
                  {stateDataMap[hoveredState].topInst} (#{stateDataMap[hoveredState].topRank})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Cohort Avg Score:</span>
                <span className="font-semibold text-emerald-400">
                  {stateDataMap[hoveredState].avgScore}
                </span>
              </div>
              <p className="text-[10px] text-blue-300 pt-1 font-medium">Click state to filter dashboard</p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No institutions ranked in Top {rankLimit} for selected category.</p>
          )}
        </div>
      )}

      {/* Color Legend */}
      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-sm text-[10px] space-y-1.5">
        <span className="font-bold text-slate-700 block">Top {rankLimit} Density</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#2459D3]" />
          <span className="text-slate-600">High (&gt;10 insts)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#3B82F6]" />
          <span className="text-slate-600">Moderate (5–10 insts)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#93C5FD]" />
          <span className="text-slate-600">Developing (1–4 insts)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-[#E2E8F0]" />
          <span className="text-slate-600">None in Cohort</span>
        </div>
      </div>
    </div>
  );
};
