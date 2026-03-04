import styles from './ScriptCard.module.css';

function formatPlayerRange(players) {
    const nums = players
        .map(p => { const m = p.match(/(\d+)/); return m ? parseInt(m[1]) : null; })
        .filter(Boolean)
        .sort((a, b) => a - b);
    if (!nums.length) return '未知';
    if (nums.length === 1) return `${nums[0]}人`;
    return `${nums[0]}~${nums[nums.length - 1]}人`;
}

export default function ScriptCard({ card, onClick }) {
    const playerRange = formatPlayerRange(card.players || []);
    const baseTags = Array.isArray(card.genre) ? card.genre : [];
    const customTags = card.customTags ? card.customTags.replace(/\//g, ',').replace(/、/g, ',').split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagsArray = [...baseTags, ...customTags];
    const tagString = tagsArray.length > 0 ? `#${tagsArray.join(' X ')}` : '';
    const fallback = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=800&auto=format&fit=crop';

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.imgWrap}>
                <img
                    src={card.image || fallback}
                    alt={card.name}
                    loading="lazy"
                    onError={e => { e.target.src = fallback; }}
                />
                <div className={styles.imgGrad} />
            </div>
            <div className={styles.body}>
                {tagString && (
                    <div className={styles.tags}>
                        <span className={styles.tag}>{tagString}</span>
                    </div>
                )}
                <h3 className={styles.title}>{card.name}</h3>
                <div className={styles.footer}>
                    <div className={styles.players}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f1a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {playerRange}
                    </div>
                    <div className={styles.price}>
                        {card.price
                            ? <>NT$ <span className={styles.priceAmt}>{card.price}</span> /人</>
                            : <span style={{ color: '#71717a' }}>價格未定</span>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
