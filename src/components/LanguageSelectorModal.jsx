import React from 'react';
import { useLanguage } from '../locales/LanguageContext';

export default function LanguageSelectorModal({ isOpen, onClose }) {
  const { language, changeLanguage, supportedLanguages, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🌐 {t('languageSettings')}</h2>
            <p style={styles.subTitle}>{t('selectLanguage')}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.grid}>
          {supportedLanguages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                style={{
                  ...styles.langCard,
                  ...(isSelected ? styles.langCardSelected : {})
                }}
                onClick={() => {
                  changeLanguage(lang.code);
                  onClose();
                }}
              >
                <div style={styles.radioBox}>
                  {isSelected ? '🔘' : '⚪'}
                </div>
                <div>
                  <div style={styles.nativeName}>{lang.nativeName}</div>
                  <div style={styles.englishName}>{lang.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={styles.footer}>
          <button style={styles.closeModalBtn} onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    padding: '24px',
    border: '1px solid #334155',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    color: '#F8FAFC',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '800',
    margin: 0,
    color: '#F8FAFC',
  },
  subTitle: {
    fontSize: '13px',
    color: '#94A3B8',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: '#334155',
    border: 'none',
    color: '#CBD5E1',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
    maxHeight: '380px',
    overflowY: 'auto',
    marginBottom: '20px',
    paddingRight: '4px',
  },
  langCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  langCardSelected: {
    border: '2px solid #F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  radioBox: {
    fontSize: '18px',
    marginRight: '12px',
  },
  nativeName: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#F8FAFC',
  },
  englishName: {
    fontSize: '11px',
    color: '#94A3B8',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeModalBtn: {
    backgroundColor: '#334155',
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: '14px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
  },
};
