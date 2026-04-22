'use client';
import { useState } from 'react';
import styles from './InfoTabs.module.css';

const TABS = ['優惠專區', '鎮店之本', 'GM介紹'];

export default function InfoTabs() {
  const [active, setActive] = useState(TABS[0]);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.tabBar}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${styles.tab} ${active === t ? styles.active : ''}`}
              onClick={() => setActive(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className={styles.panel}>
          {/* {active} 內容待填入 */}
        </div>
      </div>
    </section>
  );
}
