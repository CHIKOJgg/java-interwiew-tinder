import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../components/Settings';
import useStore from '../store/useStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
    i18n: { language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('Settings Screen Deep Coverage', () => {
  const defaultProps = {
    onBack: vi.fn(),
    onNavigate: vi.fn(),
    onExport: vi.fn(),
    onHelp: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      language: 'Java',
      switchLanguage: vi.fn(),
      setInterfaceLanguage: vi.fn(),
      user: {
        id: 1,
        username: 'settings_user',
        plan: 'admin',
      },
    });
  });

  it('renders settings header and back button triggers onBack', () => {
    render(<Settings {...defaultProps} />);

    const backBtn = screen.getByRole('button', { name: '' }) || screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('switches interface language between RU and EN', () => {
    const setInterfaceLanguage = vi.fn();
    useStore.setState({ setInterfaceLanguage });

    render(<Settings {...defaultProps} />);

    const enBtn = screen.getByText('EN');
    fireEvent.click(enBtn);
    expect(setInterfaceLanguage).toHaveBeenCalledWith('en');

    const ruBtn = screen.getByText('RU');
    fireEvent.click(ruBtn);
    expect(setInterfaceLanguage).toHaveBeenCalledWith('ru');
  });

  it('switches study languages', () => {
    const switchLanguage = vi.fn();
    useStore.setState({ switchLanguage, language: 'Java' });

    render(<Settings {...defaultProps} />);

    const pythonBtn = screen.getByText('Python');
    fireEvent.click(pythonBtn);
    expect(switchLanguage).toHaveBeenCalledWith('Python');

    const goBtn = screen.getByText('Go');
    fireEvent.click(goBtn);
    expect(switchLanguage).toHaveBeenCalledWith('Go');
  });

  it('toggles notifications', () => {
    render(<Settings {...defaultProps} />);

    const notifBtn = screen.getByText('On');
    fireEvent.click(notifBtn);
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('handles navigation rows for quick links, export and help', () => {
    render(<Settings {...defaultProps} />);

    // Click Top Questions link
    const topRow = screen.getByText('top.title');
    fireEvent.click(topRow);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('top-questions');

    // Click Help link
    const helpRow = screen.getByText('header.help');
    fireEvent.click(helpRow);
    expect(defaultProps.onHelp).toHaveBeenCalledTimes(1);

    // Click Admin link (available since plan is admin)
    const adminRow = screen.getByText('header.admin');
    fireEvent.click(adminRow);
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('admin');

    // Click Export link (fallback text 'Export')
    const exportRow = screen.getByText('Export');
    fireEvent.click(exportRow);
    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('expands FAQ accordions and displays support links', () => {
    render(<Settings {...defaultProps} />);

    const faqSummaries = screen.getAllByRole('group'); // <details> elements
    expect(faqSummaries.length).toBeGreaterThan(0);

    expect(screen.getByText('support@prepit.app')).toBeTruthy();
    expect(screen.getByText('@prepit_support')).toBeTruthy();
  });
});
