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
    description: 'Mulai generate script automation gratis.',
    quota: '5 generations/bulan',
    cta: 'Mulai Gratis',
    features: [
      '1 project pribadi',
      'Playwright JavaScript only',
      'Copy dan download script',
      'Riwayat terbaru terbatas',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 49000,
    description: 'Untuk QA dan developer yang butuh script rutin.',
    quota: '75 generations/bulan',
    cta: 'Upgrade ke Starter',
    badge: 'Paling Populer',
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
    name: 'Pro',
    monthlyPrice: 129000,
    description: 'Untuk tim dan project yang butuh lebih banyak framework.',
    quota: '300 generations/bulan',
    cta: 'Upgrade ke Pro',
    badge: 'Nilai Terbaik',
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
    name: 'Team',
    monthlyPrice: 299000,
    description: 'Workspace bersama untuk tim QA.',
    quota: '1.000 generations/bulan',
    cta: 'Segera Hadir',
    disabled: true,
    features: [
      'Team workspace',
      'Shared project history',
      'Semua framework didukung',
      'Admin controls',
      'Roadmap request priority',
    ],
  },
];

export default function PricingPage({ onClose, onCheckout }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [actionMessage, setActionMessage] = useState('Pilih paket untuk checkout. Midtrans sandbox bisa diaktifkan dari env.');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');

  const getDisplayPrice = (plan) => {
    if (plan.monthlyPrice === 0) return { price: 'Rp0', period: '/bulan', note: 'Tanpa kartu kredit' };

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
          Kembali ke builder
        </button>
        <div className={styles.eyebrow}><Sparkles size={16} /> Pricing</div>
        <h1 className={styles.title}>Pilih paket yang sesuai kebutuhan kamu.</h1>
        <p className={styles.subtitle}>
          Mulai gratis, upgrade kapan aja. Semua paket termasuk AI script generation dan locator preview.
        </p>
      </header>

      <section className={styles.summaryStrip} aria-label="Pricing summary">
        <div>
          <span>Mulai dari</span>
          <strong>Rp49K/bulan</strong>
          <small>paket berbayar pertama</small>
        </div>
        <div>
          <span>Gratis</span>
          <strong>5 generation/bulan</strong>
          <small>tanpa kartu kredit</small>
        </div>
        <div>
          <span>Tahunan</span>
          <strong>hemat 20%</strong>
          <small>bayar setahun sekaligus</small>
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
          <p className={styles.sectionLabel}>FAQ</p>
          <h2 className={styles.faqTitle}>Pertanyaan umum</h2>
        </div>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4>Apa itu generation?</h4>
            <p>Satu generation = satu script automation dari URL + objective yang kamu masukkan ke WebWeave.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Bisa ganti paket kapan saja?</h4>
            <p>Bisa. Upgrade langsung aktif, downgrade berlaku di akhir periode billing kamu.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>Framework apa saja yang didukung?</h4>
            <p>Playwright JS/Python, Selenium Python, Puppeteer JS, dan Cypress. Paket Free hanya Playwright JS.</p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <h2>Siap generate script pertama kamu?</h2>
          <p>
            Mulai gratis sekarang, upgrade kalau butuh lebih.
          </p>
        </div>
        <button type="button" className={styles.ctaButtonLarge} onClick={handlePrimaryCta}>
          Coba Sekarang
          <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
