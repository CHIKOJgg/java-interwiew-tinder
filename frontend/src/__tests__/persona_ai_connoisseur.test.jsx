import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';
import apiClient from '../api/client';

describe('Persona 2: AI Connoisseur (Frontend Pipeline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      questions: [
        { id: 42, question: 'What is G1 GC in Java?', shortAnswer: 'Garbage First Collector' },
        { id: 43, question: 'Explain synchronized keyword', shortAnswer: 'Intrinsic locking' },
      ],
      currentIndex: 0,
      showExplanation: false,
      currentExplanation: null,
      isLoadingExplanation: false,
      aiLimitReached: null,
      aiLimitDismissed: false,
      interviewHistory: [],
      isEvaluatingInterview: false,
      resumeData: null,
      isAnalyzingResume: false,
    });
  });

  it('loads and displays AI explanation in modal', async () => {
    vi.spyOn(apiClient, 'getExplanation').mockResolvedValue({
      explanation: '### G1 Garbage Collector\n\nG1 divides the heap into equal sized regions...',
      cached: true,
    });

    await useStore.getState().loadExplanation(42);

    const state = useStore.getState();
    expect(state.showExplanation).toBe(true);
    expect(state.isLoadingExplanation).toBe(false);
    expect(state.currentExplanation).toContain('G1 Garbage Collector');
  });

  it('triggers Pro upgrade payload when DAILY_AI_LIMIT is returned', async () => {
    const limitError = new Error('Daily limit reached');
    limitError.code = 'DAILY_AI_LIMIT';
    limitError.used = 5;
    limitError.limit = 5;
    vi.spyOn(apiClient, 'getExplanation').mockRejectedValue(limitError);

    await useStore.getState().loadExplanation(42);

    const state = useStore.getState();
    expect(state.showExplanation).toBe(true);
    expect(state.isLoadingExplanation).toBe(false);
    expect(state.aiLimitReached).toEqual({ used: 5, limit: 5, light: false });
  });

  it('polls when AI explanation status is pending', async () => {
    vi.useFakeTimers();

    let calls = 0;
    vi.spyOn(apiClient, 'getExplanation').mockImplementation(async () => {
      calls++;
      if (calls === 1) return { status: 'pending' };
      return { explanation: 'Generated explanation completed on retry', cached: false };
    });

    const promise = useStore.getState().loadExplanation(42);
    // Fast-forward 1500ms timer
    await vi.runAllTimersAsync();
    await promise;

    const state = useStore.getState();
    expect(calls).toBe(2);
    expect(state.currentExplanation).toContain('Generated explanation completed on retry');

    vi.useRealTimers();
  });

  it('evaluates mock interview answer and stores structured score & feedback', async () => {
    vi.spyOn(apiClient, 'evaluateInterviewAnswer').mockResolvedValue({
      score: 9,
      feedback: 'Excellent answer detailing Java memory management.',
      correctVersion: 'Consider mentioning ZGC for low-latency workloads.',
    });

    useStore.getState().startInterview();
    expect(useStore.getState().interviewHistory).toHaveLength(1);
    expect(useStore.getState().interviewHistory[0].role).toBe('interviewer');

    await useStore.getState().submitInterviewAnswer('What is G1 GC in Java?', 'G1 is a regional garbage collector introduced to replace CMS.');

    const history = useStore.getState().interviewHistory;
    expect(history).toHaveLength(2);
    expect(history[1].role).toBe('candidate');
    expect(history[1].evaluation).toEqual({
      score: 9,
      feedback: 'Excellent answer detailing Java memory management.',
      correctVersion: 'Consider mentioning ZGC for low-latency workloads.',
    });
  });

  it('analyzes resume and stores parsed profile data', async () => {
    const resumeData = {
      experienceLevel: 'Senior',
      strengths: ['Java 21', 'Spring Cloud', 'Kafka'],
      weaknesses: ['Kubernetes'],
    };
    vi.spyOn(apiClient, 'analyzeResume').mockResolvedValue({
      success: true,
      parsedData: resumeData,
    });

    const result = await useStore.getState().analyzeResume('Experienced Java Backend Architect...');
    expect(result).toEqual(resumeData);
    expect(useStore.getState().resumeData).toEqual(resumeData);

    useStore.getState().clearResumeData();
    expect(useStore.getState().resumeData).toBeNull();
  });
});
