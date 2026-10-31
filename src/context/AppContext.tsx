import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PageId,
  FilterState,
  UserProfile,
  SavedComparison,
  SavedAnalysis,
  CategoryType,
  ParameterKey,
} from '../types';
import { ChatMessage, SUGGESTED_QUERIES, processAIQuery } from '../services/aiService';

interface AppContextType {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  // Comparison
  comparisonInstitutions: string[]; // list of institution IDs (up to 5)
  addComparisonInstitution: (id: string) => void;
  removeComparisonInstitution: (id: string) => void;
  clearComparison: () => void;
  // Auth & Profile
  user: UserProfile | null;
  login: (email: string, name?: string, role?: 'Student' | 'Researcher') => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isProfileDrawerOpen: boolean;
  setIsProfileDrawerOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  // Saved Items
  saveCurrentComparison: (name: string) => void;
  removeSavedComparison: (id: string) => void;
  saveCurrentAnalysis: (title: string, notes: string) => void;
  removeSavedAnalysis: (id: string) => void;
  // AI Assistant
  isAIPanelOpen: boolean;
  setIsAIPanelOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  isAILoading: boolean;
  sendMessageToAI: (query: string) => Promise<void>;
  clearChatHistory: () => void;
  // Selected Detail Modal
  inspectInstitutionId: string | null;
  setInspectInstitutionId: (id: string | null) => void;
  // Notifications
  notifications: { id: string; title: string; time: string; read: boolean }[];
  markNotificationsAsRead: () => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
}

const defaultFilters: FilterState = {
  year: 2025,
  category: 'Overall',
  state: 'All',
  selectedInstitutionId: 'iit-madras',
  parameter: 'Overall',
  searchQuery: '',
};

const initialChatMessages: ChatMessage[] = [
  {
    id: 'welcome',
    sender: 'ai',
    text: "Hello! I'm NIRF AI, your institutional ranking analysis assistant. Ask me anything about NIRF rankings, institutions, scores or performance trends.",
    timestamp: 'Just now',
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [comparisonInstitutions, setComparisonInstitutions] = useState<string[]>([
    'iit-madras',
    'iit-delhi',
    'iit-bombay',
  ]);

  // Auth state
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Default demo user so prototype is immediately functional
    return {
      id: 'demo-user-1',
      name: 'Dr. Himanshu Kumawat',
      email: 'himanshu@nirf-insights.edu',
      role: 'Researcher',
      savedComparisons: [
        {
          id: 'comp-1',
          name: 'Top IITs Tri-Comparison',
          institutionIds: ['iit-madras', 'iit-delhi', 'iit-bombay'],
          category: 'Overall',
          year: 2025,
          createdAt: '2025-05-10',
        },
      ],
      savedAnalyses: [
        {
          id: 'analysis-1',
          title: 'RPC vs Overall Score Disparity Study',
          pageId: 'correlation',
          filterSummary: 'Year: 2025 | Overall Category',
          notes: 'Noticeable regression pull on overall score caused by RPC citation multipliers.',
          createdAt: '2025-06-12',
        },
      ],
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // AI state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isAILoading, setIsAILoading] = useState(false);

  // Institution Inspector Modal
  const [inspectInstitutionId, setInspectInstitutionId] = useState<string | null>(null);

  // Notifications
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'NIRF 2025 Rankings released and integrated', time: '1 hour ago', read: false },
    { id: '2', title: 'New Correlation Analysis tool available', time: '1 day ago', read: false },
    { id: '3', title: 'State Choropleth map refreshed with latest GIS data', time: '3 days ago', read: true },
  ]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const addComparisonInstitution = (id: string) => {
    if (comparisonInstitutions.includes(id)) return;
    if (comparisonInstitutions.length >= 5) {
      alert('You can compare a maximum of 5 institutions at a time.');
      return;
    }
    setComparisonInstitutions((prev) => [...prev, id]);
  };

  const removeComparisonInstitution = (id: string) => {
    if (comparisonInstitutions.length <= 2) {
      alert('At least 2 institutions are required for comparison.');
      return;
    }
    setComparisonInstitutions((prev) => prev.filter((item) => item !== id));
  };

  const clearComparison = () => {
    setComparisonInstitutions(['iit-madras', 'iisc-bangalore']);
  };

  const login = (email: string, name = 'Academic Researcher', role: 'Student' | 'Researcher' = 'Researcher') => {
    setUser({
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      savedComparisons: [],
      savedAnalyses: [],
    });
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    setIsProfileDrawerOpen(false);
  };

  const saveCurrentComparison = (name: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const newComp: SavedComparison = {
      id: `comp-${Date.now()}`,
      name: name || `Comparison (${comparisonInstitutions.length} Insts)`,
      institutionIds: [...comparisonInstitutions],
      category: filters.category === 'All' ? 'Overall' : filters.category,
      year: filters.year,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUser((prev) => prev ? { ...prev, savedComparisons: [newComp, ...prev.savedComparisons] } : null);
  };

  const removeSavedComparison = (id: string) => {
    if (!user) return;
    setUser((prev) => prev ? { ...prev, savedComparisons: prev.savedComparisons.filter((c) => c.id !== id) } : null);
  };

  const saveCurrentAnalysis = (title: string, notes: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const newAnalysis: SavedAnalysis = {
      id: `analysis-${Date.now()}`,
      title: title || `Analysis - ${currentPage}`,
      pageId: currentPage,
      filterSummary: `Year: ${filters.year} | Category: ${filters.category} | State: ${filters.state}`,
      notes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUser((prev) => prev ? { ...prev, savedAnalyses: [newAnalysis, ...prev.savedAnalyses] } : null);
  };

  const removeSavedAnalysis = (id: string) => {
    if (!user) return;
    setUser((prev) => prev ? { ...prev, savedAnalyses: prev.savedAnalyses.filter((a) => a.id !== id) } : null);
  };

  const sendMessageToAI = async (query: string) => {
    if (!query.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAILoading(true);

    try {
      const responsePayload = await processAIQuery(query);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responsePayload.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responsePayload,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAILoading(false);
    }
  };

  const clearChatHistory = () => {
    setChatMessages(initialChatMessages);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        comparisonInstitutions,
        addComparisonInstitution,
        removeComparisonInstitution,
        clearComparison,
        user,
        login,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileDrawerOpen,
        setIsProfileDrawerOpen,
        authModalMode,
        setAuthModalMode,
        saveCurrentComparison,
        removeSavedComparison,
        saveCurrentAnalysis,
        removeSavedAnalysis,
        isAIPanelOpen,
        setIsAIPanelOpen,
        chatMessages,
        isAILoading,
        sendMessageToAI,
        clearChatHistory,
        inspectInstitutionId,
        setInspectInstitutionId,
        notifications,
        markNotificationsAsRead,
        isNotificationsOpen,
        setIsNotificationsOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
