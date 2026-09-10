import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    getDemoQuestions: vi.fn().mockResolvedValue({
      questions: [
        { id: 'demo_1', question: 'What is the difference between == and .equals() in Java?', shortAnswer: '== compares references; .equals() compares values.', category: 'Core Java', difficulty: 'Junior' },
      ],
    }),
    getDemoPercentile: vi.fn().mockResolvedValue({ percentile: 90 }),
    getSDTopics: vi.fn().mockResolvedValue({
      topics: [
        {
          id: 1,
          title: 'Design URL Shortener',
          description: 'Design TinyURL system',
          difficulty: 'Middle',
          requirements: ['High availability', 'Low latency'],
        },
      ],
    }),
    getSDTopicDetail: vi.fn().mockResolvedValue({
      topic: {
        id: 1,
        title: 'Design URL Shortener',
        description: 'Design TinyURL system',
        difficulty: 'Middle',
        requirements: ['High availability', 'Low latency'],
      },
      progress: {},
    }),
    evaluateSDAnswer: vi.fn().mockResolvedValue({
      score: 85,
      feedback: 'Great architecture design!',
    }),
    fetchGeneration: vi.fn().mockResolvedValue({ options: [] }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import BlitzMode from '../components/BlitzMode';
import BugHuntingMode from '../components/BugHuntingMode';
import CodeCompletionMode from '../components/CodeCompletionMode';
import ConceptLinker from '../components/ConceptLinker';
import SystemDesignMode from '../components/SystemDesignMode';
import TestMode from '../components/TestMode';
import DemoMode from '../components/DemoMode';

describe('BlitzMode Component', () => {
  it('renders start screen when blitz is idle and launches active round', () => {
    const startBlitzMock = vi.fn();
    useStore.setState({
      blitzIdle: true,
      isBlitzActive: false,
      startBlitz: startBlitzMock,
      questions: [],
      currentIndex: 0,
    });

    const { container } = render(<BlitzMode />);
    const startBtn = container.querySelector('.start-blitz-button');
    expect(startBtn).toBeTruthy();

    fireEvent.click(startBtn);
    expect(startBlitzMock).toHaveBeenCalled();
  });

  it('renders active blitz with true/false buttons', () => {
    const submitBlitzAnswerMock = vi.fn();
    useStore.setState({
      blitzIdle: false,
      isBlitzActive: true,
      blitzTimeLeft: 30,
      blitzScore: 3,
      questions: [
        {
          id: 101,
          question: 'Is Java statically typed?',
          shortAnswer: 'Yes, types are checked at compile time.',
          blitzData: {
            statement: 'Java is dynamically typed.',
            isCorrect: false,
          },
        },
      ],
      currentIndex: 0,
      decrementBlitzTime: vi.fn(),
      submitBlitzAnswer: submitBlitzAnswerMock,
    });

    const { container } = render(<BlitzMode />);

    expect(screen.getByText('Java is dynamically typed.')).toBeInTheDocument();

    const falseBtn = container.querySelector('.false-btn');
    expect(falseBtn).toBeTruthy();
    fireEvent.click(falseBtn);
    expect(submitBlitzAnswerMock).toHaveBeenCalledWith(101, false, true);
  });
});

describe('BugHuntingMode Component', () => {
  it('renders buggy code, lets user select an option, and submits', async () => {
    const submitBugHuntAnswerMock = vi.fn().mockResolvedValue({
      isCorrect: true,
      correctAnswer: 'Fix loop condition to i < length',
    });

    useStore.setState({
      language: 'Java',
      questions: [
        {
          id: 201,
          question: 'Find the ArrayIndexOutOfBounds bug',
          bugHuntingData: {
            code: 'for (int i = 0; i <= arr.length; i++) { sum += arr[i]; }',
            options: [
              'Fix loop condition to i < length',
              'Change int to long',
              'Initialize sum to 1',
            ],
          },
        },
      ],
      currentIndex: 0,
      submitBugHuntAnswer: submitBugHuntAnswerMock,
      fetchGeneration: vi.fn(),
    });

    const { container } = render(<BugHuntingMode />);

    const optBtn = screen.getByText('Fix loop condition to i < length');
    fireEvent.click(optBtn);

    const submitBtn = container.querySelector('.submit-bug-button');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitBugHuntAnswerMock).toHaveBeenCalledWith(201, 'Fix loop condition to i < length');
    });
  });
});

