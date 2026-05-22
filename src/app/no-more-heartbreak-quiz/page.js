'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ResultCardGenerator from '@/components/ResultCardGenerator';
import styles from './quiz.module.css';

const SCRIPT_TITLE = '沒頭腦東西不傷心';

const characters = [
  {
    id: 'cooler',
    name: '倒霉蛋',
    en: 'The Cooler',
    image: '/no-more-heartbreak-quiz/characters/cooler.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/cooler-card.jpg',
    epithet: '命中註定的衰神磁鐵',
    traits: ['看開', '樂觀', '心很大'],
    description:
      '倒霉的事好像都會找上你，但你比誰都還能笑著接住。你不是不在乎，只是知道抱怨沒用，還不如把每一次摔倒當成段子說給朋友聽。',
    whisper: '如果不倒霉的話，我的人生還挺幸運的呢。',
  },
  {
    id: 'smart',
    name: '大聰明',
    en: 'Smart cookie',
    image: '/no-more-heartbreak-quiz/characters/smart.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/smart-card.jpg',
    epithet: '過度思考的生活分析師',
    traits: ['想太多', '自嘲', '邏輯派'],
    description:
      '你的腦袋總是停不下來，連別人隨口一句話都會被你拆成三種解讀。聰明是事實，但有時候你也希望自己可以笨一點。',
    whisper: '我的小腦袋瓜，怎麼可能有想不通的事情。',
  },
  {
    id: 'crybaby',
    name: '愛哭鬼',
    en: 'Cry-baby',
    image: '/no-more-heartbreak-quiz/characters/crybaby.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/crybaby-card.jpg',
    epithet: '情感濃度爆表的高敏感者',
    traits: ['易感', '真誠', '重視關係'],
    description:
      '哭不是脆弱，是你跟世界對話的方式。你很在意身邊的人，也很容易被一首歌、一個眼神打中。會哭的孩子，記得才會被別人接住。',
    whisper: '想哭的時候，就用摺紙代替眼淚吧。',
  },
  {
    id: 'sleepy',
    name: '瞌睡蟲',
    en: 'Sleepyhead',
    image: '/no-more-heartbreak-quiz/characters/sleepy.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/sleepy-card.jpg',
    epithet: '永遠在尋找下一張床的夢遊者',
    traits: ['慢活', '不急', '隨遇而安'],
    description:
      '你的人生時速可能比別人慢一倍，但你看得到他們錯過的雲、聽得到他們忽略的雨聲。睡眠是你跟世界保持距離的方式。',
    whisper: '一覺睡到冬天，就可以看見摺川的雪吧。',
  },
  {
    id: 'clingy',
    name: '粘人精',
    en: 'Clingy guy',
    image: '/no-more-heartbreak-quiz/characters/clingy.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/clingy-card.jpg',
    epithet: '情感雷達永遠開機的依附型玩家',
    traits: ['熱情', '念舊', '想被需要'],
    description:
      '你最大的快樂來自於「有人在乎你」。你的訊息密度很高，因為你想記住每一次心動。被討厭是你最害怕的事，但其實大家也都偷偷喜歡這樣的你。',
    whisper: '迅速被人討厭的小技巧，就是成為無法擺脫的糾纏。',
  },
  {
    id: 'laugh',
    name: '開心果',
    en: 'A Laugh',
    image: '/no-more-heartbreak-quiz/characters/laugh.jpg',
    cardImage: '/no-more-heartbreak-quiz/cards/laugh-card.jpg',
    epithet: '把氣氛擺第一的派對暖場王',
    traits: ['開朗', '幽默', '利他'],
    description:
      '你天生擁有「讓別人笑」的開關，看到場面冷下來就會自動接話。你的開心不是裝的，但你也偷偷把自己的低潮藏在笑容後面。',
    whisper: '笑一笑，沒什麼大不了。',
  },
];

