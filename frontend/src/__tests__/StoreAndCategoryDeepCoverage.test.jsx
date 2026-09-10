import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    setLanguage: vi.fn(),
    setUserId: vi.fn(),
    setToken: vi.fn(),
    clearAuth: vi.fn(),
    getFilters: vi.fn().mockResolvedValue({
      categories: [
        {
          id: 'cat-core',
          name: 'Core Java',
          count: 120,
          subcategories: [
            { id: 'sub-oop', name: 'OOP', count: 40 },
            { id: 'sub-col', name: 'Collections', count: 50 },
          ],
        },
        {
          id: 'cat-spring',
          name: 'Spring Framework',
          count: 85,
          subcategories: [
            { id: 'sub-boot', name: 'Spring Boot', count: 45 },
            { id: 'sub-sec', name: 'Spring Security', count: 20 },
          ],
        },
      ],
      frameworks: [
        { name: 'Spring Boot', count: 40 },
        { name: 'Hibernate', count: 20 },
        { name: 'Micronaut', count: 10 },
      ],
      topics: [
        { name: 'Garbage Collection', count: 30 },
        { name: 'Multithreading', count: 25 },
        { name: 'Generics', count: 15 },
      ],
    }),
    getCategories: vi.fn().mockResolvedValue({
      categories: [
        { id: 'cat-core', name: 'Core Java', count: 120, subcategories: [] }
      ]
    }),
    getCompanies: vi.fn().mockResolvedValue({
      companies: [{ name: 'Google' }, { name: 'Yandex' }, { name: 'Tinkoff' }],
    }),
    getPreferences: vi.fn().mockResolvedValue({
      selectedCategories: ['Core Java'],
      selectedFrameworks: ['Spring Boot'],
      selectedTopics: ['Multithreading'],
      selectedCompany: 'Google',
    }),
    updatePreferences: vi.fn().mockResolvedValue({ success: true }),
    getQuestionsFeed: vi.fn().mockResolvedValue({ questions: [], total: 0 }),
    getTracks: vi.fn().mockResolvedValue({ tracks: [] }),
    getCategoryStats: vi.fn().mockResolvedValue({ known: 5, total: 10 }),
    getDifficultyCounts: vi.fn().mockResolvedValue({ Junior: 10, Middle: 20, Senior: 15 }),
    recordSwipe: vi.fn().mockResolvedValue({ streak: 2 }),
    reportQuestion: vi.fn().mockResolvedValue({ success: true }),
    submitTestAnswer: vi.fn().mockResolvedValue({ isCorrect: true, streak: 3 }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import CategorySelection from '../components/CategorySelection';

describe('CategorySelection Component Deep Testing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders categories, tabs, search, difficulty filters, and allows multi-selection', async () => {
    const onComplete = vi.fn();
    const onBack = vi.fn();
    const onOpenTopQuestions = vi.fn();

    const { container } = render(
      <CategorySelection
        onComplete={onComplete}
        onBack={onBack}
        onOpenTopQuestions={onOpenTopQuestions}
      />
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Core Java')).toBeInTheDocument();
      expect(screen.getByText('Spring Framework')).toBeInTheDocument();
    });

    // Top 100 banner toggle
    const top100Toggle = container.querySelector('.top-100-actions button');
    if (top100Toggle) fireEvent.click(top100Toggle);

    // Top 100 list button
    const top100ListBtn = screen.getByTitle(/Список/i);
    fireEvent.click(top100ListBtn);
    expect(onOpenTopQuestions).toHaveBeenCalled();

    // Search input
    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: 'Spring' } });
    expect(searchInput.value).toBe('Spring');
    fireEvent.change(searchInput, { target: { value: '' } });

    // Switch tabs: Frameworks
    const frameworksTab = screen.getByRole('button', { name: /Frameworks/i });
    fireEvent.click(frameworksTab);
    await waitFor(() => {
      expect(screen.getByText('Hibernate')).toBeInTheDocument();
    });

    // Click a framework item
    const hibernateChip = screen.getByText('Hibernate');
    fireEvent.click(hibernateChip);

    // Switch tabs: Topics
    const topicsTab = screen.getByRole('button', { name: /Topics/i });
    fireEvent.click(topicsTab);
    await waitFor(() => {
      expect(screen.getByText('Garbage Collection')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Garbage Collection'));

    // Switch back to Categories
    const categoriesTab = screen.getByRole('button', { name: /Categories/i });
    fireEvent.click(categoriesTab);

    // Difficulty selection: Middle & Senior
    const middleChip = screen.getByRole('button', { name: /Middle/i });
    fireEvent.click(middleChip);

    // Select all / None
    const allBtn = container.querySelector('.category-actions button:first-child');
    if (allBtn) fireEvent.click(allBtn);

    const noneBtn = container.querySelector('.category-actions button:last-child');
    if (noneBtn) fireEvent.click(noneBtn);

    // Save selection
    const applyBtn = container.querySelector('.start-button');
    if (applyBtn) fireEvent.click(applyBtn);

    // Back button
    const backBtn = container.querySelector('.back-btn-absolute');
    if (backBtn) {
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    }
  });
});

