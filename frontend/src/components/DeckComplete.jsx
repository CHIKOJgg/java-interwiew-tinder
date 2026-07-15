import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Shared "deck complete" screen shown when a question feed is exhausted
// (swipe mode and the other feed-based learning modes).
export default function DeckComplete({ onChooseOther, onShare }) {
  const { t } = useTranslation();
  return (
    <div className="completion-screen">
      <CheckCircle size={64} color="#51cf66" />
      <h2>{t('completion.title')}</h2>
      <p>{t('completion.desc')}</p>
      <button onClick={onChooseOther}>
        {t('completion.choose_other')}
      </button>
      <button
        onClick={onShare}
        style={{ marginTop: 10, background: 'rgba(51, 154, 240, 0.1)', color: '#339af0' }}
      >
        {t('completion.share')}
      </button>
    </div>
  );
}
