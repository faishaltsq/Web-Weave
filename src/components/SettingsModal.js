'use client';

import { useEffect, useState } from 'react';
import { CreditCard, FileText, Globe, Loader, ReceiptText, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useWebWeave } from '@/lib/context/WebWeaveContext';
import styles from './SettingsModal.module.css';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value || 0))}`;

function formatDate(value, lang) {
  if (!value) return '';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCycleLabel(cycle, t) {
  if (cycle === 'annual') return t('settings.annualCycle');
  if (cycle === 'monthly') return t('settings.monthlyCycle');
  return t('settings.freeCycle');
}

function getStatusLabel(status, t) {
  const statusMap = {
    settlement: t('settings.statusSettlement'),
    capture: t('settings.statusCapture'),
    pending: t('settings.statusPending'),
    checkout_created: t('settings.statusCheckoutCreated'),
    expire: t('settings.statusExpire'),
    cancel: t('settings.statusCancel'),
    deny: t('settings.statusDeny'),
    failure: t('settings.statusFailure'),
    refund: t('settings.statusRefund'),
  };
  return statusMap[status] || status || t('settings.notAvailable');
}

export default function SettingsModal({ onClose, onOpenPricing }) {
  const { lang, setLang, t } = useLanguage();
  const { SUPABASE_ENABLED, user, getAuthHeaders } = useWebWeave();
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState('');
  const [invoiceDownloadError, setInvoiceDownloadError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      if (!SUPABASE_ENABLED || !user) {
        setBilling(null);
        setBillingLoading(false);
        setBillingError('');
        return;
      }

      setBillingLoading(true);
      setBillingError('');

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/account/billing', { headers });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(data.error || t('settings.billingError'));
        }

        if (active) setBilling(data.billing || null);
      } catch (err) {
        if (active) {
          setBilling(null);
          setBillingError(err.message || t('settings.billingError'));
        }
      } finally {
        if (active) setBillingLoading(false);
      }
    }

    loadBilling();
    return () => { active = false; };
  }, [SUPABASE_ENABLED, user, getAuthHeaders, t]);

  const isBillingUnavailable = !SUPABASE_ENABLED || !user;
  const quota = billing?.quota;
  const orders = Array.isArray(billing?.orders) ? billing.orders : [];
  const expiryLabel = billing?.billingPeriodEndsAt
    ? formatDate(billing.billingPeriodEndsAt, lang)
    : billing?.planId === 'free'
      ? t('settings.noExpiration')
      : t('settings.notAvailable');
  const paymentLabel = billing?.billingProvider || t('settings.noPaymentMethod');

  const handleDownloadInvoice = async (orderId) => {
    if (!orderId || downloadingInvoiceId) return;
    setDownloadingInvoiceId(orderId);
    setInvoiceDownloadError('');

    const invoiceWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!invoiceWindow) {
      setInvoiceDownloadError(t('settings.invoicePopupBlocked'));
      setDownloadingInvoiceId('');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/account/invoices/${encodeURIComponent(orderId)}`, { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        invoiceWindow.close();
        throw new Error(data.error || t('settings.invoiceDownloadError'));
      }
      if (!data.success || !data.midtransUrl) {
        invoiceWindow.close();
        throw new Error(data.error || t('settings.invoiceDownloadError'));
      }

      invoiceWindow.location.href = data.midtransUrl;
    } catch (err) {
      setInvoiceDownloadError(err.message || t('settings.invoiceDownloadError'));
    } finally {
      setDownloadingInvoiceId('');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('settings.title')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('common.close')} title={t('common.close')}>
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

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CreditCard size={20} />
            <div>
              <h3>{t('settings.billing')}</h3>
              <p>{t('settings.billingDescription')}</p>
            </div>
          </div>

          {billingLoading ? (
            <div className={styles.billingState}>
              <Loader size={17} className={styles.spinner} />
              <span>{t('settings.billingLoading')}</span>
            </div>
          ) : billingError ? (
            <div className={styles.billingError}>{billingError}</div>
          ) : isBillingUnavailable ? (
            <div className={styles.billingState}>{t('settings.billingUnavailable')}</div>
          ) : (
            <div className={styles.billingContent}>
              <div className={styles.planSummary}>
                <div className={styles.planText}>
                  <span>{t('settings.currentPlan')}</span>
                  <strong className={styles.planValue}>{billing?.planLabel || t('pricing.freePlan')}</strong>
                </div>
                {onOpenPricing && (
                  <button type="button" className={styles.manageButton} onClick={onOpenPricing}>
                    {t('settings.managePlan')}
                  </button>
                )}
              </div>

              <div className={styles.billingGrid}>
                <div className={styles.billingMetric}>
                  <span>{t('settings.billingCycle')}</span>
                  <strong>{getCycleLabel(billing?.billingCycle, t)}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.expirationDate')}</span>
                  <strong>{expiryLabel}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.paymentMethod')}</span>
                  <strong>{paymentLabel}</strong>
                </div>
                <div className={styles.billingMetric}>
                  <span>{t('settings.usage')}</span>
                  <strong>{quota ? `${quota.used} / ${quota.limit}` : t('settings.notAvailable')}</strong>
                </div>
              </div>

              <div className={styles.usageStrip}>
                <span>{quota ? `${quota.remaining} ${t('settings.remainingQuota')}` : t('settings.notAvailable')}</span>
                <span>{t('settings.projectLimit')}: {billing?.projectLimit ?? t('settings.notAvailable')}</span>
                <span>{billing?.allowedFrameworks?.length ?? 0} {t('settings.frameworksAvailable')}</span>
              </div>

              <div className={styles.invoiceSection}>
                <div className={styles.invoiceHeader}>
                  <FileText size={16} />
                  <h4>{t('settings.invoices')}</h4>
                </div>
                {orders.length === 0 ? (
                  <div className={styles.emptyInvoices}>{t('settings.noInvoices')}</div>
                ) : (
                  <div className={styles.invoiceList}>
                    {orders.map((order) => (
                      <button
                        key={order.orderId}
                        type="button"
                        className={styles.invoiceItem}
                        onClick={() => handleDownloadInvoice(order.orderId)}
                        disabled={Boolean(downloadingInvoiceId)}
                        title={t('settings.invoiceDownloading')}
                      >
                        <div className={styles.invoiceMain}>
                          <strong><ReceiptText size={14} /> {order.orderId}</strong>
                          <span>{order.plan} · {getCycleLabel(order.cycle, t)} · {formatDate(order.createdAt, lang)}</span>
                        </div>
                        <div className={styles.invoiceRight}>
                          <strong>{formatRupiah(order.amount)}</strong>
                          <span className={styles.invoiceStatus}>{getStatusLabel(order.status, t)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {invoiceDownloadError && <div className={styles.billingError}>{invoiceDownloadError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
