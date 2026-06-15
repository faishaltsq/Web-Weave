'use client';

import { Code2, Crown, FileCode2, Lock, Play, Sparkles, TerminalSquare, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import { getScriptSlotLimit } from '@/lib/billing/plans';
import styles from './ScriptsPage.module.css';

function extractDomain(url) {
  if (!url) return 'Saved script';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getScriptName(script) {
  const domain = extractDomain(script.target_url);
  const isRevision = (script.prompt || '').includes('Regeneration feedback');
  return `${domain}${isRevision ? ' (revisi)' : ''}`;
}

export default function ScriptsPage({ onOpenPricing, onNewAutomation, onBrowseChats, onOpenScript, onDeleteScript }) {
  const { t } = useLanguage();
  const { SUPABASE_ENABLED, user, scripts, historyLoading, usageStatus } = useWebWeave();
  const planId = usageStatus?.planId || 'free';
  const planLabel = usageStatus?.planLabel || 'Free';
  const slotLimit = getScriptSlotLimit(planId);
  const isPaid = planId !== 'free' && slotLimit > 0;
  const visibleScripts = scripts || [];
  const usedSlots = Math.min(visibleScripts.length, slotLimit);

  if (!SUPABASE_ENABLED) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>
          <Lock size={34} />
          <h1>{t('scripts.title')}</h1>
          <p>{t('scripts.supabaseDisabled')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.lockedState}>
          <Lock size={34} />
          <h1>{t('scripts.signInTitle')}</h1>
          <p>{t('scripts.signInBody')}</p>
        </div>
      </div>
    );
  }

  if (!usageStatus || historyLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>{t('common.loading')}</div>
      </div>
    );
  }

  if (planId === 'free' || !isPaid) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}><FileCode2 size={15} /> {t('scripts.title')}</p>
            <h1>{t('scripts.lockedTitle')}</h1>
            <p>{t('scripts.lockedBody')}</p>
          </div>
        </header>
        <section className={styles.upgradePanel}>
          <div className={styles.upgradeIcon}><Crown size={26} /></div>
          <div>
            <h2>{t('scripts.subtitle')}</h2>
            <p>{t('scripts.runnerNotice')}</p>
          </div>
          <div className={styles.upgradeActions}>
            <button type="button" className={styles.primaryButton} onClick={onOpenPricing}>{t('scripts.upgradeStarter')}</button>
            <button type="button" className={styles.secondaryButton} onClick={onOpenPricing}>{t('scripts.viewPricing')}</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}><FileCode2 size={15} /> {t('scripts.title')}</p>
          <h1>{t('scripts.subtitle')}</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={onBrowseChats}>{t('scripts.browseChats')}</button>
          <button type="button" className={styles.primaryButton} onClick={onNewAutomation}><Sparkles size={16} /> {t('scripts.newAutomation')}</button>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}><span>{t('scripts.planSummary')}</span><strong>{planLabel}</strong></div>
        <div className={styles.summaryCard}><span>{t('scripts.slotsUsed')}</span><strong>{usedSlots}/{slotLimit}</strong></div>
        <div className={styles.summaryCard}><span>{t('scripts.runnerStatus')}</span><strong>{t('scripts.runnerPreparing')}</strong></div>
      </section>

      <div className={styles.runnerNotice}><TerminalSquare size={17} /> {t('scripts.runnerNotice')}</div>

      {historyLoading ? (
        <div className={styles.emptyState}>{t('common.loading')}</div>
      ) : visibleScripts.length === 0 ? (
        <div className={styles.emptyState}>
          <Code2 size={36} />
          <h2>{t('scripts.emptyTitle')}</h2>
          <p>{t('scripts.emptyBody')}</p>
          <button type="button" className={styles.primaryButton} onClick={onNewAutomation}>{t('scripts.newAutomation')}</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleScripts.map((script, index) => {
            const locked = index >= slotLimit;
            const preview = (script.prompt || '').replace('Regeneration feedback from previous output:', '').slice(0, 110).trim();
            const date = script.created_at ? new Date(script.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
            return (
              <article key={script.id} className={`${styles.scriptCard} ${locked ? styles.lockedCard : ''}`}>
                <div className={styles.cardTop}>
                  <div className={styles.scriptIcon}><FileCode2 size={18} /></div>
                  <span className={styles.statusPill}>{locked ? t('scripts.lockedOverflow') : t('scripts.cloudReady')}</span>
                </div>
                <h3>{getScriptName(script)}</h3>
                <p>{preview}</p>
                <div className={styles.metaRow}>
                  <span>{script.framework?.replace(/_/g, ' ')}</span>
                  <span>{date}</span>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => onOpenScript(script)}>{t('scripts.viewCode')}</button>
                  <button type="button" className={styles.disabledRunButton} disabled><Play size={14} /> {t('scripts.comingSoon')}</button>
                  <button type="button" className={styles.deleteButton} onClick={(e) => { e.stopPropagation(); if (onDeleteScript) onDeleteScript(script.id); }} title={t('common.delete') || 'Delete'}><Trash2 size={14} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
