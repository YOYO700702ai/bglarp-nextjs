'use client';

import { useMemo, useRef, useState } from 'react';
import ResultCardGenerator from '@/components/ResultCardGenerator';
import styles from './quiz.module.css';

const SCRIPT_TITLE = '求己';
const QUESTION_COUNT = 5;

const characters = {
  '趙明合': {
    name: '趙明合',
    group: 'female',
    image: '/qiuji-quiz/cards/zhao-minghe-painted-card.jpg',
    description: '權衡利弊，擁有帝王之姿。在危機面前，你總能冷靜地做出對大局最有利的決斷。',
    cardQuote: '在危機面前，你總能冷靜地做出對大局最有利的決斷。',
  },
  '即墨永康': {
    name: '即墨永康',
    group: 'male',
    image: '/qiuji-quiz/cards/jimo-yongkang-painted-card.jpg',
    description: '勇武堅毅，北凜的守護者。即使身陷絕境，你也絕不輕言放棄，願為守護之人戰鬥到底。',
    cardQuote: '即使身陷絕境，你也願為守護之人戰鬥到底。',
  },
  '溫若儀': {
    name: '溫若儀',
    group: 'female',
    image: '/qiuji-quiz/cards/wen-ruoyi-painted-card.jpg',
    description: '聰慧且甘於奉獻。你心思細膩，往往能在暗處察覺危機，甚至願意為了重要的人犧牲自己。',
    cardQuote: '你心思細膩，願意為了重要的人承受代價。',
  },
  '艾憐': {
    name: '艾憐',
    group: 'female',
    image: '/qiuji-quiz/cards/ai-lian-painted-card.jpg',
    description: '忠誠果敢，使命必達。你重情重義，一旦接下任務或承諾，便會不計代價地去完成。',
    cardQuote: '你重情重義，一旦承諾便會不計代價地完成。',
  },
  '沈千': {
    name: '沈千',
    group: 'male',
    image: '/qiuji-quiz/cards/shen-qian-painted-card.jpg',
    description: '深謀遠慮，智計百出。你習慣隱藏自己的真實想法，用策略與智慧來掌控全局。',
    cardQuote: '你習慣隱藏真實想法，用策略與智慧掌控全局。',
  },
  '雲依': {
    name: '雲依',
    group: 'female',
    image: '/qiuji-quiz/cards/yun-yi-painted-card.jpg',
    description: '溫婉柔韌，心懷悲憫。在亂世中，你始終保持著內心的純淨，希望能為身邊的人帶來溫暖。',
    cardQuote: '在亂世中，你仍想為身邊的人帶來溫暖。',
  },
};

const groups = {
  male: {
    label: '陽之軌',
    note: '男子組',
    names: ['即墨永康', '沈千'],
  },
  female: {
    label: '陰之軌',
    note: '女子組',
    names: ['趙明合', '溫若儀', '艾憐', '雲依'],
  },
};

const maleQuestions = [
  {
    question: '下列哪段文字更能引發您的共鳴呢？',
    options: [
      {
        text: '荊棘花從不挑剔生長的地方，即便處境再艱難，也阻擋不了荊棘開花的決心。',
        character: '即墨永康',
      },
      {
        text: '人活一世，要想安穩度過，就該心狠手辣。畢竟，做好事總是要付出代價的。',
        character: '沈千',
      },
    ],
  },
  {
    question: '在對弈的過程，你會偏向哪種棋風？',
    options: [
      {
        text: '棋路精謹，思慮周詳，謹慎有餘但狠勁不足。過程曲折卻穩妥取勝。',
        character: '即墨永康',
      },
      {
        text: '心思千轉，殺伐果決，仗著幾分狠絕勢如破竹，即便是敗了也下得妙不可言。',
        character: '沈千',
      },
    ],
  },
  {
    question: '你想選擇什麼樣的另一半陪你共度餘生呢？',
    options: [
      {
        text: '天賜良緣既定，你我明面上恪守緣分，私下卻也在賭，看誰會先動真心。',
        character: '即墨永康',
      },
      {
        text: '明知她圖謀你手中權柄，也甘之若飴地縱容她僭越。至高至明日月，至親至疏夫妻。',
        character: '沈千',
      },
    ],
  },
  {
    question: '你在人群中更偏向於哪種角色？',
    options: [
      {
        text: '表面肆意張揚，實則身不由己，在規則與自由間掙扎的「局中人」。',
        character: '即墨永康',
      },
      {
        text: '隱藏鋒芒的野心家，看似隨波逐流，實則暗中佈局，掌控全局。',
        character: '沈千',
      },
    ],
  },
  {
    question: '若你的復仇之路陷入關鍵瓶頸，唯有犧牲無辜者才能掃清障礙，你會怎麼做？',
    options: [
      {
        text: '極力尋找其他方案，若實在別無選擇，也會在愧疚中堅守底線，絕不主動犧牲無辜。',
        character: '即墨永康',
      },
      {
        text: '果斷犧牲，復仇是畢生執念，為達目的不必糾結旁人生死，必要的代價必須承受。',
        character: '沈千',
      },
    ],
  },
];

