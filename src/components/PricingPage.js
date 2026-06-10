'use client';

import { Check, X, Zap, ArrowRight } from 'lucide-react';
import styles from './PricingPage.module.css';

const PricingPage = ({ onClose }) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      description: 'Perfect for getting started',
      features: [
        { text: '5 generations per month', included: true },
        { text: '1 project', included: true },
        { text: 'Basic frameworks', included: true },
        { text: 'Community support', included: true },
        { text: 'Advanced analytics', included: false },
        { text: 'Priority support', included: false },
        { text: 'Custom integrations', included: false },
        { text: 'API access', included: false },
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '29',
      period: '/month',
      description: 'For professional developers',
      features: [
        { text: 'Unlimited generations', included: true },
        { text: 'Unlimited projects', included: true },
        { text: 'All frameworks', included: true },
        { text: 'Email support', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'Custom integrations', included: false },
        { text: 'API access', included: false },
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: [
        { text: 'Unlimited generations', included: true },
        { text: 'Unlimited projects', included: true },
        { text: 'All frameworks', included: true },
        { text: 'Email support', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'API access', included: true },
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className={styles.pricingContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Simple, Transparent Pricing</h1>
          <p className={styles.subtitle}>
            Choose the perfect plan for your automation needs. Scale as you grow.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className={styles.toggleContainer}>
        <div className={styles.billingToggle}>
          <button className={styles.toggleButton + ' ' + styles.active}>Monthly</button>
          <button className={styles.toggleButton}>Annual</button>
          <span className={styles.saveBadge}>Save 20%</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className={styles.cardsGrid}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.card} ${plan.popular ? styles.popular : ''}`}
          >
            {plan.popular && (
              <div className={styles.popularBadge}>
                <Zap size={14} />
                Most Popular
              </div>
            )}

            <div className={styles.cardHeader}>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planDescription}>{plan.description}</p>
            </div>

            <div className={styles.pricing}>
              <span className={styles.currency}>$</span>
              <span className={styles.amount}>{plan.price}</span>
              {plan.period && <span className={styles.period}>{plan.period}</span>}
            </div>

            <button
              className={`${styles.ctaButton} ${plan.popular ? styles.ctaPrimary : styles.ctaSecondary}`}
            >
              {plan.cta}
              <ArrowRight size={16} />
            </button>

            <div className={styles.divider} />

            <div className={styles.featuresList}>
              {plan.features.map((feature, idx) => (
                <div key={idx} className={styles.featureItem}>
                  {feature.included ? (
                    <Check size={18} className={styles.checkIcon} />
                  ) : (
                    <X size={18} className={styles.xIcon} />
                  )}
                  <span className={feature.included ? styles.featureText : styles.featureTextDisabled}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Can I change plans anytime?</h4>
            <p className={styles.faqAnswer}>
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Is there a free trial?</h4>
            <p className={styles.faqAnswer}>
              Pro plan includes a 14-day free trial. No credit card required to start.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>What payment methods do you accept?</h4>
            <p className={styles.faqAnswer}>
              We accept all major credit cards, PayPal, and bank transfers for enterprise customers.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>Do you offer refunds?</h4>
            <p className={styles.faqAnswer}>
              30-day money-back guarantee on all plans if you&apos;re not satisfied.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to automate smarter?</h2>
          <p className={styles.ctaText}>
            Join thousands of developers automating their workflows with WebWeave.
          </p>
          <button className={styles.ctaButtonLarge}>Start Your Free Trial</button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
