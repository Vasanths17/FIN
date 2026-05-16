import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import ml from './locales/ml.json';
import kn from './locales/kn.json';

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
  te: { translation: te },
  ml: { translation: ml },
  kn: { translation: kn },
};

const supportedLanguages = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];

const getDeviceLanguage = (): string => {
  const locales = RNLocalize.getLocales();
  for (const locale of locales) {
    const lang = locale.languageCode;
    if (supportedLanguages.includes(lang)) {
      return lang;
    }
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
