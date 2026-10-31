import React from 'react';
import { RotateCcw, Filter, Calendar, Award, MapPin, Building, Gauge } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { YEARS, CATEGORIES, PARAMETERS_INFO, INSTITUTIONS } from '../../data/nirfData';

export const GlobalFilterBar: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useApp();

  const states = Array.from(new Set(INSTITUTIONS.map((i) => i.state))).sort();

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Filter label and dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 flex-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline font-semibold text-slate-700">Filters:</span>
          </div>

          {/* Academic Year */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="filter-year" className="text-slate-500 font-medium text-[11px]">Year:</label>
            <select
              id="filter-year"
              value={filters.year}
              onChange={(e) => updateFilter('year', Number(e.target.value))}
              className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer pr-1"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Ranking Category */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="filter-category" className="text-slate-500 font-medium text-[11px]">Category:</label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="filter-state" className="text-slate-500 font-medium text-[11px]">State:</label>
            <select
              id="filter-state"
              value={filters.state}
              onChange={(e) => updateFilter('state', e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1 max-w-[130px] truncate"
            >
              <option value="All">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Ranking Parameter */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="filter-param" className="text-slate-500 font-medium text-[11px]">Parameter:</label>
            <select
              id="filter-param"
              value={filters.parameter}
              onChange={(e) => updateFilter('parameter', e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="Overall">Overall Score</option>
              {PARAMETERS_INFO.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key} ({p.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Reset Action & Active indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
            title="Reset filters to default"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
