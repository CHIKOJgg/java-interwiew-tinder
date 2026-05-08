import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ru from './ru.json';

const getInitialLanguage = () => {
  const tgLanguage = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLanguage && (tgLanguage === 'ru' || tgLanguage === 'en')) {
    return tgLanguage;
  }
  
  const savedLang = localStorage.getItem('app_language');
  if (savedLang) return savedLang;
  
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'ru' || browserLang === 'en') return browserLang;
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app_language', lng);
});

export default i18n;
