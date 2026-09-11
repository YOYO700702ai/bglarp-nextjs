'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🎬</span> BGLARP
                </Link>
                <button
                    className={styles.burger}
                    onClick={() => setOpen(!open)}
                    aria-label={open ? '關閉選單' : '開啟選單'}
                    aria-expanded={open}
                    aria-controls="main-navigation-links"
                >
                    <span className={`${styles.bar} ${open ? styles.bar1Open : ''}`} />
                    <span className={`${styles.bar} ${open ? styles.bar2Open : ''}`} />
                    <span className={`${styles.bar} ${open ? styles.bar3Open : ''}`} />
                </button>
                <div id="main-navigation-links" className={`${styles.links} ${open ? styles.linksOpen : ''}`}>
                    <Link href="/#scripts" onClick={() => setOpen(false)}>現正熱映</Link>
                    <Link href="/guide" onClick={() => setOpen(false)}>新手指南</Link>
                    <Link href="/team-building" aria-current={pathname === '/team-building' ? 'page' : undefined} onClick={() => setOpen(false)}>企業團建</Link>
                    <Link href="/taichung/booking" onClick={() => setOpen(false)}>預約入戲</Link>
                </div>
            </div>
        </nav>
    );
}