const questions = [
  {
    title: '一、下雨的午後',
    prompt: '一個下著雨的星期天午後，你最可能在做什麼？',
    options: [
      { text: '把鬧鐘關掉，繼續鑽進棉被裡。', weights: { sleepy: 10 } },
      { text: '找朋友聊天，群組裡的訊息已經 99+。', weights: { clingy: 10 } },
      { text: '翻出一部老喜劇，笑著度過。', weights: { laugh: 10 } },
      { text: '寫下這個午後的所有思緒。', weights: { smart: 10 } },
      { text: '聽一首會讓自己哭出來的歌。', weights: { crybaby: 10 } },
      { text: '出門結果忘了帶傘，被淋成落湯雞。', weights: { cooler: 10 } },
    ],
  },
  {
    title: '二、突如其來的取消',
    prompt: '朋友臨時取消了今晚的約，你的第一反應？',
    options: [
      { text: '「沒事啦，反正我也想躺著。」', weights: { sleepy: 10 } },
      { text: '「會不會是我做錯什麼？」', weights: { crybaby: 10 } },
      { text: '「太好了，我又有時間想新段子了。」', weights: { laugh: 10 } },
      { text: '先靜靜地推敲對方取消的真正原因。', weights: { smart: 10 } },
      { text: '馬上再揪別人，今晚一定要有人陪。', weights: { clingy: 10 } },
      { text: '「我就知道，我的運氣⋯⋯」', weights: { cooler: 10 } },
    ],
  },
  {
    title: '三、你的手機桌面',
    prompt: '比較可能像下面哪一種？',
    options: [
      { text: '整齊的圖示 + 滿滿的待辦清單。', weights: { smart: 10 } },
      { text: '貼圖、對話截圖，誰的訊息都捨不得刪。', weights: { clingy: 10 } },
      { text: '迷因、迷因，還是迷因。', weights: { laugh: 10 } },
      { text: '一句歌詞，或一張深夜的風景。', weights: { crybaby: 10 } },
      { text: '出廠時的預設桌布，沒換過。', weights: { sleepy: 10 } },
      { text: '螢幕上有一條摔過的痕跡。', weights: { cooler: 10 } },
    ],
  },
  {
    title: '四、不舒服的時候',
    prompt: '面對讓你不舒服的事情，你比較常怎麼做？',
    options: [
      { text: '找人陪我一下，我很怕一個人。', weights: { clingy: 10 } },
      { text: '回家，自己安靜地哭一場。', weights: { crybaby: 10 } },
      { text: '假裝沒事，笑著帶過。', weights: { laugh: 10 } },
      { text: '冷靜分析整件事的因果。', weights: { smart: 10 } },
      { text: '算了，可能是我命比較衰。', weights: { cooler: 10 } },
      { text: '睡一覺，醒來再說。', weights: { sleepy: 10 } },
    ],
  },
  {
    title: '五、出遊團裡的你',
    prompt: '一群朋友揪團出去玩，你扮演的角色比較像？',
    options: [
      { text: '提前一週做完所有行程表的人。', weights: { smart: 10 } },
      { text: '永遠最後一個到車站的人。', weights: { sleepy: 10 } },
      { text: '在群組裡瘋狂提案、瘋狂發訊息的人。', weights: { clingy: 10 } },
      { text: '到處拍照、負責讓大家笑出來的人。', weights: { laugh: 10 } },
      { text: '在路上摔了一跤、丟了一個東西的人。', weights: { cooler: 10 } },
      { text: '看到夕陽會默默哭出來的人。', weights: { crybaby: 10 } },
    ],
  },
  {
    title: '六、一筆意外之財',
    prompt: '突然多了一筆零用錢，你會先做什麼？',
    options: [
      { text: '請朋友吃一頓飯，把快樂分出去。', weights: { laugh: 10 } },
      { text: '換新枕頭、新床墊，犒賞自己的睡眠。', weights: { sleepy: 10 } },
      { text: '研究一下要怎麼分配與投資。', weights: { smart: 10 } },
      { text: '買禮物給最在乎的那個人。', weights: { clingy: 10 } },
      { text: '留著，給未來心情低落時用。', weights: { crybaby: 10 } },
      { text: '錢還沒花到，就先在路上掉了。', weights: { cooler: 10 } },
    ],
  },
  {
    title: '七、最受不了的事',
    prompt: '下列情境中，最讓你抓狂的是哪一個？',
    options: [
      { text: '已讀不回。', weights: { clingy: 10 } },
      { text: '場子冷掉了，沒有人笑。', weights: { laugh: 10 } },
      { text: '計畫被別人臨時打亂。', weights: { smart: 10 } },
      { text: '努力了好久，結果還是出意外。', weights: { cooler: 10 } },
      { text: '一早被叫起來開會。', weights: { sleepy: 10 } },
      { text: '被誤會了卻沒辦法解釋。', weights: { crybaby: 10 } },
    ],
  },
  {
    title: '八、人生 BGM',
    prompt: '如果你的人生有一個 BGM，會比較像？',
    options: [
      { text: '低音量的 lo-fi，催眠用。', weights: { sleepy: 10 } },
      { text: '能讓人靜下來的抒情歌。', weights: { crybaby: 10 } },
      { text: '自帶笑點的搞怪曲子。', weights: { laugh: 10 } },
      { text: '結構嚴謹的古典樂章。', weights: { smart: 10 } },
      { text: 'KTV 包廂裡的對唱情歌。', weights: { clingy: 10 } },
      { text: '一首走音的卡拉 OK 翻唱。', weights: { cooler: 10 } },
    ],
  },
];

