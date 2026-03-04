import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.logo}>
                <span className={styles.icon}>🎬</span> BGLARP
            </div>
            <div className={styles.copy}>
                &copy; 2026 BGLARP 實境推理館. All Rights Reserved.
            </div>
        </footer>
    );
}
