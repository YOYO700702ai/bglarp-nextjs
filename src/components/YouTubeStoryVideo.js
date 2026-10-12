'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './YouTubeStoryVideo.module.css';

export default function YouTubeStoryVideo({ video, className = '' }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`${styles.player} ${className}`}>
      {playing ? (
        <iframe
          className={styles.media}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1`}
          title={video.title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.poster}
          onClick={() => setPlaying(true)}
          aria-label={`播放 ${video.title}`}
        >
          <Image
            className={styles.posterImage}
            src={video.poster}
            alt={video.title}
            fill
            sizes="(max-width: 400px) 85vw, 360px"
          />
          <span className={styles.playButton} aria-hidden="true">
            <svg viewBox="0 0 64 64" width="64" height="64">
              <circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.75)" stroke="#E8A63B" strokeWidth="2" />
              <polygon points="26,20 26,44 46,32" fill="#E8A63B" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
