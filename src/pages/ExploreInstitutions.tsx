import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  GitCompare,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INSTITUTIONS, RANKINGS, CATEGORIES, YEARS } from '../data/nirfData';

export const ExploreInstitutions: React.FC = () => {
  const {
    filters,
    updateFilter,
    setInspectInstitutionId,
    addComparisonInstitution,
    setCurrentPage,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<number>(filters.year || 2025);
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'name'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const itemsPerPage = 10;

  // States list
  const states = Array.from(new Set(INSTITUTIONS.map((i) => i.state))).sort();

  // Filtered dataset
  const filtered = INSTITUTIONS.map((inst) => {
    const ranking = RANKINGS.find(
      (r) => r.institution_id === inst.institution_id && r.year === selectedYear
    );
    return {
      inst,
      ranking,
    };
  }).filter(({ inst, ranking }) => {
    if (!ranking) return false;
    if (selectedCategory !== 'All' && inst.category !== selectedCategory) return false;
    if (selectedState !== 'All' && inst.state !== selectedState) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = inst.institution_name.toLowerCase().includes(q);
      const matchShort = inst.short_name.toLowerCase().includes(q);
      const matchCity = inst.city.toLowerCase().includes(q);
      const matchState = inst.state.toLowerCase().includes(q);
      if (!matchName && !matchShort && !matchCity && !matchState) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'rank') {
      comp = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
    } else if (sortBy === 'score') {
      comp = (b.ranking?.overall_score || 0) - (a.ranking?.overall_score || 0);
    } else {
      comp = a.inst.short_name.localeCompare(b.inst.short_name);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = filtered.slice(
    (currentPageNum - 1) * itemsPerPage,
    currentPageNum * itemsPerPage
  );

  const toggleSort = (field: 'rank' | 'score' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Institutional Directory & Comprehensive Profiles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and inspect detailed profiles for all higher educational institutions ranked by NIRF (2017–2025).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> institutions
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPageNum(1);
              }}
              placeholder="Search by name, city, state..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <label htmlFor="explore-year-select" className="text-slate-500 font-semibold text-[11px]">Year:</label>
            <select
              id="explore-year-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setCurrentPageNum(1);
              }}
              className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer flex-1"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Category selector */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <label htmlFor="explore-cat-select" className="text-slate-500 font-semibold text-[11px]">Category:</label>
            <select
              id="explore-cat-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPageNum(1);
              }}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer flex-1"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* State selector */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <label htmlFor="explore-state-select" className="text-slate-500 font-semibold text-[11px]">State:</label>
            <select
              id="explore-state-select"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPageNum(1);
              }}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer flex-1"
            >
              <option value="All">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th
                  onClick={() => toggleSort('rank')}
                  className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Rank</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Institution Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">State & City</th>
                <th className="py-3 px-4">Category</th>
                <th
                  onClick={() => toggleSort('score')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Overall Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">TLR</th>
                <th className="py-3 px-2 text-center">RPC</th>
                <th className="py-3 px-2 text-center">GO</th>
                <th className="py-3 px-2 text-center">OI</th>
                <th className="py-3 px-2 text-center">PR</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No institutions match your active filter criteria. Try resetting filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(({ inst, ranking }) => (
                  <tr
                    key={inst.institution_id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-black text-blue-700 text-sm">
                      #{ranking?.rank ?? 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setInspectInstitutionId(inst.institution_id)}
                        className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-left block"
                      >
                        {inst.institution_name}
                      </button>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Est. {inst.established_year} • {inst.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{inst.city}, {inst.state}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inst.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">
                      {ranking?.overall_score ?? 'N/A'}
                    </td>
                    <td className="py-3.5 px-2 text-center text-slate-700">{ranking?.TLR}</td>
                    <td className="py-3.5 px-2 text-center text-purple-700 font-semibold">{ranking?.RPC}</td>
                    <td className="py-3.5 px-2 text-center text-slate-700">{ranking?.GO}</td>
                    <td className="py-3.5 px-2 text-center text-slate-700">{ranking?.OI}</td>
                    <td className="py-3.5 px-2 text-center text-slate-700">{ranking?.PR}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectInstitutionId(inst.institution_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            addComparisonInstitution(inst.institution_id);
                            setCurrentPage('comparison');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Add to Comparison"
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page <strong>{currentPageNum}</strong> of <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
              disabled={currentPageNum === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
              disabled={currentPageNum === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
