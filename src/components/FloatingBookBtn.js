'use client';
import styles from './FloatingBookBtn.module.css';

export default function FloatingBookBtn() {
    return (
        <a
            href="https://www.facebook.com/bglarp.studio/"
            data-analytics-target="booking:facebook"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
        >
            📩 立即預約
        </a>
    );
}
