import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, translations, getTranslation } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ARISO_RETAIL_LANGUAGE') || 'en';
  });

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguage(langCode);
      localStorage.setItem('ARISO_RETAIL_LANGUAGE', langCode);
    }
  };

  const t = (key) => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key) => getTranslation('en', key),
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }
  return context;
}
