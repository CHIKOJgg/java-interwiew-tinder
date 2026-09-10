import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AbbreviationGlossary from '../components/AbbreviationGlossary';
import { ABBREVIATIONS } from '../data/abbreviations';
import '../i18n/config';

describe('AbbreviationGlossary component', () => {
  it('renders correctly with term count and search input', () => {
    render(<AbbreviationGlossary onBack={vi.fn()} onPractice={vi.fn()} />);
    
    // Header check
    expect(screen.getByPlaceholderText(/DIP, ACID/i)).toBeDefined();
    expect(screen.getByText(new RegExp(`${ABBREVIATIONS.length}`, 'i'))).toBeDefined();
  });

  it('filters abbreviations by search input', () => {
    render(<AbbreviationGlossary onBack={vi.fn()} onPractice={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/DIP, ACID/i);
    fireEvent.change(input, { target: { value: 'DIP' } });

    expect(screen.getByText('Dependency Inversion Principle')).toBeDefined();
    expect(screen.queryByText('Command Query Responsibility Segregation')).toBeNull();
  });

  it('expands card to reveal interview trap when clicked', () => {
    render(<AbbreviationGlossary onBack={vi.fn()} onPractice={vi.fn()} />);
    
    const dipCard = screen.getByText('Dependency Inversion Principle').closest('.glossary-card');
    expect(dipCard).toBeDefined();
    
    // Initially trap header is not expanded
    expect(dipCard.querySelector('.glossary-trap-box')).toBeNull();
    
    // Click to expand
    fireEvent.click(dipCard);
    expect(dipCard.querySelector('.glossary-trap-box')).toBeDefined();
    expect(dipCard.textContent).toContain('DIP');
  });

  it('calls onPractice when practice button is clicked', () => {
    const handlePractice = vi.fn();
    render(<AbbreviationGlossary onBack={vi.fn()} onPractice={handlePractice} />);
    
    const practiceBtn = screen.getByRole('button', { name: /тренировать|practice/i });
    fireEvent.click(practiceBtn);
    expect(handlePractice).toHaveBeenCalledTimes(1);
  });
});
