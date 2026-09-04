import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';
import api from '../api/client';
import CategorySelection from '../components/CategorySelection';

describe('CategorySelection Component & Scrolling Structure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    vi.spyOn(api, 'getFilters').mockResolvedValue({
      categories: [
        { name: 'Core Java', count: 120 },
        { name: 'Collections', count: 85 },
        { name: 'Multithreading', count: 45 },
        { name: 'Spring Boot', count: 60 },
      ],
      frameworks: [
        { name: 'Spring', count: 70 },
        { name: 'Hibernate', count: 30 },
      ],
      topics: [
        { name: 'Generics', count: 25 },
        { name: 'JVM', count: 40 },
      ],
    });

    vi.spyOn(api, 'getCompanies').mockResolvedValue({
      companies: [
        { name: 'Google' },
        { name: 'Amazon' },
        { name: 'Meta' },
        { name: 'Yandex' },
      ],
    });

    vi.spyOn(api, 'getPreferences').mockResolvedValue({
      selectedCategories: [],
      selectedFrameworks: [],
      selectedTopics: [],
      selectedCompany: null,
    });

    vi.spyOn(api, 'updatePreferences').mockResolvedValue({ success: true });

    useStore.setState({
      selectedCategories: [],
      selectedDifficulties: [],
      selectedCompany: null,
      selectedFrameworks: [],
      selectedTopics: [],
    });
  });

  it('renders header, tabs, action buttons, difficulty and company chips', async () => {
    render(<CategorySelection onComplete={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Core Java')).toBeInTheDocument();
    });

    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Multithreading')).toBeInTheDocument();
    expect(screen.getByText('Spring Boot')).toBeInTheDocument();

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();

    expect(screen.getByText('Junior')).toBeInTheDocument();
    expect(screen.getByText('Middle')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('allows selecting categories and updates selected count', async () => {
    render(<CategorySelection onComplete={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Core Java')).toBeInTheDocument();
    });

    const card = screen.getByText('Core Java').closest('.category-card');
    fireEvent.pointerUp(card, { button: 0 });

    await waitFor(() => {
      expect(screen.getByText(/Selected:\s*1\s*\/\s*4/i)).toBeInTheDocument();
    });
  });

  it('allows clicking apply to save selections and call onComplete', async () => {
    const onComplete = vi.fn();
    render(<CategorySelection onComplete={onComplete} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Core Java')).toBeInTheDocument();
    });

    const card = screen.getByText('Core Java').closest('.category-card');
    fireEvent.pointerUp(card, { button: 0 });

    const applyBtn = screen.getByText('Apply');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('verifies root container has correct CSS class for scrolling', async () => {
    const { container } = render(<CategorySelection onComplete={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Core Java')).toBeInTheDocument();
    });

    const root = container.querySelector('.category-selection');
    expect(root).toBeInTheDocument();

    const header = container.querySelector('.category-header');
    expect(header).toBeInTheDocument();

    const footer = container.querySelector('.category-footer');
    expect(footer).toBeInTheDocument();

    const companyChips = container.querySelector('.company-chips');
    expect(companyChips).toBeInTheDocument();
  });
});
