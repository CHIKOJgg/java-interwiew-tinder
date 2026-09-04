import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import TopQuestionsScreen from '../components/TopQuestionsScreen';

describe('TopQuestionsScreen Component & Store Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getTopQuestions').mockResolvedValue({
      questions: [
        {
          id: 1,
          question: 'What is JVM?',
          shortAnswer: 'Java Virtual Machine executing bytecode',
          category: 'Core Java',
          difficulty: 'Junior',
          topRank: 1,
          isTop: true,
        },
        {
          id: 2,
          question: 'How does HashMap work?',
          shortAnswer: 'Array of buckets with collision trees',
          category: 'Collections',
          difficulty: 'Middle',
          topRank: 2,
          isTop: true,
        },
      ],
      total: 2,
      hasMore: false,
    });
    vi.spyOn(apiClient, 'getTopStats').mockResolvedValue({
      total: 2,
      categories: [{ name: 'Core Java', count: 1 }, { name: 'Collections', count: 1 }],
    });
    useStore.setState({
      language: 'Java',
      topQuestions: [
        {
          id: 1,
          question: 'What is JVM?',
          shortAnswer: 'Java Virtual Machine executing bytecode',
          category: 'Core Java',
          difficulty: 'Junior',
          topRank: 1,
          isTop: true,
        },
        {
          id: 2,
          question: 'How does HashMap work?',
          shortAnswer: 'Array of buckets with collision trees',
          category: 'Collections',
          difficulty: 'Middle',
          topRank: 2,
          isTop: true,
        },
      ],
      isLoadingTopQuestions: false,
      savedIds: {},
      filterOnlyTop: false,
      learningMode: 'swipe',
    });
  });

  it('renders top questions list with rank badges', async () => {
    render(<TopQuestionsScreen onBack={vi.fn()} onPractice={vi.fn()} />);

    expect(await screen.findByText('What is JVM?')).toBeDefined();
    expect(await screen.findByText('#1')).toBeDefined();
    expect(await screen.findByText('How does HashMap work?')).toBeDefined();
    expect(await screen.findByText('#2')).toBeDefined();
  });

  it('filters list using in-screen search input', async () => {
    render(<TopQuestionsScreen onBack={vi.fn()} onPractice={vi.fn()} />);

    expect(await screen.findByText('What is JVM?')).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Search top questions/i);
    fireEvent.change(searchInput, { target: { value: 'HashMap' } });

    expect(screen.getByText('How does HashMap work?')).toBeDefined();
    expect(screen.queryByText('What is JVM?')).toBeNull();
  });

  it('triggers onPractice and updates store state when practice button is clicked', async () => {
    const onPracticeMock = vi.fn();
    vi.spyOn(useStore.getState(), 'loadQuestions').mockResolvedValue();

    render(<TopQuestionsScreen onBack={vi.fn()} onPractice={onPracticeMock} />);

    const startBtn = await screen.findByText('Start');
    fireEvent.click(startBtn);

    expect(useStore.getState().filterOnlyTop).toBe(true);
    expect(onPracticeMock).toHaveBeenCalled();
  });

  it('expands answer accordion on card header click', async () => {
    render(<TopQuestionsScreen onBack={vi.fn()} onPractice={vi.fn()} />);

    const questionText = await screen.findByText('What is JVM?');
    fireEvent.click(questionText);

    expect(await screen.findByText('Java Virtual Machine executing bytecode')).toBeDefined();
  });
});
