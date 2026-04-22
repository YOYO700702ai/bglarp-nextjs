'use client';
import { useState, useEffect } from 'react';
import ScriptCard from './ScriptCard';
import styles from './ScriptGrid.module.css';

const TABS = ['現正熱映', '優惠專區', '鎮店之本', 'GM介紹'];

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

    useEffect(() => { setDisplayLimit(10); }, [playerFilter, genreFilter]);

    const filtered = scripts.filter(s => {
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
            } else if (genreFilter === '硬核') {
                match = /硬核|燒腦/.test(genreStr);
            } else if (genreFilter === '推理') {
                match = /推理|還原/.test(genreStr);
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

    return (
        <section id="scripts" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <div className={styles.headerLeft}>
                        <span className={styles.tag}>NOW SHOWING</span>
                        <h2 className={styles.heading}>現正熱映</h2>
                    </div>
                    <div className={styles.tabBar}>
                        {TABS.map(t => (
                            <button
                                key={t}
                                className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(t)}
                            >
                                [{t}]
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === '現正熱映' ? (
                    <>
                        <div className={styles.filters}>
                            <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} className={styles.select}>
                                <option>全部</option>
                                <option>4人</option>
                                <option>5人</option>
                                <option>6人</option>
                                <option>7人</option>
                                <option>8人</option>
                                <option>9人以上</option>
                            </select>
                            <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} className={styles.select}>
                                <option>全部</option>
                                <option>推理</option>
                                <option>硬核</option>
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
