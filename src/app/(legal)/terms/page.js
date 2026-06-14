import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Syarat & Ketentuan — WebWeave',
  description: 'Syarat dan ketentuan penggunaan WebWeave, termasuk aturan penggunaan layanan, pembayaran, refund, dan batasan tanggung jawab.',
};

export default function TermsOfService() {
  return (
    <div className={styles.legalPage}>
      <Link href="/" className={styles.backLink}>← Kembali ke WebWeave</Link>

      <div className={styles.badge}>Legal</div>
      <h1 className={styles.title}>Syarat & Ketentuan</h1>
      <p className={styles.lastUpdated}>Terakhir diperbarui: 14 Juni 2026</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Tentang Layanan</h2>
        <p className={styles.paragraph}>
          WebWeave adalah layanan AI-powered yang membantu membuat script automation untuk testing website.
          Kamu memasukkan URL target dan objective, lalu WebWeave menganalisis halaman dan menghasilkan
          kode automation menggunakan framework seperti Playwright, Puppeteer, Selenium, atau Cypress.
        </p>
        <p className={styles.paragraph}>
          Dengan menggunakan WebWeave, kamu setuju untuk mematuhi syarat dan ketentuan ini.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Penggunaan yang Diperbolehkan</h2>
        <p className={styles.paragraph}>Kamu boleh menggunakan WebWeave untuk:</p>
        <ul className={styles.list}>
          <li>Membuat script automation untuk QA testing website milik kamu atau yang kamu punya izin untuk test.</li>
          <li>Belajar automation dan eksplorasi framework testing.</li>
          <li>Membuat starter script untuk project profesional kamu.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Penggunaan yang Dilarang</h2>
        <p className={styles.paragraph}>Kamu <strong>tidak boleh</strong> menggunakan WebWeave untuk:</p>
        <ul className={styles.list}>
          <li>Scraping website tanpa izin pemilik website.</li>
          <li>Membuat bot untuk bypass CAPTCHA, credential stuffing, atau serangan otomatis.</li>
          <li>Mengakses atau mengumpulkan data pribadi orang lain tanpa izin.</li>
          <li>Aktivitas ilegal, termasuk hacking, phishing, atau distribusi malware.</li>
          <li>Mencoba mengeksploitasi kerentanan WebWeave atau infrastrukturnya.</li>
          <li>Menyalahgunakan quota atau membuat akun ganda untuk menghindari batas penggunaan.</li>
        </ul>
        <p className={styles.paragraph}>
          Pelanggaran dapat mengakibatkan penangguhan atau penghapusan akun tanpa refund.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Akun dan Keamanan</h2>
        <ul className={styles.list}>
          <li>Kamu bertanggung jawab menjaga keamanan akun dan password kamu.</li>
          <li>Satu orang hanya boleh memiliki satu akun aktif.</li>
          <li>Jangan masukkan kredensial asli (username/password production) ke dalam prompt. Gunakan placeholder.</li>
          <li>Segera laporkan ke kami jika ada penggunaan akun yang tidak sah.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Paket dan Pembayaran</h2>
        <ul className={styles.list}>
          <li>WebWeave menyediakan paket Free, Starter, dan Pro dengan batas generation berbeda.</li>
          <li>Pembayaran diproses melalui Midtrans. Harga dalam Rupiah Indonesia (IDR).</li>
          <li>Paket berbayar berlaku untuk periode 30 hari (bulanan) atau 365 hari (tahunan) dari tanggal pembayaran.</li>
          <li>Quota generation tidak dapat dipindahkan ke bulan berikutnya.</li>
          <li>Setelah periode berakhir, akun akan kembali ke paket Free jika tidak diperpanjang.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Kebijakan Refund</h2>
        <p className={styles.paragraph}>
          Karena layanan WebWeave adalah layanan digital yang langsung aktif setelah pembayaran,
          refund hanya diberikan dalam kondisi berikut:
        </p>
        <ul className={styles.list}>
          <li>Pembayaran ganda (double charge) — refund penuh untuk pembayaran duplikat.</li>
          <li>Layanan tidak bisa diakses selama lebih dari 72 jam berturut-turut karena kesalahan kami — refund prorata.</li>
        </ul>
        <p className={styles.paragraph}>
          Permintaan refund harus diajukan dalam 14 hari setelah pembayaran melalui email ke support kami.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Kode yang Di-generate</h2>
        <ul className={styles.list}>
          <li>Script yang di-generate oleh WebWeave adalah milik kamu. Kamu bebas menggunakan, memodifikasi, dan mendistribusikannya.</li>
          <li>WebWeave tidak menjamin bahwa script yang di-generate akan berjalan sempurna tanpa modifikasi. Script adalah starter code yang mungkin perlu penyesuaian.</li>
          <li>WebWeave tidak bertanggung jawab atas kerusakan atau masalah yang ditimbulkan oleh penggunaan script yang di-generate.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Batasan Tanggung Jawab</h2>
        <p className={styles.paragraph}>
          WebWeave disediakan &quot;sebagaimana adanya&quot; (as-is). Kami tidak menjamin:
        </p>
        <ul className={styles.list}>
          <li>Layanan akan selalu tersedia tanpa gangguan.</li>
          <li>Script yang di-generate akan berjalan 100% benar di semua website.</li>
          <li>Hasil generation akan sesuai dengan ekspektasi kamu di setiap kasus.</li>
        </ul>
        <p className={styles.paragraph}>
          Tanggung jawab maksimal kami terbatas pada jumlah yang kamu bayarkan dalam 30 hari terakhir.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>9. Perubahan Layanan</h2>
        <p className={styles.paragraph}>
          Kami dapat mengubah fitur, harga, atau batas penggunaan WebWeave sewaktu-waktu.
          Perubahan harga berlaku untuk periode billing berikutnya, bukan periode yang sedang berjalan.
          Perubahan signifikan akan diinformasikan minimal 7 hari sebelumnya melalui email.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>10. Hukum yang Berlaku</h2>
        <p className={styles.paragraph}>
          Syarat dan ketentuan ini tunduk pada hukum Republik Indonesia.
          Segala sengketa akan diselesaikan melalui musyawarah terlebih dahulu
          sebelum melalui jalur hukum di pengadilan yang berwenang di Indonesia.
        </p>
      </section>

      <div className={styles.divider} />

      <div className={styles.contactBox}>
        <p>
          Pertanyaan tentang syarat dan ketentuan? Hubungi kami di{' '}
          <a href="mailto:support@webweave.app">support@webweave.app</a>
        </p>
      </div>
    </div>
  );
}
