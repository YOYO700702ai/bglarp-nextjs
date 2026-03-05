'use client';
import { useState, useEffect, useMemo } from 'react';
import styles from './Hero.module.css';

const CURTAIN_BG = 'https://github.com/YOYO700702ai/BGLARPA5/blob/main/%E7%B4%85%E8%89%B2%E5%B8%83%E5%B9%95.jpg?raw=true';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=800&auto=format&fit=crop';

// Fisher-Yates shuffle
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function Hero() {
    const [scripts, setScripts] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/scripts')
            .then(r => r.json())
            .then(data => {
                setScripts(data);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    // Pick up to 10 random script images (those that have an image)
    const posters = useMemo(() => {
        const withImage = scripts.filter(s => s.image);
        if (withImage.length === 0) return [];
        const shuffled = shuffle(withImage);
        return shuffled.slice(0, Math.min(10, shuffled.length));
    }, [scripts]);

    // Duplicate for seamless infinite scroll
    const track = useMemo(() => [...posters, ...posters], [posters]);

    return (
        <section className={`${styles.hero} ${loaded ? styles.heroLoaded : styles.heroLoading}`}>
            {/* 背景紅色布幕 */}
            <div className={styles.bgWrap}>
                <img src={CURTAIN_BG} alt="紅色布幕背景" className={styles.bgImg} />
                <div className={styles.overlay} />
            </div>

            {/* 左上角文字裝飾 */}
            <div className={styles.titleText}>
                <h1>劇本放映中</h1>
            </div>

            {/* 傾斜的膠捲容器 */}
            <div className={styles.filmContainer}>
                <div className={styles.marqueeTrack}>
                    {track.length > 0 ? (
                        track.map((s, i) => (
                            <div className={styles.posterCard} key={i}>
                                <img
                                    src={s.image || FALLBACK_POSTER}
                                    alt={s.name || '劇本海報'}
                                    loading="lazy"
                                    onError={e => { e.target.src = FALLBACK_POSTER; }}
                                />
                            </div>
                        ))
                    ) : loaded ? (
                        /* If no script images available, show placeholder posters */
                        Array.from({ length: 14 }).map((_, i) => (
                            <div className={styles.posterCard} key={i}>
                                <img src={FALLBACK_POSTER} alt="劇本海報" />
                            </div>
                        ))
                    ) : null}
                </div>
            </div>

            {/* 底部文字區塊 */}
            <div className={styles.bottomText}>
                <h2>打破現實與虛構的邊界，演藝你的第二人生</h2>
            </div>
        </section>
    );
}
