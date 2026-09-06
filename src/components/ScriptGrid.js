'use client';
import { useState, useEffect } from 'react';
import ScriptCard from './ScriptCard';
import { getScriptExperience } from '@/lib/scriptExperiences';
import { FLAGSHIP_PRICE_MIN, isFlagshipScript } from '@/lib/scriptClassification';
import styles from './ScriptGrid.module.css';

const FLAGSHIP_TAB = '旗艦劇本區';
const TABS = ['現正熱映', FLAGSHIP_TAB, '心測專區', '預約入戲'];
const TAB_HASHES = {
    '現正熱映': '#scripts',
    [FLAGSHIP_TAB]: '#scripts-flagship',
    '心測專區': '#quiz',
    '預約入戲': '#scripts-booking',
};
const HASH_TABS = Object.fromEntries(
    Object.entries(TAB_HASHES).map(([tab, hash]) => [hash, tab]),
);
const BOOKING_URL = 'https://m.me/bglarp.studio';
const FEATURED_STORY = {
    videoId: '6bYtqkPyz90',
    poster: 'https://i.ytimg.com/vi/6bYtqkPyz90/hqdefault.jpg',
    title: '下一場故事，等你入戲',
    subtitle: '揪上朋友，一起成為故事裡的主角。',
    description: '想燒腦推理、投入角色情感，或來場歡樂聚會？告訴我們人數、日期與喜歡的類型，讓 BGLARP 陪你挑選適合的劇本，預約一場難忘的相聚。',
    highlights: ['好友揪團', '沉浸體驗', '私訊選本'],
};
const TAB_KICKERS = {
    '現正熱映': 'NOW SHOWING',
    [FLAGSHIP_TAB]: 'PREMIUM SCRIPT ROOM',
    '心測專區': 'PERSONALITY STORIES',
    '預約入戲': 'YOUR NEXT STORY',
};
const FLAGSHIP_NOTES = [
    `每人價格 NT$${FLAGSHIP_PRICE_MIN}（含）以上`,
    '時長長 - 屁股要有把握撐住',
    '有可能有多NPC陪你，有可能有刺激的機制等你',
    '只要能撐住，你將會得到難忘珍貴的遊玩體驗',
];

