'use client';
import styles from './FloatingBookBtn.module.css';

export default function FloatingBookBtn() {
    return (
        <a
            href="https://m.me/bglarp.studio"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
        >
            📩 立即預約
        </a>
    );
}
