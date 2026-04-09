import styles from './BookingSection.module.css';

export default function BookingSection() {
    return (
        <section id="booking" className={styles.section}>
            <div className={styles.container}>
                <div className={styles.info}>
                    <span className={styles.tag}>BOX OFFICE</span>
                    <h2 className={styles.heading}>預約遊玩</h2>
                    <p className={styles.desc}>
                        BGLARP實境推理館採全預約制。為確保最佳的遊戲體驗，請提前至少 3 天透過臉書專頁私訊或致電進行預約。
                    </p>
                    <p className={styles.desc}>
                        新手玩家無須擔心，預約時告知我們，客服將為您推薦最適合的入門劇本。每場次皆提供相應時代風格之服裝，為求完美沉浸，建議提早 15 分鐘到場換裝。
                    </p>

                    <div className={styles.contactList}>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            </div>
                            <div>
                                <h4>劇院地址</h4>
                                <a href="https://www.google.com/maps/search/?api=1&query=台中市北區太平路19巷1號3樓" target="_blank" rel="noopener noreferrer">
                                    台中市北區太平路19巷1號3樓
                                </a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            </div>
                            <div>
                                <h4>連絡電話</h4>
                                <a href="tel:0422250020">(04) 2225-0020</a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                            </div>
                            <div>
                                <h4>臉書專頁</h4>
                                <a href="https://www.facebook.com/bglarp.studio/" target="_blank" rel="noopener noreferrer">BGLARP實境推理館</a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                            </div>
                            <div>
                                <h4>IG帳號</h4>
                                <a href="https://www.instagram.com/bglarp.studio/" target="_blank" rel="noopener noreferrer">bglarp.studio</a>
                            </div>
                        </div>
                    </div>

                    <a href="https://m.me/bglarp.studio" target="_blank" rel="noopener noreferrer" className={styles.bookBtn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        私訊預約
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
