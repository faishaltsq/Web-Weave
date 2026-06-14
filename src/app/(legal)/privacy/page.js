import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Kebijakan Privasi — WebWeave',
  description: 'Kebijakan privasi WebWeave menjelaskan data apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak kamu sebagai pengguna.',
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.legalPage}>
      <Link href="/" className={styles.backLink}>← Kembali ke WebWeave</Link>

      <div className={styles.badge}>Legal</div>
      <h1 className={styles.title}>Kebijakan Privasi</h1>
      <p className={styles.lastUpdated}>Terakhir diperbarui: 14 Juni 2026</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Data yang Kami Kumpulkan</h2>
        <p className={styles.paragraph}>Saat kamu menggunakan WebWeave, kami mengumpulkan data berikut:</p>
        <ul className={styles.list}>
          <li><strong>Data akun:</strong> Alamat email, nama (jika disediakan), dan data profil dari Google OAuth jika kamu login dengan Google.</li>
          <li><strong>Data penggunaan:</strong> URL target yang kamu masukkan, objective/prompt automation, framework yang dipilih, dan script yang di-generate.</li>
          <li><strong>Data teknis:</strong> Alamat IP (untuk rate limiting dan keamanan), browser user agent, dan log error.</li>
          <li><strong>Data pembayaran:</strong> Kami tidak menyimpan data kartu kredit. Pembayaran diproses oleh Midtrans sebagai payment gateway pihak ketiga.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Bagaimana Kami Menggunakan Data</h2>
        <ul className={styles.list}>
          <li>Menyediakan layanan generate script automation berdasarkan URL dan objective kamu.</li>
          <li>Menyimpan script yang di-generate ke project history kamu.</li>
          <li>Menghitung quota penggunaan bulanan dan menegakkan batas plan.</li>
          <li>Memproses pembayaran dan mengelola status langganan kamu.</li>
          <li>Melindungi layanan dari penyalahgunaan (rate limiting, SSRF protection, prompt injection detection).</li>
          <li>Meningkatkan kualitas layanan dan memperbaiki bug.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Penyimpanan Data</h2>
        <p className={styles.paragraph}>
          Data kamu disimpan di infrastruktur Supabase (PostgreSQL) yang di-host di data center yang aman.
          Script yang di-generate, prompt, dan project history disimpan selama akun kamu aktif.
        </p>
        <p className={styles.paragraph}>
          Kami tidak menyimpan konten DOM website target secara permanen. Data DOM hanya digunakan sementara selama proses generate dan tidak disimpan setelah response dikirim.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Berbagi Data dengan Pihak Ketiga</h2>
        <p className={styles.paragraph}>Kami menggunakan layanan pihak ketiga berikut:</p>
        <ul className={styles.list}>
          <li><strong>Supabase:</strong> Authentication, database, dan penyimpanan data.</li>
          <li><strong>Midtrans:</strong> Pemrosesan pembayaran.</li>
          <li><strong>Vercel:</strong> Hosting aplikasi web.</li>
          <li><strong>AI Provider (Google/OpenAI/Anthropic):</strong> Generate script automation. Prompt dan konteks DOM dikirim ke AI provider untuk menghasilkan kode.</li>
        </ul>
        <p className={styles.paragraph}>Kami tidak menjual data kamu ke pihak ketiga.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Hak Kamu</h2>
        <p className={styles.paragraph}>Sesuai dengan UU Perlindungan Data Pribadi Indonesia (UU PDP), kamu memiliki hak untuk:</p>
        <ul className={styles.list}>
          <li>Mengakses data pribadi yang kami simpan tentang kamu.</li>
          <li>Meminta koreksi data pribadi yang tidak akurat.</li>
          <li>Meminta penghapusan akun dan seluruh data terkait.</li>
          <li>Menarik persetujuan pengolahan data kapan saja.</li>
        </ul>
        <p className={styles.paragraph}>
          Untuk menggunakan hak ini, hubungi kami melalui kontak di bawah.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Keamanan</h2>
        <p className={styles.paragraph}>
          Kami menerapkan langkah keamanan termasuk: enkripsi data dalam transit (HTTPS),
          Row Level Security di database, validasi URL untuk mencegah SSRF, deteksi prompt injection,
          dan rate limiting. Namun, tidak ada sistem yang 100% aman.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Cookie</h2>
        <p className={styles.paragraph}>
          WebWeave menggunakan cookie untuk menyimpan session authentication (melalui Supabase Auth)
          dan preferensi tema (dark/light mode). Kami tidak menggunakan cookie tracking pihak ketiga.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Perubahan Kebijakan</h2>
        <p className={styles.paragraph}>
          Kami dapat memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan signifikan
          akan diinformasikan melalui email atau notifikasi di dalam aplikasi.
        </p>
      </section>

      <div className={styles.divider} />

      <div className={styles.contactBox}>
        <p>
          Pertanyaan tentang privasi? Hubungi kami di{' '}
          <a href="mailto:support@webweave.app">support@webweave.app</a>
        </p>
      </div>
    </div>
  );
}
