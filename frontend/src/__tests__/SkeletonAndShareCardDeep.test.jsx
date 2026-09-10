import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkeletonCard, SkeletonText, SkeletonGrid, SkeletonExplanation } from '../components/Skeleton';
import ShareCard from '../components/ShareCard';
import useStore from '../store/useStore';
import apiClient from '../api/client';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('Skeleton Components Deep Coverage', () => {
  it('renders all skeleton variants properly', () => {
    const { container: c1 } = render(<SkeletonCard />);
    expect(c1.querySelector('.skeleton-card')).toBeTruthy();

    const { container: c2 } = render(<SkeletonText lines={4} width="80%" />);
    expect(c2.querySelectorAll('.skeleton-line').length).toBe(4);

    const { container: c3 } = render(<SkeletonGrid count={5} />);
    expect(c3.querySelectorAll('.skeleton-grid-item').length).toBe(5);

    const { container: c4 } = render(<SkeletonExplanation />);
    expect(c4.querySelector('.skeleton-explanation')).toBeTruthy();
  });
});

describe('ShareCard Component Deep Coverage', () => {
  const defaultProps = {
    stats: { streak: 5, known: 25 },
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { id: 1, telegram_id: 123456 },
      language: 'Java',
    });
  });

  it('renders stats, percentile and closes on back click', async () => {
    vi.spyOn(apiClient, 'getPercentile').mockResolvedValueOnce({ percentile: 85 });

    render(<ShareCard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('25')).toBeTruthy();
    });

    const closeBtn = screen.getByRole('button', { name: '' }) || screen.getAllByRole('button')[0];
    fireEvent.click(closeBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('copies share url to clipboard', async () => {
    vi.spyOn(apiClient, 'getPercentile').mockResolvedValueOnce({ percentile: 90 });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<ShareCard {...defaultProps} />);

    const copyBtn = screen.getByText('Copy link');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText(/Copied!/i)).toBeTruthy();
    });
  });

  it('handles Share to X and Share to Chat via window.open', async () => {
    vi.spyOn(apiClient, 'getPercentile').mockResolvedValueOnce({ percentile: 90 });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ShareCard {...defaultProps} />);

    // Share to X
    const xBtn = screen.getByText('Share on X');
    fireEvent.click(xBtn);
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('twitter.com/intent/tweet'), '_blank');

    // Share to Chat (friends)
    const chatBtn = screen.getByText('share.friends');
    fireEvent.click(chatBtn);
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('t.me/share/url'), '_blank');
  });

  it('shares to story via Telegram SDK if available', async () => {
    vi.spyOn(apiClient, 'getPercentile').mockResolvedValueOnce({ percentile: 90 });
    const shareToStoryMock = vi.fn();
    window.Telegram = {
      WebApp: {
        shareToStory: shareToStoryMock,
      },
    };

    render(<ShareCard {...defaultProps} />);

    const storyBtn = screen.getByText('share.story');
    fireEvent.click(storyBtn);

    expect(shareToStoryMock).toHaveBeenCalled();
  });
});
