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
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUGGESTED_QUERIES } from '../../services/aiService';
import { AIResponse } from './AIResponse';

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
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
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
                      <h3 className="text-sm font-bold tracking-tight">NIRF NLP Analyst</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Level 3 Grounded Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">Natural Language Analytical Query System</p>
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
                        {msg.sender === 'user' ? (
                          <p className="font-medium leading-relaxed">{msg.text}</p>
                        ) : (
                          <AIResponse text={msg.text} responsePayload={msg.responsePayload} />
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
