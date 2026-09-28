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
            <p className={styles.analyticsNotice}>官網使用每日更新的匿名識別碼，統計頁面瀏覽與按鈕點擊，協助改善內容。</p>
        </footer>
    );
}
