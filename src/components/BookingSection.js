import styles from './BookingSection.module.css';

export default function BookingSection() {
    return (
        <section id="booking" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.info}>
                    <span className={styles.tag}>BOX OFFICE</span>
                    <h2 className={styles.heading}>預約入戲</h2>
                    <p className={styles.desc}>
                        BGLARP實境推理館採全預約制。為確保最佳的遊戲體驗，請提前至少 3 天透過臉書專頁私訊或致電進行預約。
                    </p>
                    <p className={styles.desc}>
                        新手玩家無須擔心，預約時告知我們，客服將為您推薦最適合的入門劇本。每場次皆提供相應時代風格之服裝，為求完美沉浸，建議提早 15 分鐘到場換裝。
                    </p>

                    <div className={styles.contactList}>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>📍</div>
                            <div>
                                <h4>劇院地址</h4>
                                <a href="https://www.google.com/maps/search/?api=1&query=台中市北區太平路19巷1號3樓" target="_blank" rel="noopener noreferrer">
                                    台中市北區太平路19巷1號3樓<br />(一中街麥當勞正對面三樓)
                                </a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>📞</div>
                            <div>
                                <h4>連絡電話</h4>
                                <a href="tel:0422250020">(04) 2225-0020</a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>📘</div>
                            <div>
                                <h4>臉書專頁</h4>
                                <a href="https://www.facebook.com/bglarp.studio/" target="_blank" rel="noopener noreferrer">BGLARP實境推理館</a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>📷</div>
                            <div>
                                <h4>IG帳號</h4>
                                <a href="https://www.instagram.com/bglarp.studio/" target="_blank" rel="noopener noreferrer">bglarp.studio</a>
                            </div>
                        </div>
                    </div>

                    <a href="https://m.me/bglarp.studio" target="_blank" rel="noopener noreferrer" className={styles.bookBtn}>
                        📩 私訊預約
                    </a>
                </div>

                <div className={styles.mapWrap}>
                    <div className={styles.mapShadow} />
                    <iframe
                        src="https://maps.google.com/maps?q=台中市北區太平路19巷1號&t=&z=16&ie=UTF8&iwloc=&output=embed"
                        className={styles.map}
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            </div>
        </section>
    );
}
