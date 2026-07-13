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

  useEffect(() => {
    // Pick a stable tip for this session, but only if not already dismissed.
    const seed = Math.floor(Math.random() * TIPS.length);
    setIndex(seed);
    const tipId = TIPS[seed];
    if (!isPro() && !dismissedNudges.includes(tipId)) {
      // Slight delay so it feels gentle, not aggressive.
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [isPro, dismissedNudges]);

  if (!visible || isPro()) return null;

  const tipId = TIPS[index];
  const handleDismiss = () => {
    dismissNudge(tipId);
    setVisible(false);
  };

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
