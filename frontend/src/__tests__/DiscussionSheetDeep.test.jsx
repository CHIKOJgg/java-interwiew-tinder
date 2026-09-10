import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscussionSheet from '../components/DiscussionSheet';
import useStore from '../store/useStore';
import apiClient from '../api/client';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('DiscussionSheet Deep Coverage', () => {
  const defaultProps = {
    questionId: 101,
    onClose: vi.fn(),
    isOwner: true,
  };

  const sampleDiscussions = [
    {
      id: 501,
      content: 'Here is how to solve it properly',
      code_snippet: 'Optional.ofNullable(val).orElse(defaultVal);',
      first_name: 'Alice',
      upvotes: 4,
      user_vote: 0,
      is_solution: false,
      reply_count: 1,
      replies: [
        {
          id: 502,
          content: 'Great explanation!',
          code_snippet: '',
          first_name: 'Bob',
          upvotes: 2,
          user_vote: 1,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { telegram_id: 12345, username: 'testuser' },
      isAuthenticated: true,
    });
  });

  it('renders loading state and then discussions', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValueOnce({
      discussions: sampleDiscussions,
    });

    render(<DiscussionSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Here is how to solve it properly')).toBeTruthy();
      expect(screen.getByText('Optional.ofNullable(val).orElse(defaultVal);')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  it('renders empty state when no discussions found', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValueOnce({
      discussions: [],
    });

    render(<DiscussionSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('discussions.empty')).toBeTruthy();
    });
  });

  it('votes on a discussion thread and a reply', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValue({
      discussions: sampleDiscussions,
    });
    const voteSpy = vi.spyOn(apiClient, 'voteDiscussion').mockResolvedValue({ success: true });

    render(<DiscussionSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Here is how to solve it properly')).toBeTruthy();
    });

    const upvoteBtn = screen.getByLabelText('discussions.upvote');
    fireEvent.click(upvoteBtn);
    expect(voteSpy).toHaveBeenCalledWith(501, 1);

    const downvoteBtn = screen.getByLabelText('discussions.downvote');
    fireEvent.click(downvoteBtn);
    expect(voteSpy).toHaveBeenCalledWith(501, -1);
  });

  it('posts a new reply to an existing discussion thread', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValue({
      discussions: sampleDiscussions,
    });
    const createSpy = vi.spyOn(apiClient, 'createDiscussion').mockResolvedValue({ id: 503 });

    render(<DiscussionSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Here is how to solve it properly')).toBeTruthy();
    });

    // Click reply button
    const replyBtn = screen.getByText(/discussions\.reply/);
    fireEvent.click(replyBtn);

    // Target the reply textarea inside .disc-reply-form
    const textareas = screen.getAllByPlaceholderText('discussions.placeholder');
    fireEvent.change(textareas[0], { target: { value: 'My reply text' } });

    const codeInputs = screen.getAllByPlaceholderText('discussions.code_placeholder');
    fireEvent.change(codeInputs[0], { target: { value: 'System.out.println("hi");' } });

    const postReplyBtn = screen.getAllByText(/discussions\.reply/i).slice(-1)[0];
    fireEvent.click(postReplyBtn);

    expect(createSpy).toHaveBeenCalledWith(101, 'My reply text', 'System.out.println("hi");', 501);
  });

  it('marks a discussion as solution when isOwner is true', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValue({
      discussions: sampleDiscussions,
    });
    const markSpy = vi.spyOn(apiClient, 'markSolution').mockResolvedValue({ success: true });

    render(<DiscussionSheet {...defaultProps} isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText('discussions.mark_solution')).toBeTruthy();
    });

    const markBtn = screen.getByText('discussions.mark_solution');
    fireEvent.click(markBtn);
    expect(markSpy).toHaveBeenCalledWith(501);
  });

  it('posts a new top-level discussion', async () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValue({
      discussions: [],
    });
    const createSpy = vi.spyOn(apiClient, 'createDiscussion').mockResolvedValue({ id: 504 });

    render(<DiscussionSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('discussions.empty')).toBeTruthy();
    });

    const textarea = screen.getByPlaceholderText('discussions.placeholder');
    fireEvent.change(textarea, { target: { value: 'New main topic discussion' } });

    const postBtn = screen.getByText(/discussions\.post/);
    fireEvent.click(postBtn);

    expect(createSpy).toHaveBeenCalledWith(101, 'New main topic discussion', undefined);
  });

  it('closes on overlay or close button click', () => {
    vi.spyOn(apiClient, 'getDiscussions').mockResolvedValue({ discussions: [] });
    render(<DiscussionSheet {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
