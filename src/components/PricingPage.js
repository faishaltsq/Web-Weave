'use client';

import { useState } from 'react';
import { ArrowRight, Check, Sparkles, Zap } from 'lucide-react';
import styles from './PricingPage.module.css';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;

const plans = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    description: 'Cocok untuk coba WebWeave tanpa komitmen.',
    fit: 'Belajar automation dan validasi ide tanpa cepat mentok.',
    quota: '30 generations/bulan',
    cta: 'Pakai Free',
    accent: 'Starter safe',
    features: [
      '1 project pribadi',
      'Playwright JavaScript',
      'Copy dan download script',
      'Riwayat terbatas',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49000,
    description: 'Harga masuk akal untuk builder solo dan QA intern.',
    fit: 'Paket rekomendasi awal: murah, quota longgar untuk kerja rutin.',
    quota: '500 generations/bulan',
    cta: 'Mulai Starter',
    badge: 'Recommended',
    accent: 'Best entry price',
    features: [
      '5 project aktif',
      'Semua framework utama',
      'Saved scripts dan prompt history',
      'Regenerate dengan feedback',
      'Email support best-effort',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 129000,
    description: 'Untuk freelance QA, developer, dan tim kecil.',
    fit: 'Lebih lega untuk sprint, demo client, dan iterasi locator.',
    quota: '2.000 generations/bulan',
    cta: 'Coba Pro',
    badge: 'Best value',
    accent: 'Most useful',
    features: [
      'Unlimited projects',
      'Priority generation queue',
      'Quality gate summary',
      'Locator ranking detail',
      'Priority support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 299000,
    description: 'Untuk shared workspace kecil tanpa harga enterprise.',
    fit: '3 seats untuk QA lead, intern, developer, dan smoke suite rutin.',
    quota: '8.000 generations/bulan',
    cta: 'Coming soon',
    accent: 'Small team',
    disabled: true,
    features: [
      '3 team seats included',
      'Shared project history',
      'Template login reusable',
      'Basic API access mock',
      'Roadmap request priority',
    ],
  },
];

export default function PricingPage({ onClose, onCheckout }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [actionMessage, setActionMessage] = useState('Pilih paket untuk checkout. Midtrans sandbox bisa diaktifkan dari env.');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');

  const getDisplayPrice = (plan) => {
    if (plan.monthlyPrice === 0) return { price: 'Rp0', period: '/bulan', note: 'Gratis selamanya' };

    if (billingCycle === 'annual') {
      const annualPrice = Math.round(plan.monthlyPrice * 12 * 0.8 / 1000) * 1000;
      return {
        price: formatRupiah(annualPrice),
        period: '/tahun',
        note: `Setara ${formatRupiah(Math.round(annualPrice / 12 / 1000) * 1000)}/bulan, hemat 20%`,
      };
    }

    return { price: formatRupiah(plan.monthlyPrice), period: '/bulan', note: 'Bayar bulanan, bisa stop kapan saja' };
  };

  const handlePlanClick = async (plan) => {
    if (plan.disabled) return;
    if (!onCheckout) {
      setActionMessage('Checkout belum terhubung. Integrasi payment perlu diaktifkan dulu.');
      return;
    }

    setCheckoutLoadingPlan(plan.id);
    setActionMessage(`Membuat checkout ${plan.name}...`);

    try {
      const checkout = await onCheckout({ plan: plan.id, billingCycle });
      if (!checkout.success) {
        setActionMessage(checkout.error || 'Checkout belum tersedia.');
        return;
      }

      setActionMessage('Redirecting to Midtrans checkout...');
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setActionMessage(err.message || 'Checkout gagal dibuat.');
    } finally {
      setCheckoutLoadingPlan('');
    }
  };

  const handlePrimaryCta = () => {
    const starterPlan = plans.find((plan) => plan.id === 'starter');
    handlePlanClick(starterPlan);
  };

  return (
    <div className={styles.pricingContainer}>
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />

      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onClose}>
          Back to builder
        </button>
        <div className={styles.eyebrow}><Sparkles size={16} /> Pricing recommendation</div>
        <h1 className={styles.title}>Paket automation yang ramah kantong.</h1>
        <p className={styles.subtitle}>
          WebWeave masih early product. Karena token generation relatif murah, quota dibuat lebih longgar untuk indie QA, intern, freelance, dan tim kecil.
        </p>
      </header>

      <section className={styles.summaryStrip} aria-label="Pricing recommendation summary">
        <div>
          <span>Mulai dari</span>
          <strong>Rp49.000</strong>
          <small>untuk paket berbayar pertama</small>
        </div>
        <div>
          <span>Rekomendasi</span>
          <strong>Starter</strong>
          <small>Rp49.000 dengan 500 generations/bulan</small>
        </div>
        <div>
          <span>Usage</span>
          <strong>quota longgar</strong>
          <small>biar user sering generate dan refine script</small>
        </div>
        <div>
          <span>Annual</span>
          <strong>hemat 20%</strong>
          <small>tanpa mengunci harga terlalu tinggi</small>
        </div>
      </section>

      <div className={styles.toggleContainer}>
        <div className={styles.billingToggle} aria-label="Billing cycle">
          <button
            type="button"
            className={`${styles.toggleButton} ${billingCycle === 'monthly' ? styles.active : ''}`}
            aria-pressed={billingCycle === 'monthly'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${billingCycle === 'annual' ? styles.active : ''}`}
            aria-pressed={billingCycle === 'annual'}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
          </button>
          <span className={styles.saveBadge}>hemat 20%</span>
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
                <span className={styles.planAccent}>{plan.accent}</span>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>

              <div className={styles.pricing}>
                <span className={styles.amount}>{displayPrice.price}</span>
                <span className={styles.period}>{displayPrice.period}</span>
              </div>
              <p className={styles.priceNote}>{displayPrice.note}</p>
              <p className={styles.fitText}>{plan.fit}</p>

              <button
                type="button"
                className={`${styles.ctaButton} ${plan.badge ? styles.ctaPrimary : styles.ctaSecondary} ${plan.disabled ? styles.disabledButton : ''}`}
                disabled={plan.disabled}
                aria-disabled={plan.disabled}
                onClick={() => { if (!plan.disabled) handlePlanClick(plan); }}
              >
                {checkoutLoadingPlan === plan.id ? 'Preparing checkout...' : plan.cta}
                <ArrowRight size={16} />
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
          <p className={styles.sectionLabel}>Pricing note</p>
          <h2 className={styles.faqTitle}>Rekomendasi harga final</h2>
        </div>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4>Kenapa Starter Rp49.000?</h4>
            <p>Angka ini rendah untuk user Indonesia, dan 500 generations/bulan cukup untuk daily QA ringan.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Kenapa Pro Rp129.000?</h4>
            <p>2.000 generations/bulan memberi ruang sprint, regenerasi, dan eksperimen locator tanpa terasa pelit.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Kenapa Team Rp299.000?</h4>
            <p>8.000 generations/bulan cukup untuk tim kecil, tapi tetap aman sebagai fair-use awal.</p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <p className={styles.sectionLabel}>Best next move</p>
          <h2>Launch murah dulu, naikkan harga setelah usage jelas.</h2>
          <p>
            Saran: mulai dari Free 30, Starter 500, Pro 2.000, Team 8.000 generations/bulan. Harga tetap murah, usage terasa lega.
          </p>
        </div>
        <button type="button" className={styles.ctaButtonLarge} onClick={handlePrimaryCta}>
          Simulasi pilih Starter
          <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
