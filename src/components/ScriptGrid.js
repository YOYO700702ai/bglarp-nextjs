'use client';
import { useState, useEffect } from 'react';
import ScriptCard from './ScriptCard';
import styles from './ScriptGrid.module.css';

export default function ScriptGrid() {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playerFilter, setPlayerFilter] = useState('全部');
    const [genreFilter, setGenreFilter] = useState('全部');
    const [displayLimit, setDisplayLimit] = useState(10);

    useEffect(() => {
        fetch('/api/scripts')
            .then(r => r.json())
            .then(data => { setScripts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Reset limit when filters change
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
                match = /機制|陣營|歡樂|撕/.test(genreStr);
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
                <div className={styles.header}>
                    <span className={styles.tag}>NOW SHOWING</span>
                    <h2 className={styles.heading}>現正熱映</h2>
                </div>

                <div className={styles.filters}>
                    <select value={playerFilter} onChange={e => setPlayerFilter(e.target.value)} className={styles.select}>
                        <option>全部</option>
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
            </div>
        </section>
    );
}
