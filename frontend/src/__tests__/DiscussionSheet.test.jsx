import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        'discussions.title': 'Discussion',
        'discussions.empty': 'No discussions yet. Be the first to comment!',
        'discussions.placeholder': 'Share your approach, ask a question, or post a code solution...',
        'discussions.code_placeholder': 'Optional: add a code snippet',
        'discussions.post': 'Post',
        'discussions.reply': 'Reply',
        'discussions.upvote': 'Upvote',
        'discussions.downvote': 'Downvote',
        'discussions.solution': 'Accepted solution',
        'discussions.mark_solution': 'Mark as solution',
        'discussions.login_to_comment': 'Sign in to join the discussion',
        'discussions.cancel': 'Cancel',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('../api/client', () => ({
  default: {
    getDiscussions: vi.fn(),
    createDiscussion: vi.fn(),
    voteDiscussion: vi.fn(),
    markSolution: vi.fn(),
  }
}));

vi.mock('../store/useStore', () => ({
  default: vi.fn(() => ({
    user: { telegram_id: 42, first_name: 'TestUser' },
    isAuthenticated: true,
  }))
}));

describe('DiscussionSheet', () => {
  let apiClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    apiClient = (await import('../api/client')).default;
    apiClient.getDiscussions.mockResolvedValue({ discussions: [] });
  });

  it('renders empty state when no discussions', async () => {
    const DiscussionSheet = (await import('../components/DiscussionSheet.jsx')).default;
    render(React.createElement(DiscussionSheet, { questionId: 1, onClose: vi.fn(), isOwner: false }));

    await waitFor(() => {
      expect(screen.getByText(/No discussions yet/i)).toBeDefined();
    });
  });

  it('renders discussion threads', async () => {
    const discussions = [
      { id: 1, content: 'Great question!', upvotes: 3, user_vote: 0, reply_count: 0,
        first_name: 'Alice', created_at: new Date().toISOString(), is_solution: false }
    ];
    apiClient.getDiscussions.mockResolvedValue({ discussions });

    const DiscussionSheet = (await import('../components/DiscussionSheet.jsx')).default;
    render(React.createElement(DiscussionSheet, { questionId: 1, onClose: vi.fn(), isOwner: false }));

    await waitFor(() => {
      expect(screen.getByText('Great question!')).toBeDefined();
    });
  });

  it('loads discussions on mount', async () => {
    const DiscussionSheet = (await import('../components/DiscussionSheet.jsx')).default;
    render(React.createElement(DiscussionSheet, { questionId: 42, onClose: vi.fn(), isOwner: false }));

    await waitFor(() => {
      expect(apiClient.getDiscussions).toHaveBeenCalledWith(42);
    });
  });

  it('shows login note when not authenticated', async () => {
    const useStore = (await import('../store/useStore')).default;
    useStore.mockReturnValueOnce({ user: null, isAuthenticated: false });

    const DiscussionSheet = (await import('../components/DiscussionSheet.jsx')).default;
    render(React.createElement(DiscussionSheet, { questionId: 1, onClose: vi.fn(), isOwner: false }));

    await waitFor(() => {
      expect(screen.getByText(/Sign in to join/i)).toBeDefined();
    });
  });

  it('shows reply form for authenticated users', async () => {
    const DiscussionSheet = (await import('../components/DiscussionSheet.jsx')).default;
    render(React.createElement(DiscussionSheet, { questionId: 1, onClose: vi.fn(), isOwner: false }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Share your approach/i)).toBeDefined();
    });
  });
});
