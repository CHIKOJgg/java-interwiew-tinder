const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
    this.userId = null;
    this.language = 'Java';
  }

  setUserId(userId) { this.userId = String(userId); }
  setLanguage(language) { this.language = language; }

  async getAuthHeaders() {
    // We import the store dynamically to avoid circular dependencies if any
    const { default: useStore } = await import('../store/useStore');
    const token = useStore.getState().token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }


  // ─── Auth ──────────────────────────────────────────────────────────
  async login(initData) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
    if (response.user) {
      this.setUserId(response.user.telegram_id);
      if (response.user.language) this.setLanguage(response.user.language);
    }
    return response;
  }

  // ─── Questions ─────────────────────────────────────────────────────
  async getQuestionsFeed(limit = 5, mode = 'swipe') {
    return this.request(`/questions/feed?limit=${limit}&mode=${mode}&language=${this.language}`);
  }

  async recordSwipe(questionId, status) {
    return this.request('/questions/swipe', {
      method: 'POST',
      body: JSON.stringify({ questionId, status }),
    });
  }

  async submitTestAnswer(questionId, answer) {
    return this.request('/questions/test-answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
  }

  async submitBugHuntAnswer(questionId, answer) {
    return this.request('/questions/bug-hunt-answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
  }

  async submitBlitzAnswer(questionId, answer, clientIsCorrect = false) {
    return this.request('/questions/blitz-answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer: !!answer, clientIsCorrect: Boolean(clientIsCorrect) }),
    });
  }

  async evaluateInterviewAnswer(question, answer) {
    return this.request('/questions/interview-evaluate', {
      method: 'POST',
      body: JSON.stringify({ question, answer, language: this.language }),
    });
  }

  async submitCodeCompletionAnswer(questionId, answer) {
    return this.request('/questions/code-completion-answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
  }

  async getExplanation(questionId) {
    return this.request('/questions/explain', {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  }

  // Override request() error to include server `detail` field
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const authHeaders = await this.getAuthHeaders();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 
          'Content-Type': 'application/json', 
          ...authHeaders,
          ...options.headers 
        },
      });

      if (response.status === 401 && endpoint !== '/auth/login') {
        const { default: useStore } = await import('../store/useStore');
        useStore.getState().logout();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  async requestGeneration(type, questionText, shortAnswer, category, questionId) {
    return this.request(`/generate/${type}`, {
      method: 'POST',
      body: JSON.stringify({
        questionText, shortAnswer, category,
        questionId,          // needed so worker backfills questions table columns
        language: this.language,
      }),
    });
  }

  // ─── Stats ─────────────────────────────────────────────────────────
  async getStats() {
    return this.request(`/stats?language=${this.language}`);
  }

  // Category-scoped progress for topic counter (§3)
  async getCategoryStats(categories) {
    const cats = encodeURIComponent(JSON.stringify(categories));
    return this.request(`/stats/categories?language=${this.language}&categories=${cats}`);
  }

  // ─── Preferences ───────────────────────────────────────────────────
  async getCategories() {
    return this.request(`/categories?language=${this.language}`);
  }

  async getPreferences() {
    return this.request('/preferences');
  }

  async updatePreferences(categories, language) {
    return this.request('/preferences', {
      method: 'POST',
      body: JSON.stringify({ categories, language: language || this.language }),
    });
  }

  // Dedicated language-switch endpoint: clears old category filter server-side
  async switchLanguage(language) {
    return this.request('/preferences/language', {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  }

  // ─── Resume ────────────────────────────────────────────────────────
  async analyzeResume(resumeText) {
    return this.request('/user/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeText, language: this.language }),
    });
  }

  // ─── Subscription ──────────────────────────────────────────────────
  async getPlans() {
    return this.request('/subscription/plans');
  }

  async getSubscriptionStatus() {
    return this.request('/subscription/status');
  }

  async subscribe(planId) {
    return this.request('/subscription/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async cancelSubscription() {
    return this.request('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getSubscriptionHistory() {
    return this.request('/subscription/history');
  }

  // ─── Admin ─────────────────────────────────────────────────────────
  async grantPlan(targetUserId, planId, months = 12) {
    return this.request('/admin/grant-plan', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, planId, months }),
    });
  }

  async getAdminUsers() {
    return this.request('/admin/users');
  }
}

export default new ApiClient();