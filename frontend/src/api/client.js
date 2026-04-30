const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
    this.userId = null;
    this.language = 'Java';
  }

  setUserId(userId) { this.userId = userId; }
  setLanguage(language) { this.language = language; }

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error [${cleanEndpoint}]:`, error);
      throw error;
    }
  }

  // Auth
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

  // Questions — lazy loading
  async getQuestionsFeed(limit = 5, mode = 'swipe') {
    if (!this.userId) throw new Error('User not authenticated');
    return this.request(`/questions/feed?userId=${this.userId}&limit=${limit}&mode=${mode}&language=${this.language}`);
  }

  // Generation polling
  async requestGeneration(type, questionText, shortAnswer, category) {
    return this.request(`/generate/${type}`, {
      method: 'POST',
      body: JSON.stringify({ questionText, shortAnswer, category, userId: this.userId, language: this.language }),
    });
  }

  // Answer recording
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

  async analyzeResume(resumeText) {
    return this.request('/user/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, resumeText, language: this.language }),
    });
  }

  async getExplanation(questionId) {
    return this.request('/questions/explain', {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  }

  async getStats() { return this.request(`/stats?userId=${this.userId}&language=${this.language}`); }
  async getCategories() { return this.request(`/categories?language=${this.language}`); }
  async getLanguages() { return this.request('/languages'); }
  async getPreferences() { return this.request(`/preferences/${this.userId}`); }

  async updatePreferences(categories, language) {
    return this.request('/preferences', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, categories, language: language || this.language }),
    });
  }

  // Subscription — fixed method names to match backend routes
  async getPlans() { return this.request('/subscription/plans'); }
  async getSubscriptionStatus() { return this.request(`/subscription/status/${this.userId}`); }
  async subscribe(planId) {
    return this.request('/subscription/subscribe', {
      method: 'POST',
      body: JSON.stringify({ userId: this.userId, planId }),
    });
  }
}

export default new ApiClient();
