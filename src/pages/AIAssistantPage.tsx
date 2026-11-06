/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dedicated Full-Width ChatGPT-Style NIRF AI Assistant Page
 * Modern, enterprise-grade analytical conversation interface.
 * Fills 100% of the available workspace width and height.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  Trash2,
  Plus,
  MessageSquare,
  History,
  Download,
  ChevronDown,
  ChevronUp,
  Calculator,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  GitCompare,
  MapPin,
  HelpCircle,
  X,
  ArrowRight,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useChartTheme } from '../context/ChartThemeContext';
import { ChatMessage } from '../services/aiService';
import { AIResponse } from '../components/ai/AIResponse';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

const PREDEFINED_SUGGESTIONS = [
  {
    category: 'Top Rankings',
    icon: BarChart3,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    query: 'Which are the top 10 institutions in India according to NIRF 2025?',
    desc: 'National composite rank order across all categories',
  },
  {
    category: 'Comparison',
    icon: GitCompare,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    query: 'Compare IIT Madras and IISc Bangalore.',
    desc: 'Head-to-head evaluation across 5 normalized NIRF pillars',
  },
  {
    category: 'Geospatial',
    icon: MapPin,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    query: 'Which state has the highest number of top-ranked institutions?',
    desc: 'Regional institutional concentration and state distribution',
  },
  {
    category: 'Research Trends',
    icon: TrendingUp,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    query: 'Analyze the research performance of IITs over the last five years.',
    desc: 'Publications, citations, and RPC pillar trajectory',
  },
  {
    category: 'Correlation',
    icon: Layers,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    query: 'Which NIRF scoring parameter has the strongest impact on institutional rankings?',
    desc: 'Pearson correlation & R-squared across TLR, RPC, GO, OI, and PR',
  },
  {
    category: 'Category Shift',
    icon: HelpCircle,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    query: 'Show the performance trends of institutions across different categories.',
    desc: 'Multi-category distribution in Engineering, Management, and Universities',
  },
];

