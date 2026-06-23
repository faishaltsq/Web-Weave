'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import styles from '../legal.module.css';

function renderHTML(text) {
  const parts = text.split(/<strong>(.*?)<\/strong>/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return <strong key={i}>{part}</strong>;
    return part;
  });
}

const content = {
  en: {
    title: 'Privacy Policy',
    badge: 'Legal',
    updated: 'Last updated: June 14, 2026',
    back: '← Back to WebWeave',
    sections: [
      {
        title: '1. Data We Collect',
        body: 'When you use WebWeave, we collect the following data:',
        list: [
          '<strong>Account data:</strong> Email address, name (if provided), and Google OAuth profile data if you sign in with Google.',
          '<strong>Usage data:</strong> Target URLs you enter, automation objectives/prompts, selected frameworks, and generated scripts.',
          '<strong>Technical data:</strong> IP address (for rate limiting and security), browser user agent, and error logs.',
          '<strong>Payment data:</strong> We do not store credit card information. Payments are processed by Midtrans as a third-party payment gateway.',
        ],
      },
      {
        title: '2. How We Use Your Data',
        list: [
          'Providing the automation script generation service based on your URL and objective.',
          'Saving generated scripts to your project history.',
          'Tracking monthly usage quota and enforcing plan limits.',
          'Processing payments and managing your subscription status.',
          'Protecting the service from misuse (rate limiting, SSRF protection, prompt injection detection).',
          'Improving service quality and fixing bugs.',
        ],
      },
      {
        title: '3. Data Storage',
        body: 'Your data is stored on Supabase infrastructure (PostgreSQL) hosted in secure data centers. Generated scripts, prompts, and project history are stored as long as your account is active.',
        body2: 'We do not permanently store website DOM content. DOM data is only used temporarily during the generation process and is not saved after the response is sent.',
      },
      {
        title: '4. Data Sharing with Third Parties',
        body: 'We use the following third-party services:',
        list: [
          '<strong>Supabase:</strong> Authentication, database, and data storage.',
          '<strong>Midtrans:</strong> Payment processing.',
          '<strong>Vercel:</strong> Web application hosting.',
          '<strong>AI Providers (Google/OpenAI/Anthropic):</strong> Script generation. Prompts and DOM context are sent to AI providers to generate code.',
        ],
        body2: 'We do not sell your data to third parties.',
      },
      {
        title: '5. Your Rights',
        body: 'In accordance with applicable data protection laws, you have the right to:',
        list: [
          'Access the personal data we store about you.',
          'Request correction of inaccurate personal data.',
          'Request deletion of your account and all related data.',
          'Withdraw consent for data processing at any time.',
        ],
        body2: 'To exercise these rights, contact us using the information below.',
      },
      {
        title: '6. Security',
        body: 'We implement security measures including: data encryption in transit (HTTPS), Row Level Security in the database, URL validation to prevent SSRF, prompt injection detection, and rate limiting. However, no system is 100% secure.',
      },
      {
        title: '7. Cookies',
        body: 'WebWeave uses cookies to store session authentication (via Supabase Auth) and theme preferences (dark/light mode). We do not use third-party tracking cookies.',
      },
      {
        title: '8. Policy Changes',
        body: 'We may update this privacy policy from time to time. Significant changes will be communicated via email or in-app notification.',
      },
    ],
    contact: 'Privacy questions? Contact us at',
    email: 'faishaltsq@gmail.com',
  },
  id: {
    title: 'Kebijakan Privasi',
    badge: 'Legal',
    updated: 'Terakhir diperbarui: 14 Juni 2026',
    back: '← Kembali ke WebWeave',
    sections: [
      {
        title: '1. Data yang Kami Kumpulkan',
        body: 'Saat kamu menggunakan WebWeave, kami mengumpulkan data berikut:',
        list: [
          '<strong>Data akun:</strong> Alamat email, nama (jika disediakan), dan data profil dari Google OAuth jika kamu login dengan Google.',
          '<strong>Data penggunaan:</strong> URL target yang kamu masukkan, objective/prompt automation, framework yang dipilih, dan script yang di-generate.',
          '<strong>Data teknis:</strong> Alamat IP (untuk rate limiting dan keamanan), browser user agent, dan log error.',
          '<strong>Data pembayaran:</strong> Kami tidak menyimpan data kartu kredit. Pembayaran diproses oleh Midtrans sebagai payment gateway pihak ketiga.',
        ],
      },
      {
        title: '2. Bagaimana Kami Menggunakan Data',
        list: [
          'Menyediakan layanan generate script automation berdasarkan URL dan objective kamu.',
          'Menyimpan script yang di-generate ke project history kamu.',
          'Menghitung quota penggunaan bulanan dan menegakkan batas plan.',
          'Memproses pembayaran dan mengelola status langganan kamu.',
          'Melindungi layanan dari penyalahgunaan (rate limiting, SSRF protection, prompt injection detection).',
          'Meningkatkan kualitas layanan dan memperbaiki bug.',
        ],
      },
      {
        title: '3. Penyimpanan Data',
        body: 'Data kamu disimpan di infrastruktur Supabase (PostgreSQL) yang di-host di data center yang aman. Script yang di-generate, prompt, dan project history disimpan selama akun kamu aktif.',
        body2: 'Kami tidak menyimpan konten DOM website target secara permanen. Data DOM hanya digunakan sementara selama proses generate dan tidak disimpan setelah response dikirim.',
      },
      {
        title: '4. Berbagi Data dengan Pihak Ketiga',
        body: 'Kami menggunakan layanan pihak ketiga berikut:',
        list: [
          '<strong>Supabase:</strong> Authentication, database, dan penyimpanan data.',
          '<strong>Midtrans:</strong> Pemrosesan pembayaran.',
          '<strong>Vercel:</strong> Hosting aplikasi web.',
          '<strong>AI Provider (Google/OpenAI/Anthropic):</strong> Generate script automation. Prompt dan konteks DOM dikirim ke AI provider untuk menghasilkan kode.',
        ],
        body2: 'Kami tidak menjual data kamu ke pihak ketiga.',
      },
      {
        title: '5. Hak Kamu',
        body: 'Sesuai dengan UU Perlindungan Data Pribadi Indonesia (UU PDP), kamu memiliki hak untuk:',
        list: [
          'Mengakses data pribadi yang kami simpan tentang kamu.',
          'Meminta koreksi data pribadi yang tidak akurat.',
          'Meminta penghapusan akun dan seluruh data terkait.',
          'Menarik persetujuan pengolahan data kapan saja.',
        ],
        body2: 'Untuk menggunakan hak ini, hubungi kami melalui kontak di bawah.',
      },
      {
        title: '6. Keamanan',
        body: 'Kami menerapkan langkah keamanan termasuk: enkripsi data dalam transit (HTTPS), Row Level Security di database, validasi URL untuk mencegah SSRF, deteksi prompt injection, dan rate limiting. Namun, tidak ada sistem yang 100% aman.',
      },
      {
        title: '7. Cookie',
        body: 'WebWeave menggunakan cookie untuk menyimpan session authentication (melalui Supabase Auth) dan preferensi tema (dark/light mode). Kami tidak menggunakan cookie tracking pihak ketiga.',
      },
      {
        title: '8. Perubahan Kebijakan',
        body: 'Kami dapat memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan signifikan akan diinformasikan melalui email atau notifikasi di dalam aplikasi.',
      },
    ],
    contact: 'Pertanyaan tentang privasi? Hubungi kami di',
    email: 'faishaltsq@gmail.com',
  },
};

export default function PrivacyPolicy() {
  const { lang } = useLanguage();
  const c = content[lang] || content.en;

  return (
    <div className={styles.legalPage}>
      <Link href="/" className={styles.backLink}>{c.back}</Link>
      <div className={styles.badge}>{c.badge}</div>
      <h1 className={styles.title}>{c.title}</h1>
      <p className={styles.lastUpdated}>{c.updated}</p>

      {c.sections.map((section, i) => (
        <section key={i} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          {section.body && <p className={styles.paragraph}>{section.body}</p>}
          {section.list && (
            <ul className={styles.list}>
              {section.list.map((item, j) => (
                <li key={j}>{renderHTML(item)}</li>
              ))}
            </ul>
          )}
          {section.body2 && <p className={styles.paragraph}>{section.body2}</p>}
        </section>
      ))}

      <div className={styles.divider} />
      <div className={styles.contactBox}>
        <p>
          {c.contact}{' '}
          <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>
      </div>
    </div>
  );
}
