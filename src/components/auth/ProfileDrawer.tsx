import React, { useState } from 'react';
import {
  X,
  User,
  Bookmark,
  SlidersHorizontal,
  LogOut,
  Trash2,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfileDrawer: React.FC = () => {
  const {
    isProfileDrawerOpen,
    setIsProfileDrawerOpen,
    user,
    logout,
    removeSavedComparison,
    removeSavedAnalysis,
    setCurrentPage,
    updateFilter,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'comparisons' | 'analyses' | 'settings'>('comparisons');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isProfileDrawerOpen || !user) return null;

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsProfileDrawerOpen(false)}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {user.role}
                  </span>
                  <span className="text-[10px] text-slate-400">Authenticated Demo User</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsProfileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              aria-label="Close profile drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification */}
          {successToast && (
            <div className="mx-6 mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6 pt-2">
            <button
              onClick={() => setActiveTab('comparisons')}
              className={`pb-3 text-xs font-bold transition-all relative mr-5 flex items-center gap-1.5 ${
                activeTab === 'comparisons'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Comparisons ({user.savedComparisons.length})
            </button>
            <button
              onClick={() => setActiveTab('analyses')}
              className={`pb-3 text-xs font-bold transition-all relative mr-5 flex items-center gap-1.5 ${
                activeTab === 'analyses'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Analyses ({user.savedAnalyses.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === 'comparisons' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Quick access to multi-institution benchmarking sets:
                </p>
                {user.savedComparisons.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No comparisons saved yet. Use the Save Comparison button on the Institution Comparison page.
                  </div>
                ) : (
                  user.savedComparisons.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{c.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {c.institutionIds.length} Institutions • {c.category} • Year {c.year}
                        </p>
                        <span className="text-[10px] text-slate-400">Saved on {c.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setCurrentPage('comparison');
                            setIsProfileDrawerOpen(false);
                            triggerToast('Loaded comparison dataset.');
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-medium"
                          title="Open in Comparison"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSavedComparison(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete saved comparison"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'analyses' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Bookmarked analytical findings, regressions, and notes:
                </p>
                {user.savedAnalyses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No saved analyses yet. You can bookmark specific pages and findings.
                  </div>
                ) : (
                  user.savedAnalyses.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs group space-y-1.5"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-slate-800">{a.title}</h4>
                        <button
                          onClick={() => removeSavedAnalysis(a.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">{a.filterSummary}</p>
                      {a.notes && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg font-mono text-[11px]">
                          "{a.notes}"
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">Saved {a.createdAt}</span>
                        <button
                          onClick={() => {
                            setCurrentPage(a.pageId as any);
                            setIsProfileDrawerOpen(false);
                          }}
                          className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Open View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Classification</label>
                  <select
                    defaultValue={user.role}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 outline-none"
                  >
                    <option value="Researcher">Researcher</option>
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => triggerToast('Preferences saved.')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer with logout */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => {
                alert('Exporting NIRF Institutional Analytics Dataset as JSON/CSV bundle...');
              }}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>Export Raw Data</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