function MusicNote({ muted }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18.2V5.4l10.2-2v12.2" />
      <circle cx="6.4" cy="18.2" r="2.7" />
      <circle cx="16.6" cy="15.6" r="2.7" />
      {muted && <path className={styles.slash} d="M3.3 3.3 20.8 20.8" />}
    </svg>
  );
}

function getInitialScores() {
  return Object.fromEntries(characters.map((c) => [c.id, 0]));
}

function formatScore(score) {
  return score > 0 ? `+${score}` : String(score);
}

export default function NoMoreHeartbreakQuizPage() {
  const [playerName, setPlayerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }
    try {
      audio.volume = 0.45;
      await audio.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  };

  const ranking = useMemo(() => {
    const scores = getInitialScores();
    answers.forEach((answerIndex, questionIndex) => {
      if (answerIndex == null) return;
      const option = questions[questionIndex].options[answerIndex];
      Object.entries(option.weights).forEach(([id, value]) => {
        scores[id] += value;
      });
    });
    return characters
      .map((c) => ({ ...c, score: scores[c.id] }))
      .sort((a, b) => b.score - a.score);
  }, [answers]);

  const winner = ranking[0];
  const maxScore = Math.max(1, ...ranking.map((item) => item.score));
  const minScore = Math.min(0, ...ranking.map((item) => item.score));
  const scoreRange = Math.max(1, maxScore - minScore);
  const progress = !nameConfirmed
    ? 0
    : showResult
      ? 100
      : Math.round(((step + 1) / questions.length) * 100);

  const confirmPlayerName = (event) => {
    event.preventDefault();
    if (!playerName.trim()) return;
    setNameConfirmed(true);
  };

  const chooseAnswer = (optionIndex) => {
    const nextAnswers = answers.slice();
    nextAnswers[step] = optionIndex;
    setAnswers(nextAnswers);
    window.setTimeout(() => {
      if (step >= questions.length - 1) {
        setShowResult(true);
        return;
      }
      setStep((value) => value + 1);
    }, 180);
  };

  const goBack = () => {
    if (showResult) {
      setShowResult(false);
      return;
    }
    if (step > 0) {
      setStep((value) => value - 1);
      return;
    }
    setNameConfirmed(false);
  };

  const restart = () => {
    setPlayerName('');
    setNameConfirmed(false);
    setAnswers(Array(questions.length).fill(null));
    setStep(0);
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentQuestion = questions[step];
  const selectedAnswer = answers[step];

  return (
    <main className={styles.page}>
      <audio ref={audioRef} src="/no-more-heartbreak-quiz/music.mp3" loop preload="auto" />

      <button
        type="button"
        className={styles.musicButton}
        onClick={toggleMusic}
        aria-label={musicOn ? '關閉背景音樂' : '開啟背景音樂'}
        title={musicOn ? '關閉背景音樂' : '開啟背景音樂'}
      >
        <MusicNote muted={!musicOn} />
      </button>

      <div className={styles.texture} aria-hidden="true" />

      <section className={styles.shell}>
        <header className={styles.hero}>
          <Link className={styles.homeLink} href="/">BGLARP</Link>
          <p className={styles.kicker}>NO MORE HEARTBREAK</p>
          <h1>沒頭腦東西不傷心</h1>
          <p className={styles.lead}>
            這個夜晚，有人在哭，有人在笑，有人睡著了；
            選一段你最像的情境，看看自己更靠近誰。
          </p>
          <p className={styles.note}>
            這只是個輕鬆向的玩家心測，結果不會決定你開本當天的角色，純粹給你跟朋友互相對照玩用。
          </p>
        </header>

        <section className={styles.stage} aria-live="polite">
          <div className={styles.progressArea}>
            <div className={styles.progressTop}>
              <span>{!nameConfirmed ? '玩家登記' : showResult ? '結果解鎖' : `${step + 1} / ${questions.length}`}</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {!nameConfirmed ? (
            <form className={styles.namePanel} onSubmit={confirmPlayerName}>
              <p className={styles.questionMeta}>零、玩家名字</p>
              <h2>請留下你的名字</h2>
              <label className={styles.nameField}>
                <span>測完之後會印在你的專屬角色卡上，方便分享給朋友。</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="輸入玩家名字"
                  maxLength={14}
                  autoComplete="name"
                />
              </label>
              <div className={styles.controls}>
                <button type="submit" className={styles.primaryButton} disabled={!playerName.trim()}>
                  開始測驗
                </button>
              </div>
            </form>
          ) : !showResult ? (
            <div className={styles.quizPanel}>
              <p className={styles.questionMeta}>{currentQuestion.title}</p>
              <h2>{currentQuestion.prompt}</h2>
              <div className={styles.optionList}>
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.optionButton} ${selectedAnswer === index ? styles.optionButtonActive : ''}`}
                    onClick={() => chooseAnswer(index)}
                  >
                    <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                    <span className={styles.optionText}>{option.text}</span>
                  </button>
                ))}
              </div>
              <div className={styles.controls}>
                <button type="button" className={styles.secondaryButton} onClick={goBack}>
                  ← 上一步
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.resultPanel}>
              <p className={styles.resultKicker}>YOUR HEARTBREAK MATCH</p>
              <h2 className={styles.resultName}>{winner.name}</h2>
              <p className={styles.resultEn}>{winner.en}</p>
              <div className={styles.resultBody}>
                <div className={styles.resultPortrait}>
                  <Image
                    src={winner.image}
                    alt={winner.name}
                    width={540}
                    height={760}
                    sizes="(max-width: 720px) 80vw, 360px"
                    priority
                  />
                </div>
                <div className={styles.resultText}>
                  <p className={styles.resultEpithet}>{winner.epithet}</p>
                  <ul className={styles.traitList}>
                    {winner.traits.map((trait) => (
                      <li key={trait}>{trait}</li>
                    ))}
                  </ul>
                  <p className={styles.resultDescription}>{winner.description}</p>
                  <p className={styles.whisper}>「{winner.whisper}」</p>
                </div>
              </div>

              <ResultCardGenerator
                scriptTitle={SCRIPT_TITLE}
                characterName={winner.name}
                characterImage={winner.image}
                precomposedArtwork={winner.cardImage}
                quote={winner.whisper}
                playerName={playerName}
                theme="noMoreHeartbreak"
                accent="#e3b56b"
                secondary="#7d6dd0"
              />

              <div className={styles.ranking}>
                {ranking.map((character, index) => {
                  const width = Math.max(8, ((character.score - minScore) / scoreRange) * 100);
                  return (
                    <div
                      key={character.id}
                      className={`${styles.rankingItem} ${index === 0 ? styles.rankingTop : ''}`}
                    >
                      <span className={styles.rankNumber}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={styles.rankName}>{character.name}</span>
                      <div className={styles.rankBarTrack}>
                        <div className={styles.rankBarFill} style={{ width: `${width}%` }} />
                      </div>
                      <span className={styles.rankScore}>{formatScore(character.score)}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.controls}>
                <button type="button" className={styles.secondaryButton} onClick={goBack}>
                  ← 回上一題
                </button>
                <button type="button" className={styles.primaryButton} onClick={restart}>
                  再測一次
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
