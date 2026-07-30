import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DeckComplete({ onChooseOther, onShare }) {
  const { t } = useTranslation();
  return (
    <div className="completion-screen">
      <CheckCircle size={64} className="completion-icon" />
      <h2>{t('completion.title')}</h2>
      <p>{t('completion.desc')}</p>
      <button onClick={onChooseOther}>
        {t('completion.choose_other')}
      </button>
      <button onClick={onShare} className="completion-secondary-btn">
        {t('completion.share')}
      </button>
    </div>
  );
}
