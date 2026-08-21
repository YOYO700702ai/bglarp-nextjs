import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getAllScripts } from '@/lib/scripts';
import { getScriptExperience, getCharacterImage } from '@/lib/scriptExperiences';
import JsonLd from '@/components/JsonLd';
import { buildScriptJsonLd } from '@/lib/seo';
import styles from './page.module.css';

function routeKeyCandidates(rawName) {
  const candidates = [rawName];

  try {
    const decodedName = decodeURIComponent(rawName);
    if (!candidates.includes(decodedName)) candidates.push(decodedName);
  } catch {
    // A literal or malformed percent sign is still a valid legacy route key.
  }

  return candidates;
}

function findScriptByRoute(scripts, rawName) {
  const candidates = routeKeyCandidates(rawName);

  // Slugs are canonical. Only fall back to a legacy title after every slug
  // candidate has been checked, so a title can never shadow another slug.
  for (const publicKey of candidates) {
    const script = scripts.find(item => item.slug === publicKey);
    if (script) return { script, publicKey };
  }

  for (const publicKey of candidates) {
    const script = scripts.find(item => item.name === publicKey);
    if (script) return { script, publicKey };
  }

  return null;
}

export async function generateMetadata({ params }) {
  const { name: rawName } = await params;
  const scripts = await getAllScripts();
  const match = findScriptByRoute(scripts, rawName);
  if (!match) return { title: '劇本未找到 | BGLARP' };
  const { script } = match;
  const desc = script.synopsis?.replace(/\n/g, ' ').slice(0, 120) || `台中 BGLARP 實境推理館 - ${script.name}`;
  return {
    title: `${script.name} | BGLARP 實境推理館`,
    description: desc,
    alternates: {
      canonical: `/scripts/${encodeURIComponent(script.slug || script.name)}`,
    },
    openGraph: {
      title: `${script.name} | BGLARP 實境推理館`,
      description: desc,
      url: `/scripts/${encodeURIComponent(script.slug || script.name)}`,
      images: script.image ? [{ url: script.image }] : [],
    },
  };
}

export async function generateStaticParams() {
  const scripts = await getAllScripts();
  return scripts.map(s => ({ name: s.slug || s.name }));
}

export const dynamicParams = true;
export const revalidate = 86400; // ISR: re-fetch from Notion once a day

const fallback = 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?q=80&w=800&auto=format&fit=crop';

export default async function ScriptPage({ params }) {
  const { name: rawName } = await params;
  const scripts = await getAllScripts();
  const match = findScriptByRoute(scripts, rawName);
  if (!match) notFound();
  const { script: card, publicKey } = match;
  if (card.slug && publicKey !== card.slug) {
    permanentRedirect(`/scripts/${encodeURIComponent(card.slug)}`);
  }
  const experience = getScriptExperience(card.name);

  const dur = card.duration || '未標示';
  const price = card.priceStatus === 'free'
    ? '免費'
    : ((card.priceStatus === 'fixed' || (card.priceStatus == null && typeof card.price === 'number'))
      ? `NT$ ${card.price}/人`
      : '價格未定');
  const playersStr = (card.players || []).join(', ');
  const baseTags = Array.isArray(card.genre) ? card.genre : [];
  const customTextArr = card.customTags ? card.customTags.replace(/\//g, ',').replace(/、/g, ',').split(',').map(t => t.trim()).filter(Boolean) : [];
  const tags = Array.from(new Set([...baseTags, ...customTextArr]));
  const allTags = Array.from(new Set([...(card.players || []), ...tags]));
  const paragraphs = (card.synopsis || '（資料未建立）').split('\n').filter(p => p.trim());
  const charLines = (card.characters || '').split('\n').filter(l => l.trim());
  const scriptJsonLd = buildScriptJsonLd(card);

  return (
    <div className={styles.page}>
      <JsonLd id="bglarp-script-jsonld" data={scriptJsonLd} />
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
          {experience?.url && <div className={styles.posterQuizBadge}>{experience.label}</div>}
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

        {experience?.url && (
          <a
            href={experience.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quizEntry}
          >
            <span className={styles.quizEntryKicker}>SPECIAL</span>
            <span className={styles.quizEntryTitle}>{experience.label}</span>
            <span className={styles.quizEntryAction}>開始測驗</span>
          </a>
        )}

        {/* Synopsis */}
        <div className={styles.sectionTitle}>劇情指引</div>
        <div className={styles.synopsisWrap}>
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.synPara}>{p.trim()}</p>
          ))}
        </div>

        {experience?.video && (
          <section className={styles.videoSection} aria-labelledby="script-video-title">
            <div className={styles.sectionTitle} id="script-video-title">故事影片</div>
            <div className={styles.videoFrame}>
              <video
                className={styles.scriptVideo}
                controls
                playsInline
                preload="metadata"
                poster={experience.video.poster}
                aria-label={experience.video.title}
              >
                <source src={experience.video.src} type="video/mp4" />
                您的瀏覽器不支援影片播放。
              </video>
            </div>
            <p className={styles.videoCaption}>{experience.video.title}</p>
          </section>
        )}

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
                const charImg = getCharacterImage(card.name, charName);
                return (
                  <div key={idx} className={styles.charItem}>
                    <div className={styles.charAvatar} aria-label={charName}>
                      {charImg ? (
                        <img src={charImg} alt={charName} className={styles.charPortrait} />
                      ) : (
                        <div className={styles.charSilhouette} />
                      )}
                    </div>
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
