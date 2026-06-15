'use client';

import { useState } from 'react';
import { ArrowRight, Check, Sparkles, Zap, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import styles from './PricingPage.module.css';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;

export default function PricingPage({ onClose, onCheckout }) {
  const { t } = useLanguage();
  const { usageStatus, loadPrivateData, getAuthHeaders } = useWebWeave();
  const currentPlan = usageStatus?.planId || 'free';
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [actionMessage, setActionMessage] = useState('');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: t('pricing.freePlan'),
      monthlyPrice: 0,
      description: t('pricing.freeTagline'),
      quota: `5 ${t('pricing.freeGenerations')}`,
      cta: t('pricing.freeCta'),
      features: [
        '1 project pribadi',
        'Playwright JavaScript only',
        'Copy dan download script',
        'Riwayat terbaru terbatas',
      ],
    },
    {
      id: 'starter',
      name: t('pricing.starterPlan'),
      monthlyPrice: 49000,
      description: t('pricing.starterTagline'),
      quota: `75 ${t('pricing.freeGenerations')}`,
      cta: currentPlan === 'starter' ? 'Cancel Plan' : (currentPlan === 'pro' ? null : t('pricing.starterCta')),
      badge: t('pricing.mostPopular'),
      features: [
        '5 project aktif',
        'Playwright JS/Python, Selenium Python, Cypress JS',
        'Saved scripts dan prompt history',
        'Regenerate dengan feedback',
        'Email support',
      ],
    },
    {
      id: 'pro',
      name: t('pricing.proPlan'),
      monthlyPrice: 129000,
      description: t('pricing.proTagline'),
      quota: `300 ${t('pricing.freeGenerations')}`,
      cta: currentPlan === 'pro' ? 'Cancel Plan' : t('pricing.proCta'),
      badge: t('pricing.bestValue'),
      features: [
        '25 project aktif',
        'Semua framework didukung',
        'Priority generation queue',
        'Quality gate summary',
        'Priority support',
      ],
    },
    {
      id: 'team',
      name: t('pricing.teamPlan'),
      monthlyPrice: 299000,
      description: t('pricing.teamTagline'),
      quota: `1.000 ${t('pricing.freeGenerations')}`,
      cta: t('pricing.teamCta'),
      disabled: true,
      features: [
        'Team workspace coming soon',
        'Shared project history',
        'All supported frameworks',
        'Admin controls planned',
        'Roadmap request priority',
      ],
    },
  ];

  const getDisplayPrice = (plan) => {
    if (plan.monthlyPrice === 0) return { price: 'Rp0', period: `/${t('pricing.monthly').toLowerCase()}`, note: t('pricing.noCreditCard') };

    if (billingCycle === 'annual') {
      const annualPrice = Math.round(plan.monthlyPrice * 12 * 0.8 / 1000) * 1000;
      const monthly = formatRupiah(Math.round(annualPrice / 12 / 1000) * 1000);
      return {
        price: formatRupiah(annualPrice),
        period: `/${t('pricing.annual').toLowerCase()}`,
        note: `Setara ${monthly}/${t('pricing.monthly').toLowerCase()}, ${t('pricing.save20')}`,
      };
    }

    return {
      price: formatRupiah(plan.monthlyPrice),
      period: `/${t('pricing.monthly').toLowerCase()}`,
      note: t('pricing.payMonthly'),
    };
  };

  const handlePlanClick = async (plan) => {
    if (plan.disabled) return;
    if (!onCheckout) {
      setActionMessage(t('pricing.checkoutNotConnected'));
      return;
    }

    setCheckoutLoadingPlan(plan.id);
    setActionMessage(`${t('pricing.creatingCheckout').replace('...', '')} ${plan.name}...`);

    try {
      const checkout = await onCheckout({ plan: plan.id, billingCycle });
      if (!checkout.success) {
        setActionMessage(checkout.error || t('pricing.checkoutNotAvailable'));
        return;
      }

      setActionMessage(t('pricing.redirecting'));
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setActionMessage(err.message || t('pricing.checkoutFailed'));
    } finally {
      setCheckoutLoadingPlan('');
    }
  };

  const handlePrimaryCta = () => {
    const starterPlan = plans.find((plan) => plan.id === 'starter');
    handlePlanClick(starterPlan);
  };

  const handleCancelPlan = () => {
    setCancelConfirmOpen(true);
  };

  const confirmCancelPlan = async () => {
    setCancelLoading(true);
    setActionMessage(t('pricing.cancelling') || 'Cancelling...');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/account/cancel-subscription', { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        setActionMessage(t('pricing.cancelled') || 'Plan cancelled. You are now on Free.');
        setCancelConfirmOpen(false);
        await loadPrivateData();
      } else {
        setActionMessage(data.error || t('pricing.cancelFailed') || 'Failed to cancel.');
      }
    } catch {
      setActionMessage(t('pricing.cancelFailed') || 'Failed to cancel.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className={styles.pricingContainer}>
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />

      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onClose} title={t('pricing.backToBuilder')}>
          {t('pricing.backToBuilder')}
        </button>
        <div className={styles.eyebrow}><Sparkles size={16} /> Pricing</div>
        <h1 className={styles.title}>{t('pricing.title')}</h1>
        <p className={styles.subtitle}>{t('pricing.subtitle')}</p>
      </header>

      <section className={styles.summaryStrip} aria-label="Pricing summary">
        <div>
          <span>{t('pricing.startingFrom')}</span>
          <strong>Rp49K/{t('pricing.monthly').toLowerCase()}</strong>
          <small>{t('pricing.firstPaidPlan')}</small>
        </div>
        <div>
          <span>{t('pricing.free')}</span>
          <strong>5 {t('pricing.freeGenerations')}</strong>
          <small>{t('pricing.noCreditCard')}</small>
        </div>
        <div>
          <span>{t('pricing.yearly')}</span>
          <strong>{t('pricing.yearlySavings')}</strong>
          <small>{t('pricing.payYearly')}</small>
        </div>
      </section>

      <div className={styles.toggleContainer}>
        <div className={styles.billingToggle} aria-label="Billing cycle">
          <button
            type="button"
            className={`${styles.toggleButton} ${billingCycle === 'monthly' ? styles.active : ''}`}
            aria-pressed={billingCycle === 'monthly'}
            onClick={() => setBillingCycle('monthly')}
            title={t('pricing.monthly')}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${billingCycle === 'annual' ? styles.active : ''}`}
            aria-pressed={billingCycle === 'annual'}
            onClick={() => setBillingCycle('annual')}
            title={t('pricing.annual')}
          >
            {t('pricing.annual')}
          </button>
          <span className={styles.saveBadge}>{t('pricing.save20')}</span>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {plans.map((plan) => {
          const displayPrice = getDisplayPrice(plan);

          return (
            <article key={plan.id} className={`${styles.card} ${plan.badge ? styles.highlightCard : ''} ${plan.disabled ? styles.disabledCard : ''}`}>
              {plan.badge && (
                <div className={styles.popularBadge}>
                  <Zap size={14} />
                  {plan.badge}
                </div>
              )}

              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <div className={styles.pricing}>
                <span className={styles.amount}>{displayPrice.price}</span>
                <span className={styles.period}>{displayPrice.period}</span>
              </div>
              <p className={styles.priceNote}>{displayPrice.note}</p>


              <button
                type="button"
                className={`${styles.ctaButton} ${plan.badge && plan.id !== 'free' ? styles.ctaPrimary : styles.ctaSecondary} ${plan.disabled ? styles.disabledButton : ''} ${currentPlan === plan.id && plan.id !== 'free' ? styles.ctaCurrent : ''}`}
                disabled={plan.disabled || (plan.id === 'starter' && currentPlan === 'pro')}
                aria-disabled={plan.disabled}
                onClick={() => {
                  if (plan.disabled) return;
                  if (currentPlan === plan.id && plan.id !== 'free') {
                    handleCancelPlan();
                  } else if (plan.id === 'free' && currentPlan !== 'free') {
                    window.location.href = '/';
                  } else if (plan.cta) {
                    handlePlanClick(plan);
                  }
                }}
              >
                {checkoutLoadingPlan === plan.id ? t('pricing.creatingCheckout') : (currentPlan === plan.id && plan.id !== 'free' ? (
                  <><XCircle size={16} /> {plan.cta}</>
                ) : (
                  <>{plan.cta} <ArrowRight size={16} /></>
                ))}
              </button>

              <div className={styles.divider} />

              <div className={styles.quotaBox}>{plan.quota}</div>
              <div className={styles.featuresList}>
                {plan.features.map((feature) => (
                  <div key={feature} className={styles.featureItem}>
                    <Check size={17} className={styles.checkIcon} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.actionToast} role="status" aria-live="polite">
        {actionMessage}
      </div>

      <section className={styles.faqSection}>
        <div>
          <p className={styles.sectionLabel}>FAQ</p>
          <h2 className={styles.faqTitle}>{t('faq.title')}</h2>
        </div>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4>{t('faq.q1')}</h4>
            <p>{t('faq.a1')}</p>
          </div>
          <div className={styles.faqItem}>
            <h4>{t('faq.q2')}</h4>
            <p>{t('faq.a2')}</p>
          </div>
          <div className={styles.faqItem}>
            <h4>{t('faq.q3')}</h4>
            <p>{t('faq.a3')}</p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <h2>{t('cta.ready')}</h2>
          <p>{t('cta.startNow')}</p>
        </div>
        <button type="button" className={styles.ctaButtonLarge} onClick={handlePrimaryCta} title={t('cta.tryNow')}>
          {t('cta.tryNow')}
          <ArrowRight size={17} />
        </button>
      </section>

      <ConfirmDialog
        open={cancelConfirmOpen}
        title={t('confirmDialog.cancelPlanTitle')}
        message={t('confirmDialog.cancelPlanMessage')}
        cancelLabel={t('confirmDialog.no')}
        confirmLabel={t('confirmDialog.yesCancelPlan')}
        loadingLabel={t('confirmDialog.cancelling')}
        loading={cancelLoading}
        onCancel={() => setCancelConfirmOpen(false)}
        onConfirm={confirmCancelPlan}
      />
    </div>
  );
}
