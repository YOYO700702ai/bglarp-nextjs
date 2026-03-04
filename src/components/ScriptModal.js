'use client';
import { useEffect } from 'react';
import styles from './ScriptModal.module.css';

export default function ScriptModal({ card, onClose }) {
    // Lock body scroll when modal open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const fallback = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=800&auto=format&fit=crop';
    const dur = card.duration || '未標示';
    const price = card.price ? `NT$ ${card.price}/人` : '價格未定';
    const playersStr = (card.players || []).join(', ');

    const tags = Array.isArray(card.genre) ? card.genre : [];
    const allTags = [...(card.players || []), ...tags];

    const synopsis = card.synopsis || '（資料未建立）';
    const paragraphs = synopsis.split('\n').filter(p => p.trim());

    // Parse characters
    const charLines = (card.characters || '').split('\n').filter(l => l.trim());
    const avatarStyles = ['adventurer', 'avataaars', 'big-ears', 'lorelei', 'micah', 'miniavs', 'personas', 'bottts'];

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>

                {/* Poster */}
                <div className={styles.posterWrap}>
                    <div className={styles.posterBg} style={{ backgroundImage: `url('${card.image || fallback}')` }} />
                    <div className={styles.posterGrad} />
                    <div className={styles.posterTitle}>
                        <h1>{card.name}</h1>
                    </div>
                </div>

                {/* Tags */}
                <div className={styles.tagRow}>
                    {allTags.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}
                </div>

                {/* Info grid */}
                <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>人數限制</div>
                        <div className={styles.infoValue}>{playersStr || '未知'}</div>
                    </div>
                    <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>預估時長</div>
                        <div className={styles.infoValue}>{dur}</div>
                    </div>
                    <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>收費標準</div>
                        <div className={styles.infoValue}>{price}</div>
                    </div>
                </div>

                {/* Synopsis */}
                <div className={styles.sectionTitle}>劇情指引</div>
                <div className={styles.synopsisWrap}>
                    {paragraphs.map((p, i) => (
                        <p key={i} className={styles.synPara}>{p.trim()}</p>
                    ))}
                </div>

                {/* Characters */}
                {charLines.length > 0 && (
                    <>
                        <div className={styles.sectionTitle}>角色檔案</div>
                        <div className={styles.charGrid}>
                            {charLines.map((line, idx) => {
                                let charName = line;
                                let charDesc = '';
                                for (const sep of ['：', ':', '－', ' - ']) {
                                    if (line.includes(sep)) {
                                        const parts = line.split(sep);
                                        charName = parts[0].trim();
                                        charDesc = parts.slice(1).join(sep).trim();
                                        break;
                                    }
                                }
                                const avatarStyle = avatarStyles[idx % avatarStyles.length];
                                const seed = `${card.name}_${charName}_${idx}`;
                                const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=1a1a2e,16213e,0f3460&radius=50`;
                                return (
                                    <div key={idx} className={styles.charItem}>
                                        <img src={avatarUrl} alt={charName} className={styles.charAvatar} />
                                        <div className={styles.charName}>{charName}</div>
                                        {charDesc && <div className={styles.charDesc}>{charDesc}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Book button */}
                <div className={styles.bookWrap}>
                    <a href="https://www.facebook.com/bglarp.studio/" target="_blank" rel="noopener noreferrer" className={styles.bookBtn}>
                        馬上預約 →
                    </a>
                </div>
            </div>
        </div>
    );
}
