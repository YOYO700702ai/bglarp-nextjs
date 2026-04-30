'use client';
import { useState } from 'react';
import styles from './HeroVideo.module.css';

const VIDEO_ID = 'on7git_qV2g';

export default function HeroVideo() {
    const [playing, setPlaying] = useState(false);
    const src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

    return (
        <section className={styles.wrap} aria-label="主視覺影片">
            <div className={styles.frame}>
                {playing ? (
                    <iframe
                        className={styles.iframe}
                        src={src}
                        title="BGLARP 主視覺影片"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                    />
                ) : (
                    <button
                        type="button"
                        className={styles.poster}
                        onClick={() => setPlaying(true)}
                        aria-label="播放主視覺影片"
                    >
                        <img src="/hero-cover.jpg" alt="" className={styles.posterImg} />
                        <span className={styles.playBtn} aria-hidden="true">
                            <svg viewBox="0 0 64 64" width="48" height="48">
                                <circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.55)" stroke="#E8A63B" strokeWidth="2" />
                                <polygon points="26,20 26,44 46,32" fill="#E8A63B" />
                            </svg>
                        </span>
                    </button>
                )}
            </div>
            <div className={styles.gradTop} />
            <div className={styles.gradBottom} />
        </section>
    );
}