export default function ScriptGrid() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playerFilter, setPlayerFilter] = useState('全部');
    const [genreFilter, setGenreFilter] = useState('全部');
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(25);
    const [activeTab, setActiveTab] = useState('預約入戲');
    const [activityPlaying, setActivityPlaying] = useState(false);

    const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
    const fuzzyMatch = (name, query) => {
        const n = normalize(name);
        const q = normalize(query);
        if (!q) return true;
        if (n.includes(q)) return true;
        // Subsequence match: every char of query appears in name in order
        let i = 0;
        for (const ch of n) {
            if (ch === q[i]) i++;
            if (i === q.length) return true;
        }
        return false;
    };

    useEffect(() => {
        fetch('/api/scripts')
            .then(r => r.json())
            .then(data => { setScripts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        const activateLinkedTab = (tab) => {
            window.requestAnimationFrame(() => {
                setActiveTab(tab);
                window.requestAnimationFrame(() => {
                    document.getElementById('scripts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });
        };

        const syncTabFromLocation = () => {
            const linkedTab = HASH_TABS[window.location.hash];
            if (linkedTab) activateLinkedTab(linkedTab);
        };

        const handleLinkedTabClick = (event) => {
            const link = event.target.closest?.('a[href]');
            if (!link) return;

            const target = new URL(link.href, window.location.href);
            if (target.origin !== window.location.origin || target.pathname !== window.location.pathname) return;

            const linkedTab = HASH_TABS[target.hash];
            if (linkedTab) activateLinkedTab(linkedTab);
        };

        syncTabFromLocation();
        document.addEventListener('click', handleLinkedTabClick);
        window.addEventListener('hashchange', syncTabFromLocation);
        window.addEventListener('popstate', syncTabFromLocation);
        return () => {
            document.removeEventListener('click', handleLinkedTabClick);
            window.removeEventListener('hashchange', syncTabFromLocation);
            window.removeEventListener('popstate', syncTabFromLocation);
        };
    }, []);

    let tabScripts = scripts;
    if (activeTab === FLAGSHIP_TAB) {
        tabScripts = scripts.filter(isFlagshipScript);
    } else if (activeTab === '心測專區') {
        tabScripts = scripts.filter(s => getScriptExperience(s.name)?.url);
    }

    const filtered = tabScripts.filter(s => {
        if (genreFilter !== '全部') {
            if (!s.genre || s.genre.length === 0) return false;
            const genreStr = s.genre.join(',');
            let match = false;
            if (genreFilter === '恐怖') {
                match = /恐|驚悚/.test(genreStr);
            } else if (genreFilter === '沉浸') {
                match = /沉浸|情感|演繹/.test(genreStr);
            } else if (genreFilter === '機制') {
                match = /機制|陣營|撕/.test(genreStr);
            } else if (genreFilter === '歡樂') {
                match = /歡樂|輕鬆|搞笑/.test(genreStr);
            } else if (genreFilter === '推理') {
                match = /推理/.test(genreStr);
            } else if (genreFilter === '還原') {
                match = /還原/.test(genreStr);
            } else {
                match = genreStr.includes(genreFilter);
            }
            if (!match) return false;
        }
        if (playerFilter !== '全部') {
            if (playerFilter === '9人以上') {
                const has9Plus = (s.players || []).some(p => {
                    const m = p.match(/(\d+)/);
                    return m && parseInt(m[1]) >= 9;
                });
                if (!has9Plus) return false;
            } else {
                if (!(s.players || []).includes(playerFilter)) return false;
            }
        }
        if (searchQuery && !fuzzyMatch(s.name, searchQuery)) return false;
        return true;
    });

    const visible = filtered.slice(0, displayLimit);
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setActivityPlaying(false);
        setDisplayLimit(25);
        const hash = TAB_HASHES[tab];
        if (hash) {
            window.history.replaceState(
                null,
                '',
                `${window.location.pathname}${window.location.search}${hash}`,
            );
        }
    };
    const handlePlayerFilterChange = (value) => {
        setPlayerFilter(value);
        setDisplayLimit(25);
    };
    const handleGenreFilterChange = (value) => {
        setGenreFilter(value);
        setDisplayLimit(25);
    };
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setDisplayLimit(25);
    };

    return (
        <section id="scripts" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <div className={styles.headerLeft}>
                        <span className={styles.tag}>{TAB_KICKERS[activeTab] || 'NOW SHOWING'}</span>
                        <h2 className={styles.heading}>{activeTab}</h2>
                    </div>
                    <div className={styles.tabBar}>
                        {TABS.map(t => (
                            <button
                                key={t}
                                className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
                                onClick={() => handleTabChange(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <span id="quiz" className={styles.anchorOffset} aria-hidden="true" />
                {(activeTab === '現正熱映' || activeTab === FLAGSHIP_TAB || activeTab === '心測專區') ? (
                    <>
                        {activeTab === '心測專區' && (
                            <aside className={styles.quizIntro} aria-label="心測專區介紹">
                                <div className={styles.quizIntroKicker}>PERSONALITY STORIES</div>
                                <p className={styles.quizIntroLine}>在故事開始之前，先遇見另一個自己。</p>
                                <p className={styles.quizIntroSub}>一分鐘心測，測出你最像劇本裡的誰。</p>
                            </aside>
                        )}

                        {activeTab === FLAGSHIP_TAB && (
                            <aside className={styles.luxuryIntro} aria-label="旗艦劇本區介紹">
                                <div className={styles.luxuryGlow} />
                                <div className={styles.luxuryKicker}>PREMIUM SCRIPT ROOM</div>
                                <div className={styles.luxuryContent}>
                                    <p className={styles.luxuryLead}>這裡的劇本</p>
                                    <ul className={styles.luxuryList}>
                                        {FLAGSHIP_NOTES.map(note => (
                                            <li key={note}>{note}</li>
                                        ))}
                                    </ul>
                                    <p className={styles.luxuryFinal}>
                                        錢包跟<span className={styles.strikeText}>屁股</span>準備好了？
                                    </p>
                                </div>
                            </aside>
                        )}

                        <div className={styles.filters}>
                            <select value={playerFilter} onChange={e => handlePlayerFilterChange(e.target.value)} className={styles.select}>
                                <option>全部</option>
                                <option>4人</option>
                                <option>5人</option>
                                <option>6人</option>
                                <option>7人</option>
                                <option>8人</option>
                                <option>9人以上</option>
                            </select>
                            <select value={genreFilter} onChange={e => handleGenreFilterChange(e.target.value)} className={styles.select}>
                                <option>全部</option>
                                <option>新手</option>
                                <option>推理</option>
                                <option>還原</option>
                                <option>沉浸</option>
                                <option>恐怖</option>
                                <option>機制</option>
                                <option>歡樂</option>
                            </select>
                            <div className={styles.searchWrap}>
                                <svg className={styles.searchIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <line x1="20" y1="20" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    placeholder="搜尋劇本"
                                    className={styles.searchInput}
                                    aria-label="搜尋劇本"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <p className={styles.loading}>載入中...</p>
                        ) : visible.length === 0 ? (
                            <div className={styles.noResult}>
                                <p>找不到符合條件的劇本。</p>
                                <p className={styles.noResultHint}>換個關鍵字試試，或直接告訴我們你想玩什麼——</p>
                                <a
                                    href="https://m.me/bglarp.studio"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.noResultBtn}
                                >
                                    私訊我們幫你找 →
                                </a>
                            </div>
                        ) : (
                            <>
                                <div className={styles.grid}>
                                    {visible.map((s, i) => (
                                        <ScriptCard key={s.name} card={s} />
                                    ))}
                                </div>
                                {filtered.length > displayLimit && (
                                    <div className={styles.moreBtnWrap}>
                                        <button className={styles.moreBtn} onClick={() => setDisplayLimit(n => n + 25)}>
                                            顯示更多
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : activeTab === '預約入戲' ? (
                    <div className={styles.activityLayout}>
                        <section className={styles.activityFeature} aria-label="預約劇本體驗">
                            <div className={styles.activityCopy}>
                                <span className={styles.activityKicker}>YOUR NEXT STORY</span>
                                <h3>{FEATURED_STORY.title}</h3>
                                <p className={styles.activitySubtitle}>{FEATURED_STORY.subtitle}</p>
                                <div className={styles.activityActions}>
                                    <a
                                        href={BOOKING_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        私訊預約
                                    </a>
                                </div>
                                <p className={styles.activityDescription}>{FEATURED_STORY.description}</p>
                                <div className={styles.activityTags}>
                                    {FEATURED_STORY.highlights.map(item => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.activityCampaignPanel} aria-label="BGLARP 劇本體驗短片">
                                <div className={styles.activityVideoFrame}>
                                    {activityPlaying ? (
                                        <iframe
                                            className={styles.activityIframe}
                                            src={`https://www.youtube-nocookie.com/embed/${FEATURED_STORY.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&controls=1&iv_load_policy=3`}
                                            title="BGLARP 劇本體驗短片"
                                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.activityPoster}
                                            onClick={() => setActivityPlaying(true)}
                                            aria-label="播放 BGLARP 劇本體驗短片"
                                        >
                                            <img src={FEATURED_STORY.poster} alt="" referrerPolicy="no-referrer" />
                                            <span className={styles.activityPlayBtn} aria-hidden="true">
                                                <svg viewBox="0 0 64 64" width="58" height="58">
                                                    <circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.56)" stroke="#E8A63B" strokeWidth="2" />
                                                    <polygon points="26,20 26,44 46,32" fill="#E8A63B" />
                                                </svg>
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                    </div>
                ) : (
                    <div className={styles.emptyPanel}>
                        {/* {activeTab} 內容待填入 */}
                    </div>
                )}
            </div>
        </section>
    );
}
