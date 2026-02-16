const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userId = null;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
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
    }
    
    return response;
  }

  // Questions
  async getQuestionsFeed(limit = 10) {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    
    return await this.request(`/questions/feed?userId=${this.userId}&limit=${limit}`);
  }

  async recordSwipe(questionId, status) {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }

    return await this.request('/questions/swipe', {
      method: 'POST',
      body: JSON.stringify({
        userId: this.userId,
        questionId,
        status,
      }),
    });
  }

  async getExplanation(questionId) {
    return await this.request('/questions/explain', {
      method: 'POST',
      body: JSON.stringify({ questionId }),
    });
  }

  // Statistics
  async getStats() {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }

    return await this.request(`/stats?userId=${this.userId}`);
  }
}

export default new ApiClient();
