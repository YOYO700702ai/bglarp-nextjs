import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

const PAGE_DESCRIPTION = 'BGLARP 承接 20–30 人團體活動與大型解謎活動企劃。從公司聚會、部門交流，到依人數、場地與活動目標規劃的解謎任務，一起討論適合團隊的玩法。';

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
    english: 'BREAK THE ICE',
    title: '從任務，打開話題。',
    text: '把第一次對話交給故事。透過共同任務與線索交流，創造彼此認識、自然互動的機會。',
  },
  {
    number: '02',
    english: 'WORK TOGETHER',
    title: '讓每個人，都能參與。',
    text: '將線索與任務分散在不同角色或小隊，邀請大家交換資訊、討論方法，一起找出下一步。',
  },
  {
    number: '03',
    english: 'SHARE A MOMENT',
    title: '一起完成，一起記得。',
    text: '圍繞共同的故事目標，將各自的發現拼在一起，留下團隊共同面對挑戰的活動回憶。',
  },
];

const STEPS = [
  { title: '提供需求', text: '告訴我們日期、人數、地點、活動目的與預算區間。' },
  { title: '討論方向', text: '依團隊組成與場地條件，討論遊戲形式、分組方式及活動節奏。' },
  { title: '確認方案', text: '確認活動內容、執行範圍、時間安排與報價。' },
  { title: '準備與執行', text: '依確認的方案準備故事、任務與流程，迎接團隊的共同挑戰。' },
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
              <p className={styles.eyebrow}>BGLARP · FOR TEAMS</p>
              <h1 id="team-building-title">企業團隊活動<span className={styles.titleDot}>・</span><br />大型解謎企劃</h1>
              <p className={styles.heroStatement}>讓同事成為隊友，<br />一起解開任務。</p>
              <p className={styles.heroDescription}>
                從 20–30 人的公司聚會，到大型解謎活動企劃。<br className={styles.desktopBreak} />
                讓團隊走進故事，在挑戰中交流、在任務中合作。
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#group-activities">20–30 人團體活動<Arrow /></a>
                <a className={styles.secondaryButton} href="#custom-projects">大型解謎企劃<Arrow /></a>
              </div>
              <p className={styles.heroFootnote}>公司聚會 / 部門交流 / 客製團隊活動</p>
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
                <div className={styles.imageStamp} aria-hidden="true"><span>A SHARED</span><span>ADVENTURE.</span></div>
              </div>
              <figcaption>活動情境示意</figcaption>
            </figure>
          </div>
          <div className={styles.heroBaseline} aria-hidden="true"><span>GOOD STORIES BRING PEOPLE TOGETHER.</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>

        <section className={styles.services} aria-labelledby="services-title">
          <div className={styles.container}>
            <header className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>01 / FIND YOUR EXPERIENCE</p><h2 id="services-title">一場活動，<br />從你們的需求開始。</h2></div>
              <p>安排一次團隊相聚，或打造一場專屬任務。<br />先選擇方向，再一起把想法變成活動。</p>
            </header>

            <article id="group-activities" className={styles.serviceRow} aria-labelledby="group-title">
              <figure className={styles.serviceFigure}>
                <div className={styles.serviceImageWrap}>
                  <Image src="/images/team-building/group-session-manhwa-v2.webp" alt="韓系漫畫小組比對角色劇本、線索卡與案件地圖的團體活動情境示意" fill sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 48vw, 560px" className={styles.serviceImage} />
                </div>
                <figcaption>活動情境示意</figcaption>
              </figure>
              <div className={styles.serviceCopy}>
                <p className={styles.serviceNumber}>EXPERIENCE 01</p>
                <span className={styles.serviceTag}>適合 20–30 人團體洽詢</span>
                <h3 id="group-title">團體相聚，<br />多一點故事與互動。</h3>
                <p>公司聚會、部門聯誼、團體出遊，讓聚在一起的時間有不一樣的玩法。從遊戲偏好出發，協助安排適合團隊的內容、分組與場次。</p>
                <div className={styles.serviceDetail}><span>團體活動</span><strong>20–30 <small>人</small></strong></div>
                <p className={styles.serviceNote}>實際遊戲內容、分組與場次，依人數及日期討論安排。</p>
                <a href="#inquiry" className={styles.textLink}>洽詢團體活動<Arrow /></a>
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
                <p className={styles.serviceNumber}>EXPERIENCE 02</p>
                <span className={styles.serviceTag}>依需求討論客製企劃</span>
                <h3 id="custom-title">以故事串起任務，<br />讓團隊一起走進挑戰。</h3>
                <p>承接大型解謎活動企劃，以探索、討論與線索交流串連不同小隊。依參與人數、場地條件與活動目標，討論合適的解謎形式與整體流程。</p>
                <ul className={styles.projectScope} aria-label="企劃討論方向"><li>故事與任務設計</li><li>小隊合作機制</li><li>活動流程規劃</li></ul>
                <p className={styles.serviceNote}>企劃規模與執行方式依需求評估，歡迎提供預計人數與場地。</p>
                <a href="#inquiry" className={styles.textLink}>洽談大型企劃<Arrow /></a>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.approaches} aria-labelledby="approaches-title">
          <div className={styles.container}>
            <header className={styles.approachHeading}><p className={styles.eyebrow}>02 / THE WAY WE PLAY</p><h2 id="approaches-title">讓互動，<br className={styles.mobileBreak} />自然發生在遊戲裡。</h2><p>從破冰到共同挑戰，依活動目標討論適合的設計。</p></header>
            <div className={styles.approachGrid}>
              {APPROACHES.map(item => <article key={item.number} className={styles.approachItem}><div className={styles.approachTop}><span className={styles.approachNumber}>{item.number}</span><span>{item.english}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}
            </div>
            <p className={styles.approachNote}>以上為可洽談的設計方向，具體內容依確認的方案安排。</p>
          </div>
        </section>

        <section className={styles.expertise} aria-labelledby="expertise-title">
          <div className={`${styles.container} ${styles.expertiseInner}`}>
            <div className={styles.expertiseIntro}><p className={styles.eyebrow}>03 / BEHIND THE EXPERIENCE</p><h2 id="expertise-title">把故事、解謎<br />與團隊互動，<br /><span>放進同一場活動。</span></h2></div>
            <div className={styles.expertiseCopy}><p>以劇本帶領、密室解謎設計與遊戲化教學的專長為基礎，從故事情境、任務安排到參與方式，思考如何讓團隊投入其中。</p><p>一個值得討論的線索，一段需要交換資訊的任務，一個共同前進的理由。讓活動的每一步，都與你們想要的互動相連。</p><ul className={styles.expertiseList} aria-label="活動設計專長"><li><span>STORY</span>劇本與情境帶領</li><li><span>PUZZLE</span>密室與解謎設計</li><li><span>LEARNING</span>遊戲化教學</li></ul></div>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-title">
          <div className={styles.container}>
            <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>04 / LET’S MAKE IT HAPPEN</p><h2 id="process-title">從一個想法，<br />到一場團隊的冒險。</h2></div><p>先分享需求，<br />一起確認適合的活動內容與執行安排。</p></header>
            <ol className={styles.processGrid}>{STEPS.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
            <div className={styles.pricingNote}><span>關於費用</span><p>依活動日期、人數、地點、時間與客製內容評估報價，歡迎先提供需求，與我們討論合適的安排。</p></div>
          </div>
        </section>

        <section id="inquiry" className={styles.inquiry} aria-labelledby="inquiry-title">
          <div className={`${styles.container} ${styles.inquiryInner}`}>
            <div className={styles.inquiryCopy}><p className={styles.eyebrow}>YOUR NEXT TEAM STORY</p><h2 id="inquiry-title">下一場公司活動，<br />一起玩出新故事。</h2><p>告訴我們預計的人數與日期，<br />一起討論適合你們團隊的玩法。</p><div className={styles.contactActions}><a className={styles.primaryButton} href="https://m.me/bglarp.studio" target="_blank" rel="noopener noreferrer">私訊洽詢企業團隊活動<Arrow diagonal /></a><a className={styles.phoneLink} href="tel:0422250020">或致電（04）2225-0020<Arrow /></a></div></div>
            <aside className={styles.inquiryBrief} aria-label="洽詢前準備的資訊"><p className={styles.briefLabel}>A LITTLE ABOUT YOUR TEAM</p><h3>洽詢時，帶上這 5 個資訊。</h3><dl><div><dt>01 / 預計日期</dt><dd>日期與希望的活動時段</dd></div><div><dt>02 / 參與人數</dt><dd>預估人數與團隊組成</dd></div><div><dt>03 / 活動地點</dt><dd>預計城市、場地或待討論</dd></div><div><dt>04 / 活動目的</dt><dd>公司聚會、破冰交流或團隊合作</dd></div><div><dt>05 / 預算區間</dt><dd>預計的整體活動預算</dd></div></dl><p className={styles.briefNote}>還沒有完整想法也沒關係，先從已知的需求聊起。</p></aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
