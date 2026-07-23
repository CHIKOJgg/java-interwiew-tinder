const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import logger from '../utils/logger';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
    this.userId = null;
    this.language = 'Java';
  }

  setUserId(userId) { this.userId = String(userId); }
  setLanguage(language) { this.language = language; }

  async getAuthHeaders() {
    if (!this._store) {
      const { default: useStore } = await import('../store/useStore');
      this._store = useStore;
    }
    const token = this._store.getState().token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }


  // ─── Auth ──────────────────────────────────────────────────────────
  // Telegram (Mini App) — backward compatible signature.
  async login(initData, referralId) {
    return this.loginWithProvider({ provider: 'telegram', initData, referralId });
  }

  // Unified multi-provider login (telegram / google / email).
  async loginWithProvider({ provider, initData, idToken, email, code, referralId }) {
    const body = { provider };
    if (initData) body.initData = initData;
    if (idToken) body.idToken = idToken;
    if (email) body.email = email;
    if (code) body.code = code;
    if (referralId) body.referralId = referralId;
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (response.user) {
      this.setUserId(response.user.telegram_id);
      if (response.user.language) this.setLanguage(response.user.language);
    }
    return response;
  }

  async sendEmailCode(email) {
    return this.request('/auth/email/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailCode(email, code, referralId) {
    const body = { email, code };
    if (referralId) body.referralId = referralId;
    const response = await this.request('/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (response.user) this.setUserId(response.user.telegram_id);
    return response;
  }

  // ─── Public demo (zero-login) ──────────────────────────────────────
  async getDemoQuestions(limit = 10, language = 'Java') {
    const params = new URLSearchParams({ limit: String(limit), language });
    return this.request(`/demo/questions?${params.toString()}`);
  }

  async getDemoPercentile(score, language = 'Java') {
    const params = new URLSearchParams({ score: String(score), language });
    return this.request(`/demo/percentile?${params.toString()}`);
  }

  // ─── Questions ─────────────────────────────────────────────────────
  async getQuestionsFeed(limit = 5, mode = 'swipe', { cursor = 0, seed, difficulties, company } = {}) {
    const params = new URLSearchParams({ limit: String(limit), mode, language: this.language });
    if (seed) params.set('seed', seed);
    params.set('cursor', String(cursor));
    if (Array.isArray(difficulties) && difficulties.length > 0) {
      difficulties.forEach(d => params.append('difficulties', d));
    }
    if (company) params.set('company', company);
    return this.request(`/questions/feed?${params.toString()}`);
  }

  async recordSwipe(questionId, status) {
    return this.request('/questions/swipe', {
      method: 'POST',
      body: JSON.stringify({ questionId, status }),
    });
  }

  // Flush zero-login demo answers (stored in localStorage) into the user's
  // real progress after they sign up — see POST /api/questions/import-progress.
  async importProgress(items) {
    return this.request('/questions/import-progress', {
      method: 'POST',
      body: JSON.stringify({ items }),
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
    const method = (options.method || 'GET').toUpperCase();
    const authHeaders = await this.getAuthHeaders();
    logger.api(`${method} ${endpoint}`);

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
        logger.warn(`API 401 Session expired [${endpoint}]`);
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const thrown = new Error(err.detail || err.error || `HTTP ${response.status}`);
        thrown.status = response.status;
        thrown.feature = err.feature || null;
        thrown.code = err.code || null;
        logger.error(`API ${response.status} ${method} ${endpoint}:`, err.detail || err.error || response.statusText, thrown.feature ? `feature=${thrown.feature}` : '');
        throw thrown;
      }
      logger.api(`${response.status} ${method} ${endpoint}`);
      return response.json();
    } catch (error) {
      if (error.status) {
        // already logged above for HTTP errors
      } else {
        logger.error(`API Error [${endpoint}]:`, error.message);
      }
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

  async getCompanies() {
    return this.request('/companies');
  }

  async getPreferences() {
    return this.request('/preferences');
  }

  async updatePreferences(categories, language, company) {
    return this.request('/preferences', {
      method: 'POST',
      body: JSON.stringify({ categories, language: language || this.language, company }),
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

  async getAdminMetrics() {
    return this.request('/admin/metrics');
  }

  // sendStarsInvoice: triggers Bot API sendInvoice, returns { sent: true }
  async sendStarsInvoice(planId, interval = 'monthly') {
    return this.request('/billing/stars/invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, interval }),
    });
  }

  // Keep old alias for backward compatibility
  async createStarsInvoice(planId, interval = 'monthly') {
    return this.sendStarsInvoice(planId, interval);
  }

  // ─── Saved / bookmarked questions ─────────────────────────────────
  async saveQuestion(questionId) {
    return this.request('/questions/save', {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  }

  async unsaveQuestion(questionId) {
    return this.request('/questions/save', {
      method: 'DELETE',
      body: JSON.stringify({ questionId }),
    });
  }

  async getSavedQuestions() {
    return this.request('/questions/saved');
  }

  // ─── TON Crypto ────────────────────────────────────────────────────
  async createTonInvoice(planId, interval = 'monthly') {
    return this.request('/billing/ton/invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, interval }),
    });
  }

  async checkTonPayment() {
    return this.request('/billing/ton/check', {
      method: 'GET'
    });
  }

  async getBillingInfo() {
    return this.request('/billing/info');
  }

  async getBillingMethods() {
    return this.request('/billing/methods');
  }

  async createUkassaPayment(planId, interval = 'monthly', returnUrl) {
    return this.request('/billing/ukassa/invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, interval, returnUrl }),
    });
  }

  async getBillingHistory() {
    return this.request('/billing/history');
  }

  async deleteSubscription() {
    return this.request('/billing/subscription', {
      method: 'DELETE'
    });
  }

  async getPercentile(score) {
    return this.request(`/stats/percentile?language=${this.language}&score=${score}`);
  }

  async getReferralStats() {
    return this.request('/referrals/stats');
  }

  async reportQuestion(questionId, reason, comment) {
    return this.request(`/questions/${questionId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, comment })
    });
  }

  // Weak / mistakes review deck (Pro). `mode=review` is required so the
  // server-side entitlement gate recognises the request.
  async getWeakQuestions(limit = 50) {
    const params = new URLSearchParams({ mode: 'review', language: this.language, limit: String(limit) });
    return this.request(`/questions/weak?${params.toString()}`);
  }

  // --- Admin ---
  async getAdminReports() {
    return this.request('/admin/reports');
  }

  async approveReport(questionId) {
    return this.request(`/admin/reports/${questionId}/approve`, { method: 'POST' });
  }

  async deleteQuestion(questionId) {
    return this.request(`/admin/questions/${questionId}`, { method: 'DELETE' });
  }

  async updateQuestion(questionId, question_text, short_answer) {
    return this.request(`/admin/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ question_text, short_answer })
    });
  }

  // ─── Learning Tracks ─────────────────────────────────────────────
  async getTracks(language) {
    const params = new URLSearchParams({ language: language || this.language });
    return this.request(`/tracks?${params.toString()}`);
  }

  async getTrack(trackId) {
    return this.request(`/tracks/${trackId}`);
  }

  async getNextTrackQuestion(trackId) {
    return this.request(`/tracks/${trackId}/next`);
  }

  async advanceTrack(trackId) {
    return this.request(`/tracks/${trackId}/advance`, { method: 'POST' });
  }

  // ─── Code Execution ──────────────────────────────────────────────
  async executeCode(code, language, stdin) {
    return this.request('/execute', {
      method: 'POST',
      body: JSON.stringify({ code, language, stdin }),
    });
  }

  // ─── Stats History ───────────────────────────────────────────────
  async getStatsHistory(period = '7d') {
    const params = new URLSearchParams({ period, language: this.language });
    return this.request(`/stats/history?${params.toString()}`);
  }

  async getTopicStats() {
    const params = new URLSearchParams({ language: this.language });
    return this.request(`/stats/topics?${params.toString()}`);
  }

  // ─── Challenges ──────────────────────────────────────────────────
  async getCurrentChallenge(language) {
    const params = new URLSearchParams({ language: language || this.language });
    return this.request(`/challenges/current?${params.toString()}`);
  }

  async submitChallengeResult(challengeId, score, questionsAnswered, accuracy) {
    return this.request('/challenges/submit', {
      method: 'POST',
      body: JSON.stringify({ challengeId, score, questionsAnswered, accuracy }),
    });
  }

  async getLeaderboard(language) {
    const params = new URLSearchParams({ language: language || this.language });
    return this.request(`/challenges/leaderboard?${params.toString()}`);
  }

  // ─── Certificates ────────────────────────────────────────────────
  async generateCertificate(trackId, title, score) {
    return this.request('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ trackId, title, score }),
    });
  }

  async getCertificates() {
    return this.request('/certificates');
  }

  // ─── System Design ──────────────────────────────────────────────
  async getSDTopics(language, difficulty) {
    const params = new URLSearchParams({ language: language || this.language });
    if (difficulty) params.set('difficulty', difficulty);
    return this.request(`/system-design/topics?${params.toString()}`);
  }

  async getSDTopicDetail(topicId) {
    return this.request(`/system-design/topics/${topicId}`);
  }

  async evaluateSDAnswer(topicId, answer) {
    return this.request('/system-design/evaluate', {
      method: 'POST',
      body: JSON.stringify({ topicId, answer, language: this.language }),
    });
  }

  async getSDProgress() {
    return this.request('/system-design/progress');
  }
}

export default new ApiClient();