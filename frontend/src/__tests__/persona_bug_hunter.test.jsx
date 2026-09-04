import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';
import apiClient from '../api/client';

describe('Persona 3: Bug Hunter (Frontend Pipeline & Adversarial Edge Cases)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      questions: [
        {
          id: 50,
          question: 'Find bug in concurrent map access',
          category: 'Multithreading',
          bugHuntingData: {
            code: 'Map<String, String> map = new HashMap<>();\nmap.put("a", "b");',
            options: ['Needs ConcurrentHashMap', 'NullPointerException', 'StackOverflow'],
            correctAnswer: 'Needs ConcurrentHashMap',
          },
        },
      ],
      currentIndex: 0,
      learningMode: 'bug-hunting',
      stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 1, streak: 0, longestStreak: 0 },
    });
  });

  it('submits bug hunt answer and updates local state with feedback', async () => {
    vi.spyOn(apiClient, 'submitBugHuntAnswer').mockResolvedValue({
      success: true,
      isCorrect: true,
      correctAnswer: 'Needs ConcurrentHashMap',
    });

    const response = await useStore.getState().submitBugHuntAnswer(50, 'Needs ConcurrentHashMap');
    expect(response.isCorrect).toBe(true);
    expect(response.correctAnswer).toBe('Needs ConcurrentHashMap');
  });

  it('handles incorrect bug hunt submission and marks state appropriately', async () => {
    vi.spyOn(apiClient, 'submitBugHuntAnswer').mockResolvedValue({
      success: true,
      isCorrect: false,
      correctAnswer: 'Needs ConcurrentHashMap',
    });
    vi.spyOn(apiClient, 'getExplanation').mockResolvedValue({
      explanation: 'HashMap is not thread-safe. Use ConcurrentHashMap to prevent race conditions.',
      cached: true,
    });

    const response = await useStore.getState().submitBugHuntAnswer(50, 'NullPointerException');
    expect(response.isCorrect).toBe(false);

    // If incorrect, store automatically triggers explanation load
    const state = useStore.getState();
    expect(state.showExplanation).toBe(true);
  });

  it('safely handles adversarial HTML/XSS inside question content without throwing', () => {
    const maliciousQuestion = {
      id: 999,
      question: '<script>alert("XSS")</script><img src="x" onerror="stealCookies()">',
      shortAnswer: '<b onmouseover="eval(code)">Hover me</b>',
      category: 'Security',
      difficulty: 'Senior',
    };

    useStore.setState({
      questions: [maliciousQuestion],
      currentIndex: 0,
    });

    const current = useStore.getState().getCurrentQuestion();
    expect(current.id).toBe(999);
    expect(current.question).toContain('<script>');
  });

  it('handles network failure during bug hunt submission gracefully', async () => {
    vi.spyOn(apiClient, 'submitBugHuntAnswer').mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(
      useStore.getState().submitBugHuntAnswer(50, 'Needs ConcurrentHashMap')
    ).rejects.toThrow('500 Internal Server Error');
  });
});