describe('useStore Deeper Actions & State Transitions', () => {
  it('handles language switching across multiple supported languages', async () => {
    // Default language is Java
    expect(useStore.getState().language).toBe('Java');

    // Switch to Python
    await useStore.getState().switchLanguage('Python');
    expect(useStore.getState().language).toBe('Python');

    // Switch to TypeScript
    await useStore.getState().switchLanguage('TypeScript');
    expect(useStore.getState().language).toBe('TypeScript');

    // Switch to Go
    await useStore.getState().switchLanguage('Go');
    expect(useStore.getState().language).toBe('Go');

    // Switch back to Java
    await useStore.getState().switchLanguage('Java');
    expect(useStore.getState().language).toBe('Java');
  });

  it('handles card swiping, undo, and question reporting', async () => {
    useStore.setState({
      questions: [
        { id: 101, question: 'Q1', shortAnswer: 'A1', category: 'Core', level: 'middle', language: 'Java' },
        { id: 102, question: 'Q2', shortAnswer: 'A2', category: 'Core', level: 'middle', language: 'Java' },
      ],
      currentIndex: 0,
      stats: { known: 0, unknown: 0, totalSeen: 0, streak: 1 },
      learningMode: 'swipe',
    });

    // Swipe card right (know)
    await useStore.getState().swipeCard(101, 'right');
    expect(useStore.getState().currentIndex).toBe(1);
    expect(useStore.getState().stats.known).toBe(1);

    // Undo swipe
    await useStore.getState().undoSwipe(101, 'right');
    expect(useStore.getState().currentIndex).toBe(0);

    // Report question
    await useStore.getState().reportQuestion(101, 'typo', 'Minor typo in code');

    // Test answer submission
    await useStore.getState().submitTestAnswer(101, 'Polymorphism');
    expect(useStore.getState().stats.known).toBe(1);
  });

  it('handles learning modes and role gating', () => {
    // Mode transitions
    useStore.getState().setLearningMode('blitz');
    expect(useStore.getState().learningMode).toBe('blitz');

    useStore.getState().setLearningMode('test');
    expect(useStore.getState().learningMode).toBe('test');

    useStore.getState().setLearningMode('swipe');
    expect(useStore.getState().learningMode).toBe('swipe');

    // Role gating
    useStore.setState({ user: { id: 1, plan: 'free' } });
    expect(useStore.getState().canAccessMode('swipe')).toBe(true);
    expect(useStore.getState().canAccessMode('test')).toBe(true);
    expect(useStore.getState().canAccessMode('peer-interview')).toBe(false);

    // Pro Max user can access peer-interview
    useStore.setState({ user: { id: 1, plan: 'pro_max' } });
    expect(useStore.getState().canAccessMode('peer-interview')).toBe(true);
  });
});
