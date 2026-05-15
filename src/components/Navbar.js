'use client';
import Link from 'next/link';
import { useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🎬</span> BGLARP
                </Link>
                <button
                    className={styles.burger}
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle menu"
                >
                    <span className={`${styles.bar} ${open ? styles.bar1Open : ''}`} />
                    <span className={`${styles.bar} ${open ? styles.bar2Open : ''}`} />
                    <span className={`${styles.bar} ${open ? styles.bar3Open : ''}`} />
                </button>
                <div className={`${styles.links} ${open ? styles.linksOpen : ''}`}>
                    <Link href="/#scripts" onClick={() => setOpen(false)}>上映劇本</Link>
                    <Link href="/#booking" onClick={() => setOpen(false)}>預約入戲</Link>
                </div>
            </div>
        </nav>
    );
}
