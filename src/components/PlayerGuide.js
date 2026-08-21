import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { HOME_FAQ_JSON_LD, PLAYER_FAQS } from '@/lib/seo';
import styles from './PlayerGuide.module.css';

const STARTING_POINTS = [
  {
    number: '01',
    title: '先確認人數',
    text: '每個角色都會影響故事，先用同行人數篩選能玩的劇本。',
  },
  {
    number: '02',
    title: '再挑遊戲口味',
    text: '喜歡抽絲剝繭、情感沉浸、歡樂互動或陣營對抗，都有不同選擇。',
  },
  {
    number: '03',
    title: '確認時間與預算',
    text: '劇本頁會列出預估時長與每人收費，預約前就能一起確認。',
  },
];

export default function PlayerGuide() {
  return (
    <section id="guide" className={styles.section} aria-labelledby="player-guide-title">
      <JsonLd id="bglarp-player-faq-jsonld" data={HOME_FAQ_JSON_LD} />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>FIRST VISIT</span>
            <h2 id="player-guide-title">第一次玩台中劇本殺？先看這裡</h2>
          </div>
          <p>
            不用先研究術語。從人數、喜好、時間與價格開始，
            就能找到適合這次聚會的故事。
          </p>
        </header>

        <div className={styles.startGrid}>
          {STARTING_POINTS.map(item => (
            <article key={item.number} className={styles.startCard}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.faqBlock}>
          <div className={styles.faqHeading}>
            <span>QUICK ANSWERS</span>
            <h3>玩家常見問題</h3>
          </div>

          <div className={styles.faqList}>
            {PLAYER_FAQS.map((item, index) => (
              <details key={item.question} className={styles.faqItem} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/scripts" className={styles.primaryAction}>查看上映劇本</Link>
          <Link href="/taichung/booking" className={styles.secondaryAction}>查看預約方式</Link>
          <a
            href="https://m.me/bglarp.studio"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryAction}
          >
            直接私訊推薦
          </a>
        </div>
      </div>
    </section>
  );
}
