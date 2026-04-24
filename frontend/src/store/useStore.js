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
  learningMode: 'swipe', // 'swipe' or 'test'

  // Stats state
  stats: {
    known: 0,
    unknown: 0,
    totalSeen: 0,
    totalQuestions: 0,
  },
  
  // Blitz state
  blitzScore: 0,
  blitzTimeLeft: 60,
  isBlitzActive: false,

  // Interview state
  interviewHistory: [], // { role: 'interviewer'|'candidate', content: string, evaluation?: object }
  isEvaluatingInterview: false,

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

  loadQuestions: async (append = false) => {
    try {
      if (!append) set({ isLoadingQuestions: true });
      const mode = get().learningMode;
      const response = await apiClient.request(`/questions/feed?userId=${apiClient.userId}&limit=10&mode=${mode}`);
      
      if (append) {
        set((state) => ({ 
          questions: [...state.questions, ...response.questions],
          isLoadingQuestions: false 
        }));
      } else {
        set({ 
          questions: response.questions,
          currentIndex: 0,
          isLoadingQuestions: false 
        });
      }
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
        await get().loadQuestions(true);
      }
    } catch (error) {
      console.error('Swipe error:', error);
    }
  },

  submitTestAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitTestAnswer(questionId, answer);
      
      // Update stats
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ 
        stats: {
          ...currentStats,
          [status]: currentStats[status] + 1,
          totalSeen: currentStats.totalSeen + 1
        }
      });

      // If incorrect, show explanation
      if (!response.isCorrect) {
        await get().loadExplanation(questionId);
      } else {
        // Move to next question if correct
        set({ currentIndex: get().currentIndex + 1 });
      }

      // Load more questions if running low
      if (get().questions.length - get().currentIndex <= 3) {
        await get().loadQuestions(true);
      }

      return response;
    } catch (error) {
      console.error('Submit answer error:', error);
      throw error;
    }
  },

  submitBugHuntAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitBugHuntAnswer(questionId, answer);
      
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ 
        stats: {
          ...currentStats,
          [status]: currentStats[status] + 1,
          totalSeen: currentStats.totalSeen + 1
        }
      });

      if (!response.isCorrect) {
        await get().loadExplanation(questionId);
      } else {
        set({ currentIndex: get().currentIndex + 1 });
      }

      if (get().questions.length - get().currentIndex <= 3) {
        await get().loadQuestions(true);
      }

      return response;
    } catch (error) {
      console.error('Submit bug hunt answer error:', error);
      throw error;
    }
  },

  submitBlitzAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitBlitzAnswer(questionId, answer);
      
      if (response.isCorrect) {
        set((state) => ({ blitzScore: state.blitzScore + 1 }));
      }
      
      // Always move to next question in Blitz
      set((state) => ({ currentIndex: state.currentIndex + 1 }));

      if (get().questions.length - get().currentIndex <= 3) {
        await get().loadQuestions(true);
      }

      return response;
    } catch (error) {
      console.error('Submit blitz answer error:', error);
      throw error;
    }
  },

  submitInterviewAnswer: async (question, answer) => {
    try {
      set({ isEvaluatingInterview: true });
      
      const evaluation = await apiClient.evaluateInterviewAnswer(question, answer);
      
      const newMessage = { 
        role: 'candidate', 
        content: answer, 
        evaluation 
      };
      
      set((state) => ({
        interviewHistory: [...state.interviewHistory, newMessage],
        isEvaluatingInterview: false
      }));

      return evaluation;
    } catch (error) {
      console.error('Submit interview answer error:', error);
      set({ isEvaluatingInterview: false });
      throw error;
    }
  },

  addInterviewerMessage: (content) => {
    set((state) => ({
      interviewHistory: [...state.interviewHistory, { role: 'interviewer', content }]
    }));
  },

  nextInterviewQuestion: () => {
    const nextIndex = get().currentIndex + 1;
    set({ currentIndex: nextIndex });
    
    const nextQuestion = get().questions[nextIndex];
    if (nextQuestion) {
      get().addInterviewerMessage(nextQuestion.question);
    } else {
      get().loadQuestions(true).then(() => {
        const q = get().questions[get().currentIndex];
        if (q) get().addInterviewerMessage(q.question);
      });
    }
  },

  startInterview: () => {
    const currentQuestion = get().questions[get().currentIndex];
    if (currentQuestion) {
      set({ interviewHistory: [{ role: 'interviewer', content: currentQuestion.question }] });
    }
  },

  submitCodeCompletionAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitCodeCompletionAnswer(questionId, answer);
      
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ 
        stats: {
          ...currentStats,
          [status]: currentStats[status] + 1,
          totalSeen: currentStats.totalSeen + 1
        }
      });

      if (!response.isCorrect) {
        await get().loadExplanation(questionId);
      } else {
        set({ currentIndex: get().currentIndex + 1 });
      }

      if (get().questions.length - get().currentIndex <= 3) {
        await get().loadQuestions(true);
      }

      return response;
    } catch (error) {
      console.error('Submit code completion error:', error);
      throw error;
    }
  },

  startBlitz: () => {
    set({ 
      blitzScore: 0, 
      blitzTimeLeft: 60, 
      isBlitzActive: true,
      currentIndex: 0 
    });
    get().loadQuestions();
  },

  stopBlitz: () => {
    set({ isBlitzActive: false });
  },

  decrementBlitzTime: () => {
    set((state) => {
      const newTime = state.blitzTimeLeft - 1;
      if (newTime <= 0) {
        return { blitzTimeLeft: 0, isBlitzActive: false };
      }
      return { blitzTimeLeft: newTime };
    });
  },

  setLearningMode: (mode) => {
    set({ 
      learningMode: mode, 
      currentIndex: 0,
      isBlitzActive: false,
      interviewHistory: []
    });
    
    get().loadQuestions().then(() => {
      if (mode === 'mock-interview') {
        get().startInterview();
      }
    });
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
    const { learningMode, currentIndex } = get();
    set({ 
      showExplanation: false,
      currentExplanation: null 
    });
    
    // В режиме теста, охоты на баги или завершения кода переходим к следующему вопросу
    if (learningMode === 'test' || learningMode === 'bug-hunting' || learningMode === 'code-completion') {
      set({ currentIndex: currentIndex + 1 });
    }
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
