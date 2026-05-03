const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
    this.userId = null;
    this.language = 'Java';
  }

  setUserId(userId) { this.userId = String(userId); }
  setLanguage(language) { this.language = language; }


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
    if (!this.userId) throw new Error('User not authenticated');
    return this.request(`/questions/feed?userId=${this.userId}&limit=${limit}&mode=${mode}&language=${this.language}`);
  }

  async recordSwipe(questionId, status) {
    return this.request('/questions/swipe', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, questionId, status }),
    });
  }

  async submitTestAnswer(questionId, answer) {
    return this.request('/questions/test-answer', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, questionId, answer }),
    });
  }

  async submitBugHuntAnswer(questionId, answer) {
    return this.request('/questions/bug-hunt-answer', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, questionId, answer }),
    });
  }

  async submitBlitzAnswer(questionId, answer) {
    return this.request('/questions/blitz-answer', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, questionId, answer: !!answer }),
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
      body: JSON.stringify({ userId: this.userId, questionId, answer }),
    });
  }

  async getExplanation(questionId) {
    return this.request('/questions/explain', {
      method: 'POST',
      body: JSON.stringify({ questionId, userId: this.userId }),
    });
  }

  // Override request() error to include server `detail` field
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        // Prefer server's `detail` field (AI errors), fall back to `error`
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
        userId: this.userId,
        questionId,          // needed so worker backfills questions table columns
        language: this.language,
      }),
    });
  }

  // ─── Stats ─────────────────────────────────────────────────────────
  async getStats() {
    return this.request(`/stats?userId=${this.userId}&language=${this.language}`);
  }

  // ─── Preferences ───────────────────────────────────────────────────
  async getCategories() {
    return this.request(`/categories?language=${this.language}`);
  }

  async getPreferences() {
    return this.request(`/preferences/${this.userId}`);
  }

  async updatePreferences(categories, language) {
    return this.request('/preferences', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, categories, language: language || this.language }),
    });
  }

  // Dedicated language-switch endpoint: clears old category filter server-side
  async switchLanguage(userId, language) {
    return this.request('/preferences/language', {
      method: 'POST',
      body: JSON.stringify({ userId, language }),
    });
  }

  // ─── Resume ────────────────────────────────────────────────────────
  async analyzeResume(resumeText) {
    return this.request('/user/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, resumeText, language: this.language }),
    });
  }

  // ─── Subscription ──────────────────────────────────────────────────
  async getPlans() {
    return this.request('/subscription/plans');
  }

  async getSubscriptionStatus() {
    return this.request(`/subscription/status/${this.userId}`);
  }

  async subscribe(planId) {
    return this.request('/subscription/subscribe', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, planId }),
    });
  }

  async cancelSubscription() {
    return this.request('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId }),
    });
  }

  async getSubscriptionHistory() {
    return this.request(`/subscription/history/${this.userId}`);
  }

  // ─── Admin ─────────────────────────────────────────────────────────
  async grantPlan(targetUserId, planId, months = 12) {
    return this.request('/admin/grant-plan', {
      method: 'POST',
      body: JSON.stringify({ adminUserId: this.userId, targetUserId, planId, months }),
    });
  }

  async getAdminUsers() {
    return this.request(`/admin/users?adminUserId=${this.userId}`);
  }
}

export default new ApiClient();
