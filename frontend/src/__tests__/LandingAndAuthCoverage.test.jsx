import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Setup browser globals needed for tests
beforeEach(() => {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };

  global.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };

  global.fetch = vi.fn().mockImplementation((url, opts) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => {
        if (url.includes('/demo/questions')) {
          return { questions: [{ language: 'Java', category: 'Core', question: 'What is Polymorphism?', shortAnswer: 'Ability of an object to take many forms.' }] };
        }
        return { success: true };
      }
    });
  });

  class MockWebSocket {
    static OPEN = 1;
    readyState = 1;
    constructor(url) {
      this.url = url;
      setTimeout(() => {
        if (this.onopen) this.onopen();
        if (this.onmessage) {
          this.onmessage({ data: JSON.stringify({ type: 'connected' }) });
          this.onmessage({ data: JSON.stringify({ type: 'partner-joined', partnerName: 'Alex' }) });
          this.onmessage({ data: JSON.stringify({ type: 'message', senderRole: 'interviewer', text: 'Tell me about Java memory model', timestamp: Date.now() }) });
        }
      }, 10);
    }
    send = vi.fn();
    close = vi.fn(() => {
      if (this.onclose) this.onclose();
    });
  }
  global.WebSocket = MockWebSocket;
});

afterEach(() => {
  vi.clearAllMocks();
});

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    sendEmailCode: vi.fn().mockResolvedValue({ success: true }),
    verifyEmailCode: vi.fn().mockResolvedValue({
      user: { id: 1, first_name: 'Dev Tester', email: 'test@example.com', plan: 'pro' },
      token: 'jwt-mock-12345',
    }),
    updateProfile: vi.fn().mockResolvedValue({
      user: { first_name: 'Updated Name', username: 'updated_user' }
    }),
    getQuestionsFeed: vi.fn().mockResolvedValue({ questions: [] }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import Landing from '../components/Landing';
import WebLogin from '../components/WebLogin';
import ProfileScreen from '../components/ProfileScreen';
import ResumeAnalyzer from '../components/ResumeAnalyzer';
import PeerInterviewScreen from '../components/PeerInterviewScreen';
import MockInterviewMode from '../components/MockInterviewMode';

describe('Landing Component', () => {
  it('renders landing page with hero, calculator, pricing and FAQ', async () => {
    const onStart = vi.fn();
    const onLogin = vi.fn();

    const { container } = render(<Landing onStart={onStart} onLogin={onLogin} />);

    // Header and brand
    const brandElements = screen.getAllByText(/Prep-It/i);
    expect(brandElements.length).toBeGreaterThan(0);

    // Login button in nav
    const loginBtn = screen.getByRole('button', { name: /Log in/i });
    fireEvent.click(loginBtn);
    expect(onLogin).toHaveBeenCalled();

    // Calculator interactions
    const seniorBtn = container.querySelector('#calcSeg button[data-level="senior"]');
    expect(seniorBtn).not.toBeNull();
    fireEvent.click(seniorBtn);
    expect(seniorBtn).toHaveClass('active');

    const slider = container.querySelector('#calcTime');
    fireEvent.change(slider, { target: { value: '45' } });
    expect(screen.getByText(/45 min/i)).toBeInTheDocument();

    // Pricing toggle
    const annualBtn = screen.getByRole('button', { name: /Annual/i });
    fireEvent.click(annualBtn);
    expect(annualBtn).toHaveClass('active');

    // B2B form submission
    const b2bEmail = screen.getByPlaceholderText(/Work email/i);
    fireEvent.change(b2bEmail, { target: { value: 'team@techcorp.com' } });
    const b2bConsent = container.querySelector('#b2bConsent');
    fireEvent.click(b2bConsent);

    const b2bSubmit = screen.getByRole('button', { name: /Request access/i });
    fireEvent.click(b2bSubmit);

    await waitFor(() => {
      expect(screen.getByText(/Thanks! We'll reach out/i)).toBeInTheDocument();
    });
  });
});

describe('WebLogin Component', () => {
  it('handles email code request and successful verification', async () => {
    const onAuthenticated = vi.fn();
    const onBack = vi.fn();

    render(<WebLogin onAuthenticated={onAuthenticated} onBack={onBack} />);

    // Initial step: enter email
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'coder@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send code/i });
    fireEvent.click(submitBtn);

    // After sendEmailCode, it should transition to verify step
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/123456/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText(/123456/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Dev Tester' }),
        'jwt-mock-12345',
        expect.anything()
      );
    });
  });

  it('triggers onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<WebLogin onAuthenticated={vi.fn()} onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ProfileScreen Component', () => {
  it('renders profile stats and allows editing display name', async () => {
    const onBack = vi.fn();
    const onSettingsClick = vi.fn();

    useStore.setState({
      user: { id: 42, first_name: 'Original Name', username: 'orig_user', plan: 'pro' },
      stats: { streak: 7, totalQuestions: 100, known: 80 }
    });

    const { container } = render(<ProfileScreen onBack={onBack} onSettingsClick={onSettingsClick} />);

    expect(screen.getByText('Original Name')).toBeInTheDocument();
    expect(screen.getByText('Pro', { selector: '.profile-plan' })).toBeInTheDocument();

    // Click edit button
    const editBtn = screen.getByLabelText('Edit');
    fireEvent.click(editBtn);

    // Change name in input
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // Save
    const saveBtn = screen.getByLabelText('Save');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Updated Name')).toBeInTheDocument();
    });

    // Test back button
    const backBtn = container.querySelector('.back-btn');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ResumeAnalyzer Component', () => {
  it('allows pasting text and analyzes resume', async () => {
    const analyzeMock = vi.fn().mockResolvedValue({
      skills: ['Java', 'Spring Boot', 'PostgreSQL'],
      experienceLevel: 'Middle',
      strengths: ['Clean code', 'Architecture'],
      improvementAreas: ['Kubernetes', 'Reactive programming'],
      suggestedQuestions: ['What is the difference between @Component and @Service?']
    });

    useStore.setState({
      analyzeResume: analyzeMock,
      resumeData: null,
      isAnalyzingResume: false,
    });

    render(<ResumeAnalyzer onBack={vi.fn()} onStartPractice={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/paste/i);
    fireEvent.change(textarea, { target: { value: 'Senior Java engineer with 5 years experience in Spring Boot and Microservices.' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(analyzeBtn);

    expect(analyzeMock).toHaveBeenCalledWith('Senior Java engineer with 5 years experience in Spring Boot and Microservices.');
  });

  it('renders analysis results when resumeData is present and starts practice', () => {
    const onStartPractice = vi.fn();
    const genQuestionsMock = vi.fn().mockResolvedValue(['What is Spring Bean lifecycle?']);

    useStore.setState({
      resumeData: {
        skills: ['Java', 'Spring Boot', 'Docker'],
        experienceLevel: 'Senior',
        strengths: ['Architecture design'],
        improvementAreas: ['GraphQL'],
        suggestedQuestions: ['Explain Java memory model']
      },
      generateResumeQuestions: genQuestionsMock,
    });

    render(<ResumeAnalyzer onBack={vi.fn()} onStartPractice={onStartPractice} />);

    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('Architecture design')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();

    const startBtn = screen.getByText(/Start Practice Based on My Resume/i);
    fireEvent.click(startBtn);

    expect(genQuestionsMock).toHaveBeenCalled();
    expect(onStartPractice).toHaveBeenCalledWith('main');
  });
});

describe('PeerInterviewScreen Component', () => {
  it('connects to websocket and displays messages and partner joining', async () => {
    const onBack = vi.fn();
    useStore.setState({ token: 'mock-jwt-token' });

    const { container } = render(<PeerInterviewScreen onBack={onBack} />);

    // Click Create Room to connect
    const createRoomBtn = screen.getByRole('button', { name: /Create Room/i });
    fireEvent.click(createRoomBtn);

    // Should render interview room UI once connected
    await waitFor(() => {
      expect(screen.getByText(/Alex/i)).toBeInTheDocument();
      expect(screen.getByText(/Tell me about Java memory model/i)).toBeInTheDocument();
    });

    // Send a message
    const textarea = container.querySelector('.peer-input-area textarea');
    fireEvent.change(textarea, { target: { value: 'Hi Alex, ready!' } });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    // End call
    const leaveBtn = container.querySelectorAll('.peer-input-row-bottom button')[2];
    if (leaveBtn) fireEvent.click(leaveBtn);
  });
});

describe('MockInterviewMode Component', () => {
  it('renders questions, supports text answer submission and navigation', async () => {
    const submitAnswerMock = vi.fn().mockResolvedValue({ feedback: 'Good job on explaining JVM!' });
    const nextQuestionMock = vi.fn();

    useStore.setState({
      interviewHistory: [
        { role: 'interviewer', content: 'How does Garbage Collection work in Java?' }
      ],
      isEvaluatingInterview: false,
      submitInterviewAnswer: submitAnswerMock,
      nextInterviewQuestion: nextQuestionMock,
    });

    const { container } = render(<MockInterviewMode />);

    expect(screen.getByText('How does Garbage Collection work in Java?')).toBeInTheDocument();

    const answerInput = screen.getByPlaceholderText(/answer/i);
    fireEvent.change(answerInput, { target: { value: 'GC automatically reclaims heap memory occupied by unreachable objects.' } });

    const sendBtn = container.querySelector('.send-btn');
    fireEvent.click(sendBtn);

    expect(submitAnswerMock).toHaveBeenCalledWith(
      'How does Garbage Collection work in Java?',
      'GC automatically reclaims heap memory occupied by unreachable objects.'
    );
  });
});
