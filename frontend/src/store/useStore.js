import { create } from 'zustand';
import apiClient from '../api/client';

const useStore = create((set, get) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Questions state
  questions: [],
  currentIndex: 0,
  isLoadingQuestions: false,

  // Stats state
  stats: {
    known: 0,
    unknown: 0,
    totalSeen: 0,
    totalQuestions: 0,
  },

  // Explanation modal
  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,

  // Actions
  login: async (initData) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.login(initData);
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false 
      });
      
      // Load initial questions and stats
      await get().loadQuestions();
      await get().loadStats();
      
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadQuestions: async () => {
    try {
      set({ isLoadingQuestions: true });
      const response = await apiClient.getQuestionsFeed(10);
      set({ 
        questions: response.questions,
        currentIndex: 0,
        isLoadingQuestions: false 
      });
    } catch (error) {
      console.error('Load questions error:', error);
      set({ isLoadingQuestions: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await apiClient.getStats();
      set({ stats });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  },

  swipeCard: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';
    
    try {
      await apiClient.recordSwipe(questionId, status);
      
      // Update stats
      const currentStats = get().stats;
      set({ 
        stats: {
          ...currentStats,
          [status]: currentStats[status] + 1,
          totalSeen: currentStats.totalSeen + 1
        },
        currentIndex: get().currentIndex + 1
      });

      // If swiped left, show explanation
      if (direction === 'left') {
        await get().loadExplanation(questionId);
      }

      // Load more questions if running low
      if (get().questions.length - get().currentIndex <= 3) {
        await get().loadQuestions();
      }
    } catch (error) {
      console.error('Swipe error:', error);
    }
  },

  loadExplanation: async (questionId) => {
    try {
      set({ isLoadingExplanation: true, showExplanation: true });
      const response = await apiClient.getExplanation(questionId);
      set({ 
        currentExplanation: response.explanation,
        isLoadingExplanation: false 
      });
    } catch (error) {
      console.error('Load explanation error:', error);
      set({ 
        isLoadingExplanation: false,
        currentExplanation: 'Ошибка загрузки объяснения. Попробуйте позже.' 
      });
    }
  },

  closeExplanation: () => {
    set({ 
      showExplanation: false,
      currentExplanation: null 
    });
  },

  getCurrentQuestion: () => {
    const state = get();
    return state.questions[state.currentIndex];
  },

  hasMoreQuestions: () => {
    const state = get();
    return state.currentIndex < state.questions.length;
  }
}));

export default useStore;
