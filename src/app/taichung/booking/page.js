import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BookingSection from '@/components/BookingSection';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';
import JsonLd from '@/components/JsonLd';
import { BOOKING_PAGE_JSON_LD } from '@/lib/seo';
import styles from './page.module.css';

export const metadata = {
  title: '台中一中街劇本殺預約 | BGLARP 實境推理館',
  description: 'BGLARP 採全預約制，建議至少提前 3 天私訊或致電，提供日期、時段、人數與劇本偏好。',
  alternates: { canonical: '/taichung/booking' },
  openGraph: {
    title: '台中一中街劇本殺預約 | BGLARP',
    description: '查看 BGLARP 預約流程、聯絡方式與台中一中街店址。',
    url: '/taichung/booking',
    type: 'website',
  },
};

const STEPS = [
  {
    number: '01',
    title: '確認日期、時段與人數',
    text: '先整理希望遊玩的日期、可配合時段，以及最終玩家人數。',
  },
  {
    number: '02',
    title: '提供劇本或遊戲偏好',
    text: '可直接告訴我們想玩的劇本，也可說明喜歡推理、沉浸、歡樂、機制或恐怖類型。',
  },
  {
    number: '03',
    title: '由店家回覆確認場次',
    text: '場次、遊戲時長與最終費用以預約回覆為準，確認完成後再安排行程。',
  },
];

export default function BookingPage() {
  return (
    <>
      <Navbar />
      <JsonLd id="bglarp-booking-page-jsonld" data={BOOKING_PAGE_JSON_LD} />

      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.inner}>
            <nav aria-label="麵包屑" className={styles.breadcrumb}>
              <Link href="/">BGLARP 首頁</Link>
              <span aria-hidden="true">/</span>
              <span>預約入戲</span>
            </nav>
            <span className={styles.kicker}>RESERVATION GUIDE</span>
            <h1>台中一中街劇本殺預約</h1>
            <p>
              BGLARP 實境推理館採全預約制，建議至少提前 3 天聯絡。
              預約時提供日期、時段、人數，以及想玩的劇本或偏好類型，可以更快完成場次確認。
            </p>
            <div className={styles.actions}>
              <a href="https://m.me/bglarp.studio" target="_blank" rel="noopener noreferrer">開啟 Messenger 私訊</a>
              <a href="tel:0422250020">致電（04）2225-0020</a>
              <Link href="/scripts">先挑選劇本</Link>
            </div>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="booking-process-title">
          <div className={styles.processInner}>
            <header>
              <span className={styles.kicker}>THREE STEPS</span>
              <h2 id="booking-process-title">預約前先準備這些資訊</h2>
            </header>
            <div className={styles.stepGrid}>
              {STEPS.map(step => (
                <article key={step.number} className={styles.stepCard}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <BookingSection />
      </main>

      <Footer />
      <FloatingBookBtn />
    </>
  );
}
