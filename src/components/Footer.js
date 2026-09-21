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
            <div className={styles.legal}>
                <span>營運單位：嘰嘰喳喳企業社</span>
                <span>統編：60805054</span>
            </div>
        </footer>
    );
}
