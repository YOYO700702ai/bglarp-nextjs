import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.bgWrap}>
                <div className={styles.overlay} />
                <img
                    src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop"
                    alt="bg"
                    className={styles.bgImg}
                />
            </div>
            <div className={styles.content}>
                <h1 className={styles.title}>
                    打破現實與虛構的<span className={styles.accent}>邊界</span>
                </h1>
                <p className={styles.subtitle}>走進專屬場景，演繹你的第二人生。</p>
            </div>
        </section>
    );
}
