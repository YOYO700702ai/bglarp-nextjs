import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';
import JsonLd from '@/components/JsonLd';
import ScriptCard from '@/components/ScriptCard';
import { getAllScripts } from '@/lib/scripts';
import { buildScriptDirectoryJsonLd } from '@/lib/seo';
import styles from './page.module.css';

export const metadata = {
  title: '台中劇本殺劇本目錄 | BGLARP 實境推理館',
  description: '瀏覽 BGLARP 實境推理館的上映劇本，查看人數、類型、時長、價格與劇情簡介，挑選適合這次聚會的故事。',
  alternates: { canonical: '/scripts' },
  openGraph: {
    title: '台中劇本殺劇本目錄 | BGLARP 實境推理館',
    description: '按人數、類型、時長與價格瀏覽 BGLARP 上映劇本。',
    url: '/scripts',
    type: 'website',
  },
};

export const revalidate = 600;

export default async function ScriptsDirectoryPage() {
  const scripts = await getAllScripts();
  const jsonLd = buildScriptDirectoryJsonLd(scripts);

  return (
    <>
      <Navbar />
      <JsonLd id="bglarp-script-directory-jsonld" data={jsonLd} />

      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <nav aria-label="麵包屑" className={styles.breadcrumb}>
              <Link href="/">BGLARP 首頁</Link>
              <span aria-hidden="true">/</span>
              <span>上映劇本</span>
            </nav>
            <span className={styles.kicker}>SCRIPT DIRECTORY</span>
            <h1>台中劇本殺劇本目錄</h1>
            <p>
              先確認同行人數，再從推理還原、情感沉浸、歡樂互動或陣營對抗中選擇。
              每張劇本卡可進入詳細頁，查看遊玩人數、預估時長、價格與劇情簡介。
            </p>
            <div className={styles.heroActions}>
              <Link href="/guide">我是第一次玩</Link>
              <Link href="/taichung/booking">查看預約方式</Link>
            </div>
          </div>
        </header>

        <section className={styles.directory} aria-labelledby="directory-title">
          <div className={styles.directoryHeader}>
            <div>
              <span>BGLARP COLLECTION</span>
              <h2 id="directory-title">上映劇本</h2>
            </div>
            <p>目前共 {scripts.length} 個劇本可查看；實際可預約場次請以店家回覆為準。</p>
          </div>

          {scripts.length > 0 ? (
            <div className={styles.grid}>
              {scripts.map(card => (
                <ScriptCard key={card.scriptId || card.slug || card.name} card={card} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>目前無法讀取劇本目錄，請稍後再試或直接私訊我們。</div>
          )}
        </section>
      </main>

      <Footer />
      <FloatingBookBtn />
    </>
  );
}
