import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { ArrowLeft, Bell, Globe, Moon, Info, HelpCircle, Mail, MessageCircle, ChevronRight, Shield, Smartphone } from 'lucide-react';
import Mascot from './Mascot';
import './Settings.css';

const FAQ_ITEMS = [
  { qKey: 'faq.faq1_q', aKey: 'faq.faq1_a' },
  { qKey: 'faq.faq2_q', aKey: 'faq.faq2_a' },
  { qKey: 'faq.faq3_q', aKey: 'faq.faq3_a' },
  { qKey: 'faq.faq4_q', aKey: 'faq.faq4_a' },
];

function Settings({ onBack }) {
  const { t } = useTranslation();
  const { language, switchLanguage } = useStore();
  const [notifications, setNotifications] = useState(true);

  const handleLanguageToggle = () => {
    const next = language === 'en' ? 'ru' : 'en';
    switchLanguage(next);
  };

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('header.settings', 'Settings')}</h1>
        <Mascot size={28} className="settings-mascot" />
      </div>

      <div className="settings-body">
        <section className="settings-section">
          <h2 className="settings-section-title"><Globe size={16} /> {t('settings.preferences', 'Preferences')}</h2>
          <div className="settings-row">
            <div className="settings-row-label">
              <Globe size={18} />
              <span>{t('settings.language', 'Language')}</span>
            </div>
            <button className="settings-toggle" onClick={handleLanguageToggle} type="button">
              {language === 'en' ? 'English' : 'Русский'}
            </button>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <Bell size={18} />
              <span>{t('settings.notifications', 'Notifications')}</span>
            </div>
            <button
              className={`settings-toggle ${notifications ? 'on' : 'off'}`}
              onClick={() => setNotifications(!notifications)}
              type="button"
            >
              {notifications ? t('common.on', 'On') : t('common.off', 'Off')}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title"><Info size={16} /> {t('settings.about', 'About')}</h2>
          <div className="settings-info-row">
            <Mascot size={20} />
            <span>Prep-It v1.0</span>
          </div>
          <div className="settings-info-row">
            <Smartphone size={18} />
            <span>{t('settings.platform', 'Platform')}: Web / Telegram Mini App</span>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title"><HelpCircle size={16} /> {t('settings.support', 'Support')}</h2>
          <a href="mailto:support@prepit.app" className="settings-link-row">
            <Mail size={18} />
            <span>support@prepit.app</span>
            <ChevronRight size={16} className="settings-chevron" />
          </a>
          <a href="https://t.me/prepit_support" target="_blank" rel="noopener noreferrer" className="settings-link-row">
            <MessageCircle size={18} />
            <span>@prepit_support</span>
            <ChevronRight size={16} className="settings-chevron" />
          </a>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title"><HelpCircle size={16} /> FAQ</h2>
          <div className="settings-faq">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="settings-qa">
                <summary>{t(item.qKey)}</summary>
                <p>{t(item.aKey)}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
