import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  BarChart,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { SUGGESTED_QUERIES } from '../../services/aiService';

export const AIAssistantPanel: React.FC = () => {
  const {
    isAIPanelOpen,
    setIsAIPanelOpen,
    chatMessages,
    isAILoading,
    sendMessageToAI,
    clearChatHistory,
    setCurrentPage,
    updateFilter,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAIPanelOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAIPanelOpen, isAILoading]);

  const handleSend = (text?: string) => {
    const q = text || inputVal;
    if (!q.trim()) return;
    sendMessageToAI(q);
    setInputVal('');
  };

  return (
    <>
      {/* Floating Bottom-Right Launcher Button */}
      {!isAIPanelOpen && (
        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all text-xs font-bold group"
          aria-label="Open NIRF AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-600" />
          </div>
          <span className="tracking-wide">Ask NIRF AI</span>
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      {isAIPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle click-away backdrop on smaller screens */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity lg:bg-transparent"
            onClick={() => setIsAIPanelOpen(false)}
          />

          <aside className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md lg:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-blue-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                    <Sparkles className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight">NIRF AI Analyst</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        Modular Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">Natural Language Academic Insights</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={clearChatHistory}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Reset chat session"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsAIPanelOpen(false)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close AI panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[94%]">
                      {msg.sender === 'ai' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3.5 text-xs shadow-xs space-y-2 ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        }`}
                      >
                        <p className="font-medium leading-relaxed">{msg.text}</p>

                        {/* Structured AI Payload */}
                        {msg.responsePayload && (
                          <div className="pt-2 border-t border-slate-100 space-y-3">
                            {/* Explanation */}
                            {msg.responsePayload.explanation && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg leading-relaxed border border-slate-100">
                                {msg.responsePayload.explanation}
                              </p>
                            )}

                            {/* Data Summary Grid */}
                            {msg.responsePayload.dataSummary && (
                              <div className="grid grid-cols-2 gap-1.5 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                                {Object.entries(msg.responsePayload.dataSummary).map(([key, val]) => (
                                  <div key={key} className="text-[10px]">
                                    <span className="text-slate-500 font-semibold block">{key}:</span>
                                    <span className="text-slate-800 font-bold">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Mini Embedded Visualization */}
                            {msg.responsePayload.chartType && msg.responsePayload.chartData && (
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-700 block mb-1.5">
                                  {msg.responsePayload.chartConfig?.title || 'Data Visualization'}
                                </span>
                                <div className="h-36 w-full">
                                  {msg.responsePayload.chartType === 'bar' && (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RechartsBarChart data={msg.responsePayload.chartData}>
                                        <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                                        <YAxis tick={{ fontSize: 9 }} width={25} />
                                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                                        <Bar dataKey={msg.responsePayload.chartConfig?.yKeys[0] || 'Rank Improvement'} fill="#2459D3" radius={[4, 4, 0, 0]} />
                                      </RechartsBarChart>
                                    </ResponsiveContainer>
                                  )}
                                  {msg.responsePayload.chartType === 'radar' && (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart data={msg.responsePayload.chartData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 9 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                                        <Radar name="IIT Bombay" dataKey="IIT Bombay" stroke="#2459D3" fill="#2459D3" fillOpacity={0.4} />
                                        <Radar name="IIT Delhi" dataKey="IIT Delhi" stroke="#6475D9" fill="#6475D9" fillOpacity={0.4} />
                                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  )}
                                  {msg.responsePayload.chartType === 'scatter' && (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                                        <XAxis dataKey="RPC" name="RPC" tick={{ fontSize: 9 }} />
                                        <YAxis dataKey="Overall Score" name="Score" tick={{ fontSize: 9 }} domain={[40, 100]} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                                        <Scatter name="Institutions" data={msg.responsePayload.chartData} fill="#2459D3" />
                                      </ScatterChart>
                                    </ResponsiveContainer>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Direct Navigation Button to analytical page */}
                            {msg.responsePayload.targetPage && (
                              <button
                                onClick={() => {
                                  if (msg.responsePayload?.targetPage) {
                                    setCurrentPage(msg.responsePayload.targetPage);
                                  }
                                  if (msg.responsePayload?.targetFilters) {
                                    Object.entries(msg.responsePayload.targetFilters).forEach(([k, v]) => {
                                      updateFilter(k as any, v);
                                    });
                                  }
                                  setIsAIPanelOpen(false);
                                }}
                                className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-blue-200/60"
                              >
                                <span>Explore in {msg.responsePayload.targetPage.replace('-', ' ')}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-9">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isAILoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2 px-2 animate-pulse">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Analyzing NIRF multidimensional parameters...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggested Questions Section */}
              <div className="p-3 bg-white border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Suggested Analytical Questions
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 border border-slate-200/70"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-100">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Ask about institutions, parameters, ranks, or trends..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim() || isAILoading}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors"
                    aria-label="Send query"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
