'use client';
import { useState, useEffect } from 'react';
import ScriptCard from './ScriptCard';
import styles from './ScriptGrid.module.css';

const TABS = ['現正熱映', '奢華劇本區'];
const LUXURY_PRICE_THRESHOLD = 1000;
const LUXURY_NOTES = [
    '時長長 - 屁股要有把握撐住',
    '價格貴 - 可能要花掉你幾頓晚餐',
    '有可能有多NPC陪你，有可能有刺激的機制等你',
    '只要能撐住，你將會得到難忘珍貴的遊玩體驗',
];

export default function ScriptGrid() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playerFilter, setPlayerFilter] = useState('全部');
    const [genreFilter, setGenreFilter] = useState('全部');
    const [displayLimit, setDisplayLimit] = useState(10);
    const [activeTab, setActiveTab] = useState('現正熱映');

    useEffect(() => {
        fetch('/api/scripts')
            .then(r => r.json())
            .then(data => { setScripts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const tabScripts = activeTab === '奢華劇本區'
        ? scripts.filter(s => typeof s.price === 'number' && s.price > LUXURY_PRICE_THRESHOLD)
        : scripts;

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
        return true;
    });

    const visible = filtered.slice(0, displayLimit);
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setDisplayLimit(10);
    };
    const handlePlayerFilterChange = (value) => {
        setPlayerFilter(value);
        setDisplayLimit(10);
    };
    const handleGenreFilterChange = (value) => {
        setGenreFilter(value);
        setDisplayLimit(10);
    };

    return (
        <section id="scripts" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <div className={styles.headerLeft}>
                        <span className={styles.tag}>NOW SHOWING</span>
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

                {(activeTab === '現正熱映' || activeTab === '奢華劇本區') ? (
                    <>
                        {activeTab === '奢華劇本區' && (
                            <aside className={styles.luxuryIntro} aria-label="奢華劇本區介紹">
                                <div className={styles.luxuryGlow} />
                                <div className={styles.luxuryKicker}>PREMIUM SCRIPT ROOM</div>
                                <div className={styles.luxuryContent}>
                                    <p className={styles.luxuryLead}>這裡的劇本</p>
                                    <ul className={styles.luxuryList}>
                                        {LUXURY_NOTES.map(note => (
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
                                <option>推理</option>
                                <option>還原</option>
                                <option>沉浸</option>
                                <option>恐怖</option>
                                <option>機制</option>
                                <option>歡樂</option>
                            </select>
                        </div>

                        {loading ? (
                            <p className={styles.loading}>載入中...</p>
                        ) : visible.length === 0 ? (
                            <p className={styles.loading}>無符合條件之劇本。</p>
                        ) : (
                            <>
                                <div className={styles.grid}>
                                    {visible.map((s, i) => (
                                        <ScriptCard key={i} card={s} />
                                    ))}
                                </div>
                                {filtered.length > displayLimit && (
                                    <div className={styles.moreBtnWrap}>
                                        <button className={styles.moreBtn} onClick={() => setDisplayLimit(n => n + 10)}>
                                            顯示更多
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyPanel}>
                        {/* {activeTab} 內容待填入 */}
                    </div>
                )}
            </div>
        </section>
    );
}
