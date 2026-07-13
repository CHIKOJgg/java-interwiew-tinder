import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import './ProNudge.css';

// Subtle, non-intrusive reminders for free users. They rotate through a few
// value-oriented tips and are easy to dismiss (per session).
const TIPS = ['tip_1', 'tip_2', 'tip_3', 'tip_4'];

const ProNudge = ({ onOpenSubscription }) => {
  const { t } = useTranslation();
  const { isPro, dismissedNudges, dismissNudge } = useStore();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const tipId = TIPS[index];

  useEffect(() => {
    // Pick a stable tip for this session, but only if not already dismissed
    // (per session) and not already shown earlier today (once-per-day gate).
    const seed = Math.floor(Math.random() * TIPS.length);
    setIndex(seed);
    const tipId = TIPS[seed];
    if (isPro()) return;
    try {
      const dayKey = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(`jit_nudge_${tipId}_${dayKey}`)) return;
    } catch { /* ignore */ }
    if (dismissedNudges.includes(tipId)) return;
    // Slight delay so it feels gentle, not aggressive.
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [isPro, dismissedNudges]);

  const handleDismiss = () => {
    dismissNudge(tipId);
    try {
      const dayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`jit_nudge_${tipId}_${dayKey}`, '1');
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible || isPro()) return null;

  return (
    <div className="pro-nudge">
      <Sparkles size={14} className="pro-nudge-spark" />
      <span className="pro-nudge-text">{t(`nudge.${tipId}`)}</span>
      <button className="pro-nudge-open" onClick={onOpenSubscription} type="button">⭐ Pro</button>
      <button className="pro-nudge-dismiss" onClick={handleDismiss} type="button" aria-label="dismiss">
        <X size={13} />
      </button>
    </div>
  );
};

export default ProNudge;
