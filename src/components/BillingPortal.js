'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, CreditCard, Loader, Shield, Sparkles, Zap } from 'lucide-react';
import styles from './BillingPortal.module.css';

const formatRupiah = (value) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;

const STATUS_LABELS = {
  settlement: 'Berhasil',
  capture: 'Berhasil',
  pending: 'Menunggu',
  checkout_created: 'Checkout dibuat',
  expire: 'Expired',
  cancel: 'Dibatalkan',
  deny: 'Ditolak',
  failure: 'Gagal',
  refund: 'Refund',
};

export default function BillingPortal({ getAuthHeaders, onUpgrade, onClose }) {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/account/billing', { headers });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Gagal memuat data billing.');
      setBilling(data.billing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!billing || !onUpgrade) return;
    setRenewLoading(true);
    try {
      const result = await onUpgrade({
        plan: billing.planId,
        billingCycle: billing.billingCycle || 'monthly',
      });
      if (result?.success && result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError(result?.error || 'Checkout gagal dibuat.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.portal}>
        <div className={styles.loadingState}>
          <Loader size={20} className={styles.spinner} />
          <span>Memuat data billing...</span>
        </div>
      </div>
    );
  }

  if (error && !billing) {
    return (
      <div className={styles.portal}>
        <div className={styles.errorState}>{error}</div>
      </div>
    );
  }

  const isFree = billing?.planId === 'free';
  const usagePercent = billing?.quota ? Math.min(100, Math.round((billing.quota.used / billing.quota.limit) * 100)) : 0;
  const isExpiringSoon = billing?.daysUntilExpiry !== null && billing.daysUntilExpiry <= 7;

  return (
    <div className={styles.portal}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Paket & Billing</h2>
          <p className={styles.subtitle}>Kelola paket dan lihat penggunaan kamu.</p>
        </div>
        {onClose && (
          <button type="button" className={styles.closeButton} onClick={onClose}>✕</button>
        )}
      </div>

      {/* Plan Card */}
      <div className={`${styles.planCard} ${isExpiringSoon && !isFree ? styles.expiringCard : ''}`}>
        <div className={styles.planHeader}>
          <div className={styles.planBadge}>
            <Sparkles size={14} />
            {billing?.planLabel || 'Free'}
          </div>
          {billing?.billingCycle && (
            <span className={styles.cycleBadge}>{billing.billingCycle === 'annual' ? 'Tahunan' : 'Bulanan'}</span>
          )}
        </div>

        {/* Quota Bar */}
        <div className={styles.quotaSection}>
          <div className={styles.quotaHeader}>
            <span><Zap size={14} /> Generation bulan ini</span>
            <strong>{billing?.quota?.used || 0} / {billing?.quota?.limit || 5}</strong>
          </div>
          <div className={styles.quotaBarTrack}>
            <div
              className={`${styles.quotaBarFill} ${usagePercent >= 90 ? styles.quotaDanger : usagePercent >= 70 ? styles.quotaWarning : ''}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className={styles.quotaFooter}>
            <span>{billing?.quota?.remaining || 0} tersisa</span>
            {billing?.quota?.exhausted && <span className={styles.exhaustedBadge}>Quota habis</span>}
          </div>
        </div>

        {/* Expiry */}
        {!isFree && billing?.billingPeriodEndsAt && (
          <div className={`${styles.expiryRow} ${isExpiringSoon ? styles.expiryWarning : ''}`}>
            <Calendar size={14} />
            <span>
              {billing.expired
                ? 'Paket sudah expired'
                : `Berlaku sampai ${new Date(billing.billingPeriodEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              {isExpiringSoon && !billing.expired && ` (${billing.daysUntilExpiry} hari lagi)`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.planActions}>
          {isFree || billing?.expired ? (
            <button type="button" className={styles.upgradeButton} onClick={onUpgrade ? () => onUpgrade(null) : undefined}>
              <Sparkles size={16} />
              Upgrade Paket
              <ArrowRight size={16} />
            </button>
          ) : (
            <>
              {isExpiringSoon && (
                <button type="button" className={styles.renewButton} onClick={handleRenew} disabled={renewLoading}>
                  {renewLoading ? <Loader size={16} className={styles.spinner} /> : <CreditCard size={16} />}
                  Perpanjang Paket
                </button>
              )}
              <button type="button" className={styles.changePlanButton} onClick={onUpgrade ? () => onUpgrade(null) : undefined}>
                Ganti Paket
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <Shield size={16} />
          <div>
            <strong>Framework</strong>
            <span>{billing?.allowedFrameworks?.length || 1} framework tersedia</span>
          </div>
        </div>
        <div className={styles.infoItem}>
          <Zap size={16} />
          <div>
            <strong>Project</strong>
            <span>Maks. {billing?.projectLimit || 1} project</span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {billing?.orders?.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.historyTitle}>Riwayat Pembayaran</h3>
          <div className={styles.historyList}>
            {billing.orders.map((order) => (
              <div key={order.orderId} className={styles.historyItem}>
                <div className={styles.historyMeta}>
                  <strong>{order.plan?.charAt(0).toUpperCase() + order.plan?.slice(1)} {order.cycle === 'annual' ? '(Tahunan)' : '(Bulanan)'}</strong>
                  <span>{new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className={styles.historyRight}>
                  <span className={styles.historyAmount}>{formatRupiah(order.amount || 0)}</span>
                  <span className={`${styles.historyStatus} ${styles[`status_${order.status}`] || ''}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className={styles.errorToast}>{error}</div>}
    </div>
  );
}