describe('CodeCompletionMode Component', () => {
  it('renders snippet with blanks, selects missing token, and submits', async () => {
    const submitCodeCompletionAnswerMock = vi.fn().mockResolvedValue({
      isCorrect: true,
      correctAnswer: 'extends',
    });

    useStore.setState({
      language: 'Java',
      questions: [
        {
          id: 301,
          question: 'Fill in the keyword to inherit a class',
          codeCompletionData: {
            snippet: 'class Dog ___ Animal {}',
            options: ['extends', 'implements', 'inherits', 'uses'],
          },
        },
      ],
      currentIndex: 0,
      submitCodeCompletionAnswer: submitCodeCompletionAnswerMock,
      fetchGeneration: vi.fn(),
    });

    const { container } = render(<CodeCompletionMode />);

    const extendsBtn = screen.getByText('extends');
    fireEvent.click(extendsBtn);

    const submitBtn = container.querySelector('.submit-completion-btn');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitCodeCompletionAnswerMock).toHaveBeenCalledWith(301, 'extends');
    });
  });
});

describe('ConceptLinker Component', () => {
  it('renders terms and definitions and handles selection', () => {
    useStore.setState({
      questions: [
        { id: 401, question: 'Encapsulation', shortAnswer: 'Hiding internal state' },
        { id: 402, question: 'Polymorphism', shortAnswer: 'Taking many forms' },
      ],
      currentIndex: 0,
      recordLinkerMatches: vi.fn(),
    });

    render(<ConceptLinker />);

    expect(screen.getByText('Encapsulation')).toBeInTheDocument();
    expect(screen.getByText('Polymorphism')).toBeInTheDocument();
    expect(screen.getByText('Hiding internal state')).toBeInTheDocument();
    expect(screen.getByText('Taking many forms')).toBeInTheDocument();

    // Select term and def
    fireEvent.click(screen.getByText('Encapsulation'));
    fireEvent.click(screen.getByText('Hiding internal state'));
  });
});

describe('SystemDesignMode Component', () => {
  it('renders topics in list view and switches to detail view', async () => {
    const loadSDTopicDetailMock = vi.fn();
    useStore.setState({
      language: 'Java',
      sdScreen: 'list',
      sdTopics: [
        {
          id: 1,
          title: 'Design URL Shortener',
          description: 'Design TinyURL system',
          difficulty: 'Middle',
          requirements: ['High availability', 'Low latency'],
        },
      ],
      loadSDTopics: vi.fn().mockResolvedValue([]),
      loadSDTopicDetail: loadSDTopicDetailMock,
    });

    render(<SystemDesignMode />);

    expect(screen.getByText('Design URL Shortener')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Design URL Shortener'));
    expect(loadSDTopicDetailMock).toHaveBeenCalledWith(1);
  });

  it('renders topic detail with requirements and answer submission', async () => {
    useStore.setState({
      language: 'Java',
      sdScreen: 'detail',
      sdCurrentTopic: {
        topic: {
          id: 1,
          title: 'Design URL Shortener',
          description: 'Design TinyURL system',
          difficulty: 'Middle',
          requirements: ['High availability', 'Low latency'],
        },
      },
      submitSDEvaluation: vi.fn().mockResolvedValue({ score: 90 }),
    });

    render(<SystemDesignMode />);

    expect(screen.getByText('Design URL Shortener')).toBeInTheDocument();
    expect(screen.getByText('Design TinyURL system')).toBeInTheDocument();
    expect(screen.getByText('High availability')).toBeInTheDocument();
  });
});

describe('TestMode Component', () => {
  it('renders test question and handles option submission', async () => {
    const submitTestAnswerMock = vi.fn().mockResolvedValue({
      isCorrect: true,
      correctAnswer: 'O(1)',
    });

    useStore.setState({
      language: 'Java',
      distractorPool: ['O(n)', 'O(log n)', 'O(n^2)'],
      loadDistractors: vi.fn().mockResolvedValue([]),
      questions: [
        {
          id: 501,
          question: 'What is HashMap get complexity?',
          shortAnswer: 'O(1)',
          options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
        },
      ],
      currentIndex: 0,
      submitTestAnswer: submitTestAnswerMock,
    });

    const { container } = render(<TestMode />);

    expect(screen.getByText('What is HashMap get complexity?')).toBeInTheDocument();
    expect(screen.getByText('O(1)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('O(1)'));

    const submitBtn = container.querySelector('.submit-test-button');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitTestAnswerMock).toHaveBeenCalled();
    });
  });
});

describe('DemoMode Component', () => {
  it('renders zero-login demo with fallback questions and handles flip', async () => {
    const onSignup = vi.fn();
    const onExit = vi.fn();

    const { container } = render(
      <DemoMode onSignup={onSignup} onExit={onExit} referralId="ref1" />
    );

    await waitFor(() => {
      expect(screen.getByText(/What is the difference between == and \.equals\(\)/i)).toBeInTheDocument();
    });

    // Flip card
    const cardInner = container.querySelector('.demo-card-inner');
    if (cardInner) {
      fireEvent.click(cardInner);
      expect(screen.getByText(/compares references/i)).toBeInTheDocument();
    }
  });
});
