import styles from './HeroVideo.module.css';

const VIDEO_ID = 'on7git_qV2g';

export default function HeroVideo() {
    const src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&modestbranding=1&rel=0&playsinline=1`;
    return (
        <section className={styles.wrap} aria-label="主視覺影片">
            <div className={styles.frame}>
                <iframe
                    className={styles.iframe}
                    src={src}
                    title="BGLARP 主視覺影片"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                />
            </div>
            <div className={styles.gradTop} />
            <div className={styles.gradBottom} />
        </section>
    );
}
