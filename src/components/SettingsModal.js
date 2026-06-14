'use client';

import { Globe, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ onClose }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('settings.title')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Globe size={20} />
            <div>
              <h3>{t('settings.language')}</h3>
              <p>{t('settings.languageDescription')}</p>
            </div>
          </div>
          <div className={styles.langOptions}>
            <button
              type="button"
              className={`${styles.langButton} ${lang === 'en' ? styles.langActive : ''}`}
              onClick={() => setLang('en')}
            >
              <span className={styles.langFlag}>EN</span>
              <span>{t('settings.english')}</span>
            </button>
            <button
              type="button"
              className={`${styles.langButton} ${lang === 'id' ? styles.langActive : ''}`}
              onClick={() => setLang('id')}
            >
              <span className={styles.langFlag}>ID</span>
              <span>{t('settings.bahasaIndonesia')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