const femaleQuestions = [
  {
    question: '下列哪段文字更能引發您的共鳴呢？',
    options: [
      {
        text: '誰規定天意的血緣之線，非要作弄人間的姻緣紅線？',
        character: '溫若儀',
      },
      {
        text: '毫無保留地認清了江湖兒女的心。好友嘛，不就應該有福同享有禍同當嗎？',
        character: '雲依',
      },
      {
        text: '不計代價接你回家。在大家的祝福和期待中的你，又怎會有不幸福的可能呢？',
        character: '艾憐',
      },
      {
        text: '倘若真的想得到，你借旁人之力，讓能拿得起的人，幫你拿起。過程如何並不重要，只要結果合你心意，一切都值得。',
        character: '趙明合',
      },
    ],
  },
  {
    question: '請選擇你的初始環境：',
    options: [
      {
        text: '傳聞中的江浙滬獨生女！坐擁數不盡的財富與滿溢的寵愛。',
        character: '艾憐',
      },
      {
        text: '懦弱的爹，敏感內耗的你，卻偏偏能擁有那份無需刻意迎合討好的愛。',
        character: '溫若儀',
      },
      {
        text: '四方紅牆裡，權力泥沼？沒關係，我阿兄會為我闢出一條坦途。',
        character: '雲依',
      },
      {
        text: '父母早逝，權力才是我最好的補品！',
        character: '趙明合',
      },
    ],
  },
  {
    question: '請選擇你想要愛上的愛情是：',
    options: [
      {
        text: '世俗定義裡愛上你是比殺人放火更重的罪，向來恪守規矩的我，最終還是甘願一試。',
        character: '溫若儀',
      },
      {
        text: '天賜良緣既定，你我明面上咬牙切齒地恪守著這份緣分，私下卻也在賭，看誰會先對對方動了真心。',
        character: '艾憐',
      },
      {
        text: '明知對方圖謀你手中權柄，也甘之若飴地縱容你僭越。至高至明日月，至親至疏夫妻。',
        character: '雲依',
      },
      {
        text: '誰要共赴恨海情天，我只要我的事業扶搖而上。',
        character: '趙明合',
      },
    ],
  },
  {
    question: '在人際關係中，你更傾向於哪種相處模式？',
    options: [
      {
        text: '真心對待身邊人，用溫柔和包容傳遞善意，願意為親友付出。',
        character: '溫若儀',
      },
      {
        text: '喜歡掌控全局，極致結果導向，所有情感都要為目標讓步。',
        character: '趙明合',
      },
      {
        text: '對自己在乎的人（如家人、摯友等）極度珍視，若被背叛則會徹底反擊。',
        character: '雲依',
      },
      {
        text: '不做依附他人的菟絲花，憑自身能力立足於世，回饋曾經得到的寵愛。',
        character: '艾憐',
      },
    ],
  },
  {
    question: '當你面臨巨大的痛苦或背叛時，你會怎麼做？',
    options: [
      {
        text: '只有站在權力頂端，才能掌控一切，避免重蹈過往的遺憾。',
        character: '趙明合',
      },
      {
        text: '至親之死不可原諒，復仇是支撐活下去的唯一動力。',
        character: '雲依',
      },
      {
        text: '我不太能抗壓，我更希望能在大家的保護下安穩度過。',
        character: '艾憐',
      },
      {
        text: '如果有人在背後支撐我，我願意為了在乎的人勇敢反擊一次。',
        character: '溫若儀',
      },
    ],
  },
];

function getInitialScores() {
  return Object.fromEntries(Object.keys(characters).map((name) => [name, 0]));
}

function getGroupQuestions(group) {
  return group === 'male' ? maleQuestions : femaleQuestions;
}

function getWinner(group, scores) {
  return groups[group].names.reduce((winner, name) => (
    scores[name] > scores[winner] ? name : winner
  ), groups[group].names[0]);
}

function PlayIcon({ paused }) {
  if (paused) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5v14l11-7z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-15.7-6" />
      <path d="M3 3v6h6" />
      <path d="M3 12a9 9 0 0 0 15.7 6" />
      <path d="M21 21v-6h-6" />
    </svg>
  );
}

