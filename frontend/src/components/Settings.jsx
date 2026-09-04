import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import {
  ArrowLeft, Bell, Globe, Info, HelpCircle, Mail, MessageCircle,
  ChevronRight, Shield, Star, FileText, Target, TrendingUp, Award,
  Download, User, Video, Building2, Languages, Smartphone,
} from 'lucide-react';
import Mascot from './Mascot';
import './Settings.css';

const STUDY_LANGS = { Java: 'Java', Python: 'Python', TypeScript: 'TS', Go: 'Go', Rust: 'Rust', React: 'React', Kotlin: 'Kotlin' };

const FAQ_ITEMS = [
  { qKey: 'landing.faq1_q', aKey: 'landing.faq1_a' },
  { qKey: 'landing.faq2_q', aKey: 'landing.faq2_a' },
  { qKey: 'landing.faq3_q', aKey: 'landing.faq3_a' },
  { qKey: 'landing.faq4_q', aKey: 'landing.faq4_a' },
];

function Settings({ onBack, onNavigate, onExport, onHelp }) {
  const { t, i18n } = useTranslation();
  const { language, switchLanguage, setInterfaceLanguage, user } = useStore();
  const [notifications, setNotifications] = useState(true);
  const isPremium = user?.plan && user.plan !== 'free';

  const quickLinks = [
    { key: 'header.subscription', icon: Star, screen: 'subscriptions', highlight: !isPremium, tag: isPremium ? 'PRO' : null },
    { key: 'header.resume', icon: FileText, screen: 'resume' },
    { key: 'header.vacancy', icon: Target, screen: 'vacancy' },
    { key: 'header.trends', icon: TrendingUp, screen: 'trends' },
    { key: 'header.achievements', icon: Award, screen: 'achievements' },
    { key: 'header.profile', icon: User, screen: 'profile' },
    { key: 'header.companies', icon: Building2, screen: 'companies' },
    { key: 'header.peer_interview', icon: Video, screen: 'peer-interview' },
    { key: 'header.help', icon: HelpCircle, action: onHelp },
  ];
  if (user?.plan === 'admin') quickLinks.push({ key: 'header.admin', icon: Shield, screen: 'admin' });

  const linkRow = (item) => (
    <button
      key={item.key}
      className={`settings-link-row ${item.highlight ? 'highlight' : ''}`}
      onClick={() => (item.action ? item.action() : onNavigate(item.screen))}
      type="button"
    >
      <item.icon size={18} />
      <span>{t(item.key)}</span>
      {item.tag && <span className="row-tag">{item.tag}</span>}
      <ChevronRight size={16} className="settings-chevron" />
    </button>
  );

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

          <div className="settings-group">
            <div className="settings-group-label">
              <Languages size={16} /> {t('header.interface_lang', 'Interface language')}
            </div>
            <div className="settings-chips">
              <button
                type="button"
                className={`settings-chip ${i18n.language === 'ru' ? 'active' : ''}`}
                onClick={() => setInterfaceLanguage('ru')}
              >RU</button>
              <button
                type="button"
                className={`settings-chip ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => setInterfaceLanguage('en')}
              >EN</button>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-label">
              <Globe size={16} /> {t('header.study_lang', 'Study language')}
            </div>
            <div className="settings-chips">
              {Object.entries(STUDY_LANGS).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  className={`settings-chip ${language === id ? 'active' : ''}`}
                  onClick={() => switchLanguage(id)}
                >{lbl}</button>
              ))}
            </div>
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
          <h2 className="settings-section-title"><Info size={16} /> {t('settings.menu', 'Menu')}</h2>
          <div className="settings-link-list">
            {quickLinks.map(linkRow)}
            <button className="settings-link-row" onClick={() => onExport?.()} type="button">
              <Download size={18} />
              <span>{t('header.export', 'Export')}</span>
              <ChevronRight size={16} className="settings-chevron" />
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
