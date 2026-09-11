import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

const PAGE_DESCRIPTION = '平常一起上班，今天一起破案！BGLARP 提供 20–30 人團體活動與大型解謎企劃。想揪同事對戲、找線索或組隊闖關，先告訴我們日期、人數與預算，聊聊怎麼玩。';

export const metadata = {
  title: '企業團隊活動・大型解謎企劃 | BGLARP 實境推理館',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/team-building' },
  openGraph: {
    title: '企業團隊活動・大型解謎企劃 | BGLARP',
    description: PAGE_DESCRIPTION,
    url: '/team-building',
    siteName: 'BGLARP 實境推理館',
    locale: 'zh_TW',
    type: 'website',
    images: [{
      url: '/images/team-building/team-hero-manhwa-v2.webp',
      width: 1536,
      height: 1024,
      alt: '韓系漫畫中的角色劇本、線索與團隊解謎情境示意',
    }],
  },
};

const APPROACHES = [
  {
    number: '01',
    english: '先借張線索',
    title: '「你那張借我看！」',
    text: '還叫不出名字也沒關係，拿著線索湊過去，先問一句「你找到什麼？」，就有得聊了。',
  },
  {
    number: '02',
    english: '換你出主意',
    title: '「等一下，我有想法！」',
    text: '有人記得細節，有人想到怪招。把發現攤開來，卡住的地方換個人看看，說不定就通了。',
  },
  {
    number: '03',
    english: '答案接起來了',
    title: '「原來是這樣啦！」',
    text: '東拼一塊、西湊一張，終於接起來了！那個答案突然冒出來的瞬間，值得跟隊友擊個掌。',
  },
];

const STEPS = [
  { title: '先聊聊', text: '哪天、幾個人、在哪裡、想玩什麼、預算多少？知道多少就先說多少。' },
  { title: '挑個玩法', text: '想多一點對戲、找線索，還是小隊闖關？再來看看適合怎麼分組、安排時間。' },
  { title: '把細節說好', text: '內容、時間、場地配合事項與費用，都確認清楚後再定案。' },
  { title: '準備開玩！', text: '我們依約定準備活動，你把集合資訊傳給大家。當天就在約定的地方集合，準備開玩！' },
];

