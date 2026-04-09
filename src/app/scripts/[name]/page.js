import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllScripts } from '@/lib/scripts';
import styles from './page.module.css';

export async function generateMetadata({ params }) {
  const name = decodeURIComponent(params.name);
  const scripts = await getAllScripts();
  const script = scripts.find(s => s.name === name);
  if (!script) return { title: '劇本未找到 | BGLARP' };
  const desc = script.synopsis?.replace(/\n/g, ' ').slice(0, 120) || `台中 BGLARP 實境推理館 - ${script.name}`;
  return {
    title: `${script.name} | BGLARP 實境推理館`,
    description: desc,
    openGraph: {
      title: `${script.name} | BGLARP 實境推理館`,
      description: desc,
      images: script.image ? [{ url: script.image }] : [],
    },
  };
}

export async function generateStaticParams() {
  const scripts = await getAllScripts();
  return scripts.map(s => ({ name: encodeURIComponent(s.name) }));
}

const silhouette = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231a1a2e' rx='50'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2327272a'/%3E%3Cellipse cx='50' cy='82' rx='26' ry='18' fill='%2327272a'/%3E%3C/svg%3E";
const fallback = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=800&auto=format&fit=crop';

export default async function ScriptPage({ params }) {
  const name = decodeURIComponent(params.name);
  const scripts = await getAllScripts();
  const card = scripts.find(s => s.name === name);
  if (!card) notFound();

  const dur = card.duration || '未標示';
  const price = card.price ? `NT$ ${card.price}/人` : '價格未定';
  const playersStr = (card.players || []).join(', ');
  const baseTags = Array.isArray(card.genre) ? card.genre : [];
  const customTextArr = card.customTags ? card.customTags.replace(/\//g, ',').replace(/、/g, ',').split(',').map(t => t.trim()).filter(Boolean) : [];
  const tags = [...baseTags, ...customTextArr];
  const allTags = [...(card.players || []), ...tags];
  const paragraphs = (card.synopsis || '（資料未建立）').split('\n').filter(p => p.trim());
  const charLines = (card.characters || '').split('\n').filter(l => l.trim());

  return (
    <div className={styles.page}>
      <nav className={styles.backBar}>
        <Link href="/" className={styles.backLink}>
          ← 返回劇本列表
        </Link>
      </nav>

      <div className={styles.content}>
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
                return (
                  <div key={idx} className={styles.charItem}>
                    <img src={silhouette} alt={charName} className={styles.charAvatar} />
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