export default function QiujiQuizPage() {
  const [phase, setPhase] = useState('intro');
  const [playerName, setPlayerName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState(getInitialScores);
  const [resultName, setResultName] = useState(null);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);

  const activeQuestions = selectedGroup ? getGroupQuestions(selectedGroup) : [];
  const activeQuestion = activeQuestions[questionIndex];
  const result = resultName ? characters[resultName] : null;
  const progress = selectedGroup && phase === 'question'
    ? Math.round(((questionIndex + 1) / QUESTION_COUNT) * 100)
    : phase === 'result'
      ? 100
      : 0;

  const ranking = useMemo(() => {
    if (!selectedGroup) return [];
    return groups[selectedGroup].names
      .map((name, index) => ({ ...characters[name], score: scores[name], order: index }))
      .sort((a, b) => b.score - a.score || a.order - b.order);
  }, [scores, selectedGroup]);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }

    try {
      audio.volume = 0.42;
      await audio.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  };

  const startQuiz = async (event) => {
    event.preventDefault();
    if (!playerName.trim()) return;

    const audio = audioRef.current;
    if (audio && !musicOn) {
      audio.volume = 0.42;
      audio.play()
        .then(() => setMusicOn(true))
        .catch(() => setMusicOn(false));
    }

    setPhase('gender');
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setQuestionIndex(0);
    setScores(getInitialScores());
    setPhase('question');
  };

  const selectAnswer = (character) => {
    const nextScores = { ...scores, [character]: scores[character] + 1 };
    setScores(nextScores);

    if (questionIndex >= QUESTION_COUNT - 1) {
      setResultName(getWinner(selectedGroup, nextScores));
      setPhase('result');
      return;
    }

    setQuestionIndex((current) => current + 1);
  };

  const restart = () => {
    setPhase('intro');
    setPlayerName('');
    setSelectedGroup(null);
    setQuestionIndex(0);
    setScores(getInitialScores());
    setResultName(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={styles.page}>
      <audio
        ref={audioRef}
        src="/qiuji-quiz/qiuji.mp3"
        loop
        preload="auto"
        onPlay={() => setMusicOn(true)}
        onPause={() => setMusicOn(false)}
      />

      <div className={styles.aura} />
      <button
        type="button"
        className={styles.musicButton}
        onClick={toggleMusic}
        aria-label={musicOn ? '暫停琴音' : '播放琴音'}
        title={musicOn ? '暫停琴音' : '播放琴音'}
      >
        <PlayIcon paused={!musicOn} />
        <span>{musicOn ? '琴音' : '無音'}</span>
      </button>

      <section className={styles.shell}>
        <i className={`${styles.corner} ${styles.topLeft}`} />
        <i className={`${styles.corner} ${styles.topRight}`} />
        <i className={`${styles.corner} ${styles.bottomLeft}`} />
        <i className={`${styles.corner} ${styles.bottomRight}`} />

        {phase === 'intro' && (
          <form className={styles.intro} onSubmit={startQuiz}>
            <h1>求己</h1>
            <p className={styles.subtitle}>
              <span />
              靈魂共鳴測驗
              <span />
            </p>
            <label className={styles.nameField}>
              <span>賜名入卷</span>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={14}
                autoComplete="name"
              />
            </label>
            <button type="submit" className={styles.primaryButton} disabled={!playerName.trim()}>
              <span>執筆入局</span>
              <ArrowIcon />
            </button>
          </form>
        )}

        {phase === 'gender' && (
          <section className={styles.genderPanel}>
            <h2>請選擇你的命軌</h2>
            <div className={styles.genderGrid}>
              {Object.entries(groups).map(([id, group]) => (
                <button
                  key={id}
                  type="button"
                  className={styles.genderButton}
                  onClick={() => selectGroup(id)}
                >
                  <span>{group.label}</span>
                  <small>{group.note}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {phase === 'question' && activeQuestion && (
          <section className={styles.questionPanel}>
            <div className={styles.questionTop}>
              <span>第 {questionIndex + 1} 幕</span>
              <span>{questionIndex + 1} / {QUESTION_COUNT}</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <h2>{activeQuestion.question}</h2>
            <div className={styles.options}>
              {activeQuestion.options.map((option, index) => (
                <button
                  key={option.text}
                  type="button"
                  className={styles.option}
                  onClick={() => selectAnswer(option.character)}
                >
                  <span>{['I', 'II', 'III', 'IV'][index]}</span>
                  <strong>{option.text}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        {phase === 'result' && result && selectedGroup && (
          <section className={styles.resultPanel}>
            <p className={styles.resultKicker}>
              <span />
              天命歸屬
              <span />
            </p>
            <div className={styles.posterFrame}>
              <div className={styles.posterInner}>
                <img src={result.image} alt={result.name} />
                <div className={styles.posterShade} />
              </div>
            </div>
            <h2>{result.name}</h2>
            <p className={styles.resultDescription}>{result.description}</p>

            <div className={styles.scoreMap}>
              <h3>共鳴圖譜</h3>
              {ranking.map((character) => {
                const percent = Math.round((character.score / QUESTION_COUNT) * 100);
                return (
                  <div key={character.name} className={styles.scoreRow}>
                    <div className={styles.scoreLabel}>
                      <span>{character.name}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className={styles.scoreTrack}>
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.resultActions}>
              <ResultCardGenerator
                scriptTitle={SCRIPT_TITLE}
                characterName={result.name}
                characterImage={result.image}
                quote={result.cardQuote}
                playerName={playerName}
                theme="qiuji"
                accent="#c5a059"
                secondary="#ead18b"
                imageFit="contain"
              />
              <button type="button" className={styles.restartButton} onClick={restart}>
                <RestartIcon />
                <span>重塑命運，再入輪迴</span>
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