function Arrow({ diagonal = false }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal ? (
        <path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export default function TeamBuildingPage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="team-building-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>BGLARP · 隊友集合啦</p>
              <h1 id="team-building-title">企業團隊活動<span className={styles.titleDot}>・</span><br />大型解謎企劃</h1>
              <p className={styles.heroStatement}>平常一起上班，<br />今天一起破案！</p>
              <p className={styles.heroDescription}>
                揪 20–30 人來玩，或找我們規劃大型解謎活動。<br className={styles.desktopBreak} />
                那位平常話不多的同事，搞不好是隱藏版神探喔。
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#group-activities">我們有 20–30 人<Arrow /></a>
                <a className={styles.secondaryButton} href="#custom-projects">想辦大型解謎活動<Arrow /></a>
              </div>
              <p className={styles.heroFootnote}>公司聚會 / 部門聯誼 / 大型解謎</p>
            </div>
            <figure className={styles.heroVisual}>
              <div className={styles.heroImageWrap}>
                <Image
                  src="/images/team-building/team-hero-manhwa-v2.webp"
                  alt="韓系漫畫人物閱讀角色劇本、交換祕密線索，一起推理解謎的情境示意"
                  fill
                  priority
                  sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 58vw"
                  className={styles.heroImage}
                />
                <div className={styles.imageStamp} aria-hidden="true"><span>等等，</span><span>這張有線索！</span></div>
              </div>
              <figcaption>活動情境示意</figcaption>
            </figure>
          </div>
          <div className={styles.heroBaseline} aria-hidden="true"><span>本日任務：找齊隊友，集合開玩！</span><span>往下挑玩法 ↓</span></div>
        </section>

        <section className={styles.services} aria-labelledby="services-title">
          <div className={styles.container}>
            <header className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>01 / 今天想怎麼玩</p><h2 id="services-title">這次公司活動，<br />想玩哪一種？</h2></div>
              <p>小團體想揪一場，或想辦大一點的解謎活動，<br />都可以找我們聊聊。</p>
            </header>

            <article id="group-activities" className={styles.serviceRow} aria-labelledby="group-title">
              <figure className={styles.serviceFigure}>
                <div className={styles.serviceImageWrap}>
                  <Image src="/images/team-building/group-session-manhwa-v2.webp" alt="韓系漫畫小組比對角色劇本、線索卡與案件地圖的團體活動情境示意" fill sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 48vw, 560px" className={styles.serviceImage} />
                </div>
                <figcaption>活動情境示意</figcaption>
              </figure>
              <div className={styles.serviceCopy}>
                <p className={styles.serviceNumber}>玩法 01 / 揪團來玩</p>
                <span className={styles.serviceTag}>20–30 人，揪團來玩</span>
                <h3 id="group-title">欸，你怎麼<br />這麼會演！</h3>
                <p>拿到角色劇本，今天就換個身分說話吧。你忙著找線索，旁邊的人可能正在努力藏祕密……公司聚會、部門聯誼，或一群朋友想揪團，都歡迎來玩！</p>
                <div className={styles.serviceDetail}><span>這次揪幾位？</span><strong>20–30 <small>人</small></strong></div>
                <p className={styles.serviceNote}>告訴我們日期和人數，我們會一起確認適合的劇本、分組與場次。</p>
                <a href="#inquiry" className={styles.textLink}>幫我們排一場<Arrow /></a>
              </div>
            </article>

            <article id="custom-projects" className={`${styles.serviceRow} ${styles.reverseRow}`} aria-labelledby="custom-title">
              <figure className={styles.serviceFigure}>
                <div className={styles.serviceImageWrap}>
                  <Image src="/images/team-building/puzzle-planning-manhwa-v2.webp" alt="韓系漫畫中不同小隊透過場地任務地圖、線索與密碼機關合作解謎的情境示意" fill sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 48vw, 560px" className={styles.serviceImage} />
                </div>
                <figcaption>活動情境示意</figcaption>
              </figure>
              <div className={styles.serviceCopy}>
                <p className={styles.serviceNumber}>玩法 02 / 大型解謎</p>
                <span className={styles.serviceTag}>大型活動，另外規劃</span>
                <h3 id="custom-title">人多？<br />那就組隊找線索！</h3>
                <p>這一隊找到密碼，那一隊拿到地圖——等等，湊在一起好像有答案！想把公司活動辦成一場解謎任務，我們可以依人數、場地和想玩的內容，規劃故事、關卡與小隊合作的玩法。</p>
                <ul className={styles.projectScope} aria-label="企劃討論方向"><li>故事與角色</li><li>分組與線索</li><li>關卡與流程</li></ul>
                <p className={styles.serviceNote}>先告訴我們大約幾人、在哪裡玩，活動規模、場地需求與費用再一起確認。</p>
                <a href="#inquiry" className={styles.textLink}>聊聊大型活動怎麼玩<Arrow /></a>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.approaches} aria-labelledby="approaches-title">
          <div className={styles.container}>
            <header className={styles.approachHeading}><p className={styles.eyebrow}>02 / 遊戲裡的小劇場</p><h2 id="approaches-title">你們可能<br className={styles.mobileBreak} />會聊到……</h2><p>借張線索、問個問題，從遊戲聊起就好。</p></header>
            <div className={styles.approachGrid}>
              {APPROACHES.map(item => <article key={item.number} className={styles.approachItem}><div className={styles.approachTop}><span className={styles.approachNumber}>{item.number}</span><span>{item.english}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}
            </div>
            <p className={styles.approachNote}>每場玩法依選定的劇本或活動方案安排。</p>
          </div>
        </section>

        <section className={styles.expertise} aria-labelledby="expertise-title">
          <div className={`${styles.container} ${styles.expertiseInner}`}>
            <div className={styles.expertiseIntro}><p className={styles.eyebrow}>03 / 這群人平常在忙什麼</p><h2 id="expertise-title">劇本、機關、帶場，<br />這些交給我們。<br /><span>你先負責揪人！</span></h2></div>
            <div className={styles.expertiseCopy}><p>我們平常做劇本殺、設計密室，也做遊戲化教學。角色怎麼帶、謎題怎麼出、規則怎麼說，都是我們會花心思準備的事。</p><p>你可以直接說：「大家第一次玩，想輕鬆一點。」或是「這群人很愛動腦，給他們一點挑戰！」我們再來討論適合的內容。</p><ul className={styles.expertiseList} aria-label="活動設計專長"><li><span>會帶戲</span>劇本與角色帶領</li><li><span>會出題</span>密室與解謎設計</li><li><span>懂教學</span>遊戲化教學</li></ul></div>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <div className={styles.container}>
            <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>04 / 揪團小隊長看這裡</p><h2 id="process-title">負責揪團的你，<br />先跟我們聊聊。</h2></div><p>第一次安排也沒關係，<br />先把手上的資訊告訴我們。</p></header>
            <ol className={styles.processGrid}>{STEPS.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
            <div className={styles.pricingNote}><span>費用怎麼算？</span><p>人數、日期、場地、活動時間和客製內容都會影響費用。先告訴我們大概的預算，我們再提供適合的安排與報價。</p></div>
          </div>
        </section>

        <section id="inquiry" className={styles.inquiry} aria-labelledby="inquiry-title">
          <div className={`${styles.container} ${styles.inquiryInner}`}>
            <div className={styles.inquiryCopy}><p className={styles.eyebrow}>好，準備揪人</p><h2 id="inquiry-title">這次公司活動，<br />揪大家來玩吧！</h2><p>不用先寫一份完美企劃。<br />傳個訊息，告訴我們「大概幾個人、哪天想玩」就好。</p><div className={styles.contactActions}><a className={styles.primaryButton} href="https://m.me/bglarp.studio" target="_blank" rel="noopener noreferrer">私訊聊聊活動<Arrow diagonal /></a><a className={styles.phoneLink} href="tel:0422250020">也可以打給我們（04）2225-0020<Arrow /></a></div></div>
            <aside className={styles.inquiryBrief} aria-label="洽詢前準備的資訊"><p className={styles.briefLabel}>先準備這幾樣就好</p><h3>有這些資訊，更好安排！</h3><dl><div><dt>01 / 哪天想玩</dt><dd>預計日期與時段</dd></div><div><dt>02 / 這次幾位</dt><dd>大概幾位、同事還是朋友</dd></div><div><dt>03 / 在哪裡玩</dt><dd>城市、場地，還沒決定也可以</dd></div><div><dt>04 / 想怎麼玩</dt><dd>輕鬆聚聚、認識彼此，或多動點腦</dd></div><div><dt>05 / 大概預算</dt><dd>整場活動大約的預算</dd></div></dl><p className={styles.briefNote}>還有幾項沒決定？沒關係，先聊聊也可以。</p></aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
