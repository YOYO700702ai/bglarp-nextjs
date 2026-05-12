'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getScriptExperience } from '@/lib/scriptExperiences';
import styles from './page.module.css';

const fallbackImage = '/luxury-script-bg.jpg';
const fallbackQuizScripts = [
  {
    name: '寒門',
    synopsis: '在古風情感的命運分岔裡，測出你更貼近哪一種角色氣質。',
    genre: ['古風', '情感', '沉浸'],
    players: ['6人'],
    duration: '6～7HR',
    price: 1400,
  },
  {
    name: '塑料溫室',
    synopsis: '在一段段選擇裡，看見自己面對關係、信任與傷口時最真實的樣子。',
    genre: ['情感', '沉浸'],
    players: [],
    duration: '時長未定',
    price: null,
  },
  {
    name: '焚心',
    synopsis: '把直覺交給情境，讓答案帶你走向更貼近自己的故事支線。',
    genre: ['情感', '沉浸'],
    players: [],
    duration: '時長未定',
    price: null,
  },
];

function getQuizImage(script) {
  if (script.name?.includes('寒門')) return '/hanmen-quiz/hanmen-bg.jpg';
  return script.image || fallbackImage;
}

function formatPlayers(players = []) {
  return players.length ? players.join(' / ') : '人數未定';
}

function formatPrice(price) {
  return typeof price === 'number' ? `NT$ ${price} / 人` : '價格未定';
}

export default function QuizPage() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scripts')
      .then((res) => res.json())
      .then((data) => setScripts(Array.isArray(data) ? data : []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, []);

  const quizScripts = useMemo(
    () => scripts
      .map((script) => ({ ...script, experience: getScriptExperience(script.name) }))
      .filter((script) => script.experience),
    [scripts]
  );

  const displayScripts = useMemo(() => {
    const existing = new Set(quizScripts.map((script) => script.name));
    const fallbacks = fallbackQuizScripts
      .filter((script) => !existing.has(script.name))
      .map((script) => ({ ...script, experience: getScriptExperience(script.name) }));
    return [...quizScripts, ...fallbacks].filter((script) => script.experience);
  }, [quizScripts]);

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.kicker}>PERSONALITY STORIES</p>
            <h1>心測專區</h1>
            <p className={styles.lead}>
              每一次選擇，都是一條悄悄分岔的人生支線。你以為自己只是在回答問題，
              其實那些遲疑、偏愛、退讓與奔赴，早已替你寫下更靠近哪個角色的答案。
            </p>
            <p className={styles.subLead}>
              選一個劇本，讓情境替你開場；在故事真正開始以前，先遇見另一個版本的自己。
            </p>
          </div>
        </section>

        <section className={styles.content}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.tag}>QUIZ COLLECTION</span>
            <h2>可遊玩的心測</h2>
          </div>
          <Link href="/#scripts" className={styles.backLink}>回劇本列表</Link>
        </div>

        <aside className={styles.introPanel} aria-label="心測專區介紹">
          <div className={styles.panelGlow} />
          <div className={styles.panelKicker}>STORY BEFORE THE STORY</div>
          <div className={styles.panelContent}>
            <p className={styles.panelLead}>在入戲之前，先選擇一次自己</p>
            <ul className={styles.panelList}>
              <li>用情境題捕捉你的直覺、偏愛與情感雷點</li>
              <li>每個結果都對應劇本中的角色氣質與關係走向</li>
              <li>適合開場前暖身，也適合揪團前偷偷互相測</li>
              <li>測完再進劇本，會更懂自己為什麼被某些角色打中</li>
            </ul>
          </div>
        </aside>

        {loading ? (
          <p className={styles.loading}>正在整理心測劇本...</p>
        ) : displayScripts.length === 0 ? (
          <p className={styles.loading}>目前尚未建立可顯示的心測劇本。</p>
        ) : (
          <div className={styles.grid}>
            {displayScripts.map((script) => {
              const quizUrl = script.experience.url;
              const external = /^https?:\/\//.test(quizUrl);
              return (
                <article key={script.name} className={styles.card}>
                  <div className={styles.imageWrap}>
                    <img
                      src={getQuizImage(script)}
                      alt={script.name}
                      onError={(event) => { event.currentTarget.src = fallbackImage; }}
                    />
                    <div className={styles.imageShade} />
                    <span className={styles.badge}>{script.experience.label}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.metaRow}>
                      <span>{formatPlayers(script.players)}</span>
                      <span>{script.duration || '時長未定'}</span>
                    </div>
                    <h3>{script.name}</h3>
                    <p className={styles.synopsis}>
                      {(script.synopsis || '選擇一段情境，看看自己會走向哪一種人生故事。')
                        .replace(/\s+/g, ' ')
                        .slice(0, 86)}
                    </p>
                    <div className={styles.tags}>
                      {(script.genre || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <div className={styles.cardFoot}>
                      <span>{formatPrice(script.price)}</span>
                      <div className={styles.actions}>
                        <Link href={`/scripts/${encodeURIComponent(script.name)}`} className={styles.secondaryAction}>
                          查看劇本
                        </Link>
                        <a
                          href={quizUrl}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noopener noreferrer' : undefined}
                          className={styles.primaryAction}
                        >
                          開始心測
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </section>
      </main>
    </>
  );
}
