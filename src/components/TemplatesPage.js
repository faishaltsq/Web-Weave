'use client';

import { useState, useMemo, useEffect } from 'react';
import { Code2, KeyRound, FileText, ShoppingCart, Globe, Menu, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import styles from './TemplatesPage.module.css';

const CATEGORY_ICONS = {
  login: KeyRound,
  forms: FileText,
  e2e: ShoppingCart,
  api: Code2,
  navigation: Globe,
};

const CATEGORIES = ['all', 'login', 'forms', 'e2e', 'api', 'navigation'];

const FRAMEWORK_CLASS = {
  playwright_js: styles.badgePlaywright,
  playwright_python: styles.badgePlaywright,
  puppeteer_js: styles.badgePuppeteer,
  selenium_python: styles.badgeSelenium,
  cypress_js: styles.badgeCypress,
};

const FRAMEWORK_LABEL = {
  playwright_js: 'Playwright',
  playwright_python: 'Playwright',
  puppeteer_js: 'Puppeteer',
  selenium_python: 'Selenium',
  cypress_js: 'Cypress',
};

function TemplateCard({ template, onUse }) {
  const { t } = useLanguage();
  const Icon = CATEGORY_ICONS[template.category] || Code2;
  const badgeClass = FRAMEWORK_CLASS[template.framework] || '';
  const frameworkLabel = FRAMEWORK_LABEL[template.framework] || template.framework;

  return (
    <div
      className={styles.card}
      tabIndex={0}
      role="button"
      onClick={() => onUse(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onUse(template);
        }
      }}
    >
      <div className={styles.cardIcon}><Icon size={20} /></div>
      {frameworkLabel && (
        <span className={`${styles.badge} ${badgeClass}`}>{frameworkLabel}</span>
      )}
      <h3>{template.name}</h3>
      <p>{template.prompt}</p>
      <button type="button" className={styles.useButton} tabIndex={-1}>
        <Code2 size={14} /> {t('templates.useTemplate')}
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonLine} style={{ width: 38, height: 38, borderRadius: 14, marginBottom: '0.75rem' }} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineLong}`} style={{ width: '70%' }} />
    </div>
  );
}

export default function TemplatesPage({ onUseTemplate }) {
  const { t } = useLanguage();
  const { templates, historyLoading, fetchTemplates } = useWebWeave();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTemplates().catch(() => setError(true));
  }, [fetchTemplates]);

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch = !search
        || (tpl.name || '').toLowerCase().includes(search.toLowerCase())
        || (tpl.prompt || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || tpl.category === category;
      return matchSearch && matchCategory;
    });
  }, [templates, search, category]);

  const renderContent = () => {
    if (error) {
      return (
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{t('templates.error')}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => { setError(false); fetchTemplates().catch(() => setError(true)); }}
          >
            <RefreshCw size={14} /> {t('templates.retry')}
          </button>
        </div>
      );
    }

    if (historyLoading) {
      return (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      );
    }

    if (!templates || templates.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Code2 size={40} />
          <p>{t('templates.empty')}</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Menu size={40} />
          <p>{t('templates.noResults')}</p>
        </div>
      );
    }

    return (
      <div className={styles.grid}>
        {filtered.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} onUse={onUseTemplate} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{t('templates.title')}</h1>
          <p>{t('templates.subtitle')}</p>
        </div>
        <div className={styles.searchWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('templates.searchPlaceholder')}
            aria-label={t('templates.searchPlaceholder')}
          />
        </div>
      </header>

      <div className={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.tab} ${category === cat ? styles.tabActive : ''}`}
            onClick={() => setCategory(cat)}
            aria-pressed={category === cat}
          >
            {cat === 'all' ? t('templates.categories.all') : t(`templates.categories.${cat}`)}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
