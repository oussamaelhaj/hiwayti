/**
 * i18n/index.js — HIWAYTI Multilingual Setup
 * Languages: French (default), Arabic, English
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

const LANG_KEY = '@hiwayti_lang';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    callback(saved || 'fr');
  },
  init: () => {},
  cacheUserLanguage: async (lang) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    resources: { fr: { translation: fr }, ar: { translation: ar }, en: { translation: en } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