export const AIAssistantPage: React.FC = () => {
  const { chatMessages, isAILoading, sendMessageToAI, clearChatHistory } = useApp();
  const { activeTheme } = useChartTheme();

  const [inputVal, setInputVal] = useState('');
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Local storage sessions
  const [savedSessions, setSavedSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem('nirf_ai_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAILoading]);

  // Sync current conversation to sessions if non-trivial
  useEffect(() => {
    if (chatMessages.length > 1) {
      const firstUserMsg = chatMessages.find((m) => m.sender === 'user');
      const title = firstUserMsg ? firstUserMsg.text.slice(0, 42) + '...' : 'Analytical Session';
      const sessionId = 'session-current';

      setSavedSessions((prev) => {
        const withoutCurrent = prev.filter((s) => s.id !== sessionId);
        const updated: ChatSession = {
          id: sessionId,
          title,
          createdAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          messages: chatMessages,
        };
        const next = [updated, ...withoutCurrent].slice(0, 10);
        try {
          localStorage.setItem('nirf_ai_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [chatMessages]);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || inputVal;
    if (!q.trim() || isAILoading) return;
    sendMessageToAI(q.trim());
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    clearChatHistory();
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const confirmClearConversation = () => {
    clearChatHistory();
    setShowClearModal(false);
  };

  const handleExportChat = () => {
    const transcript = chatMessages
      .map(
        (m) =>
          `[${m.timestamp}] ${m.sender === 'user' ? 'USER' : 'NIRF AI'}:\n${m.text}\n${
            m.responsePayload?.explanation ? `Context: ${m.responsePayload.explanation}\n` : ''
          }`
      )
      .join('\n---\n\n');

    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NIRF_AI_Transcript_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasOnlyWelcome = chatMessages.length <= 1;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white overflow-hidden relative">
      {/* =========================================================================
          SECTION A: COMPACT FULL-WIDTH TOP HEADER
          ========================================================================= */}
      <header className="w-full h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
        {/* Left: Brand Title & Status Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              NIRF AI Assistant
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Grounded Engine • Active</span>
            </div>
          </div>
        </div>

        {/* Right: Actions (History, Export, Clear, New Chat) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors"
            title="Toggle previous sessions"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={handleExportChat}
            disabled={chatMessages.length <= 1}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export conversation as Markdown"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={chatMessages.length <= 1}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear current conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs active:scale-98"
            title="Start fresh conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          SECTION B: MAIN CONVERSATION AREA (100% Full Height & Width)
          ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full relative scrollbar-thin flex flex-col">
        {/* If fresh session: Center the hero & suggestion cards in the spacious full viewport */}
        {hasOnlyWelcome ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 animate-in fade-in duration-300">
            <div className="max-w-3xl w-full mx-auto space-y-8 text-center">
              {/* Centered Welcome Hero */}
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-7 h-7 text-amber-200" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  What would you like to analyze today?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  Query verified rankings, multi-year trajectories, parameter correlations, score distributions, and regional insights across 6,843 official records (2017–2025).
                </p>
              </div>

              {/* Suggested Questions Responsive Grid */}
              <div className="text-left space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Inquiries
                  </span>
                  <span className="text-[11px] text-blue-600 font-semibold">Click to ask instantly</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PREDEFINED_SUGGESTIONS.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.query)}
                        className="text-left p-3.5 sm:p-4 rounded-xl border border-slate-200/90 hover:border-blue-400/80 bg-slate-50/60 hover:bg-blue-50/30 transition-all group flex items-start gap-3 shadow-2xs hover:shadow-xs active:scale-99"
                      >
                        <div className={`p-2 rounded-lg border shadow-2xs flex-shrink-0 ${item.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.category}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors mt-0.5">
                            {item.query}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Messages Stream (Centered reading column for readability, full-width canvas) */
          <div className="max-w-4xl lg:max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex items-start gap-3 w-full ${
                    msg.sender === 'user'
                      ? 'justify-end max-w-[95%] sm:max-w-[85%] ml-auto'
                      : 'justify-start max-w-full'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 sm:p-6 text-xs sm:text-sm shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs w-full'
                    }`}
                  >
                    {/* Header bar on AI messages */}
                    {msg.sender === 'ai' && (
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 text-[11px] text-slate-400 font-semibold mb-3">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          NIRF Insights Grounded Answer
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyAnswer(msg.id, msg.text)}
                            className="p-1 hover:text-slate-600 rounded transition-colors"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    )}

                    {/* Content Rendering */}
                    {msg.sender === 'user' ? (
                      <div className="leading-relaxed font-medium whitespace-pre-line text-white text-[15px]">
                        {msg.text}
                      </div>
                    ) : (
                      <AIResponse text={msg.text} responsePayload={msg.responsePayload} />
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-11">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* AI Loading Indicator */}
            {isAILoading && (
              <div className="flex items-start gap-3 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                    <span className="text-xs text-slate-500 font-medium ml-2">
                      Analyzing NIRF dataset...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION C: FIXED FULL-WIDTH BOTTOM CHAT INPUT
          ========================================================================= */}
      <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 pt-3 pb-4 px-4 sm:px-6 flex-shrink-0 z-10">
        <div className="max-w-3xl lg:max-w-4xl mx-auto w-full">
          <div className="relative flex items-end gap-2 bg-slate-50 hover:bg-slate-100/70 focus-within:bg-white rounded-2xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100 transition-all p-2.5 shadow-2xs">
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything about NIRF rankings, institutions, performance, or analytics..."
              className="flex-1 max-h-40 py-1.5 px-3 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed"
            />

            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  if (textareaRef.current) textareaRef.current.style.height = 'auto';
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors mb-0.5"
                title="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputVal.trim() || isAILoading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 active:scale-95 mb-0.5 flex-shrink-0"
              title="Send query"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 mt-1.5">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Shift + Enter</kbd> for new line
            </span>
            <span className="hidden sm:inline">
              Level 3 Grounded NLP Engine • Verified against 6,843 records
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SLIDE-OVER HISTORY SIDEBAR DRAWER
          ========================================================================= */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsHistoryDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
            <div className="w-screen max-w-xs bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Conversation History</span>
                </div>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {savedSessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs">No saved conversations yet.</p>
                  </div>
                ) : (
                  savedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 bg-slate-50/60 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <p className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600">
                        {session.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>{session.createdAt}</span>
                        <span className="font-medium text-slate-500">{session.messages.length} messages</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleNewChat();
                    setIsHistoryDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Start Fresh Session
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Confirmation Modal for Clearing Conversation */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Clear Conversation?</h3>
              <p className="text-xs text-slate-500">
                This will reset your current conversation. Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearConversation}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
