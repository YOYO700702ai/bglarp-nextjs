'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ResultCardGenerator from '@/components/ResultCardGenerator';
import styles from './quiz.module.css';

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

const groups = [
  {
    id: 'male',
    label: '男生',
    title: '核爆、煙盒與木偶線',
    summary: '萬寶路 / 核彈 / 匹諾曹',
    note: '把壓力、愛與謊言放進同一個黑盒，看看你最後會留下哪一種反應。',
  },
  {
    id: 'female',
    label: '女生',
    title: '玻璃、湖面與善意謊言',
    summary: '氏子 / 阿而 / 玻璃糖',
    note: '從一幅湖泊開始，測出你靠近愛、愧疚與自由時的心理偏向。',
  },
];

const characters = {
  male: [
    {
      id: 'wanbaolu',
      name: '萬寶路',
      image: '/evil-flower-quiz/characters/wanbaolu.jpg',
      epithet: '博弈型燃點',
      traits: ['競技場', '掌控慾', '壓力耐受'],
      symbol: '紅色手機',
      description:
        '你對世界的第一反應不是退讓，而是判斷局面裡誰握著籌碼。你可以承認痛感，也能把它轉成行動，越是混亂，越會逼自己站到能改變結果的位置。',
      whisper:
        '那件被你握在手裡的東西，也許不是通訊工具，而是一條還沒被剪斷的導火線。',
    },
    {
      id: 'hedan',
      name: '核彈',
      image: '/evil-flower-quiz/characters/hedan.jpg',
      epithet: '爆裂型真相',
      traits: ['極端', '不迴避', '破局'],
      symbol: '墜落的月',
      description:
        '你不害怕事情失控，反而害怕一切被粉飾成可以忍耐。當謊言、愛情與壓迫同時逼近，你會想親手按下那個讓假象瓦解的按鈕。',
      whisper:
        '你像一顆被安靜供奉的月亮，只有真正被逼近時，才會讓所有人看見背面的火光。',
    },
    {
      id: 'pinuocao',
      name: '匹諾曹',
      image: '/evil-flower-quiz/characters/pinuocao.jpg',
      epithet: '自我劇場型',
      traits: ['表演', '界線', '被牽引'],
      symbol: '鑰匙',
      description:
        '你容易把自己放進一場只有自己知道規則的戲裡。你不是沒有感情，而是太清楚感情會讓人被拉扯，所以會用沉默、玩笑或拒絕來保護真正的願望。',
      whisper:
        '匹諾曹先生您好像是帶著一把鑰匙來的。它對您應該很重要，我會先替您保管，等到時候再交還給您。',
    },
  ],
  female: [
    {
      id: 'shizi',
      name: '氏子',
      image: '/evil-flower-quiz/characters/shizi.jpg',
      epithet: '秩序型戒備',
      traits: ['界線', '自保', '冷靜觀察'],
      symbol: '黑色月蝕',
      description:
        '你不輕易把自己交給任何人，尤其當愛被說得太漂亮時，你會先確認代價。你的溫柔很少外放，但你會用自己的方式守住不能失去的東西。',
      whisper:
        '湖面上的群鳥不一定是逃離，也可能是在替你確認哪一條路還能回頭。',
    },
    {
      id: 'aer',
      name: '阿而',
      image: '/evil-flower-quiz/characters/aer.jpg',
      epithet: '愧疚型訊號',
      traits: ['善意謊言', '孤獨感', '敏銳'],
      symbol: '破裂電視',
      description:
        '你對人的情緒很敏銳，也很容易替自己的選擇背負重量。你會反覆檢查一句話、一個隱瞞、一個轉身是不是傷到了誰，直到真相在心裡變成噪音。',
      whisper:
        '訊號已經斷續很久了，但你仍然能分辨哪一句是別人要你相信，哪一句才是你自己聽見的真話。',
    },
    {
      id: 'bolitang',
      name: '玻璃糖',
      image: '/evil-flower-quiz/characters/bolitang.jpg',
      epithet: '浪漫型裂面',
      traits: ['自由', '雙向', '戲劇感'],
      symbol: '碎裂糖杯',
      description:
        '你相信愛必須有流動與回應，也能接受生命帶著表演性。你不是單純追求甜，而是知道甜味一旦碎裂，鋒利的邊緣也會成為故事的一部分。',
      whisper:
        '玻璃破掉以前像糖，破掉以後仍然反光。你真正想保護的，也許不是完整，而是選擇破碎的自由。',
    },
  ],
};

const quizzes = {
  female: [
    {
      title: '一、湖泊的畫',
      prompt: '假如你的面前出現一幅只有一潭湖泊的畫，你會在上面添加什麼元素？',
      options: [
        { text: '群鳥', weights: { shizi: 10 } },
        { text: '雪山', weights: { aer: 10 } },
        { text: '很多魚', weights: { bolitang: 10 } },
      ],
    },
    {
      title: '二、善意的謊',
      prompt: '你會為自己的謊言感到愧疚嗎，即使那是善意的謊言？',
      options: [
        { text: '會', weights: { aer: 15, shizi: -10, bolitang: -10 } },
        { text: '不會', weights: { shizi: 15, bolitang: 15, aer: -10 } },
      ],
    },
    {
      title: '三、朋友的問候',
      prompt: '當好朋友問你最近怎麼樣，你會傾向於覺得？',
      options: [
        { text: 'Ta 想知道我最近有沒有發生什麼事情。', weights: { shizi: 15, aer: 15, bolitang: -10 } },
        { text: 'Ta 想知道我最近的心情怎麼樣。', weights: { bolitang: 15, shizi: -10, aer: -10 } },
      ],
    },
    {
      title: '四、抗壓角色',
      prompt: '你可以接受遊戲中的抗壓角色嗎？',
      options: [
        { text: '可以', weights: { bolitang: 15, aer: 15, shizi: -10 } },
        { text: '不可以', weights: { shizi: 15, bolitang: -10, aer: -10 } },
      ],
    },
    {
      title: '五、付出的態度',
      prompt: '關於愛情，你對付出的態度是？',
      options: [
        { text: '可以', weights: { bolitang: 10, aer: 10, shizi: -5 } },
        { text: '不可以', weights: { shizi: 10, bolitang: -5, aer: -5 } },
        { text: '都可以，雙向就行。', weights: { bolitang: 10, aer: 10, shizi: -5 } },
      ],
    },
    {
      title: '六、生活的形容',
      prompt: '你覺得生活更像是以下哪種形容？',
      options: [
        { text: '枯燥的單人遊戲', weights: { aer: 5 } },
        { text: '充斥著博弈的競技場', weights: { shizi: 5 } },
        { text: '戲劇', weights: { bolitang: 5 } },
      ],
    },
    {
      title: '七、詞組偏好',
      prompt: '以下的形容詞組，你更喜歡哪一組？',
      options: [
        { text: '理想主義、利己主義、自我。', weights: { shizi: 5 } },
        { text: '反抗者、革命家、控制、偏執。', weights: { aer: 5 } },
        { text: '浪漫、欺騙、自由、愛。', weights: { bolitang: 5 } },
      ],
    },
  ],
  male: [
    {
      title: '一、湖泊的畫',
      prompt: '假如你的面前出現一幅只有一潭湖泊的畫，你會在上面添加什麼元素？',
      options: [
        { text: '群鳥', weights: { pinuocao: 10 } },
        { text: '雪山', weights: { hedan: 10 } },
        { text: '很多魚', weights: { wanbaolu: 10 } },
      ],
    },
    {
      title: '二、善意的謊',
      prompt: '你會為自己的謊言感到愧疚嗎，即使那是善意的謊言？',
      options: [
        { text: '會', weights: { wanbaolu: 15, hedan: -10, pinuocao: -10 } },
        { text: '不會', weights: { hedan: 15, pinuocao: 15, wanbaolu: -10 } },
      ],
    },
    {
      title: '三、抗壓角色',
      prompt: '你可以接受遊戲中的抗壓角色嗎？',
      options: [
        { text: '可以', weights: { wanbaolu: 15, hedan: 15, pinuocao: -10 } },
        { text: '不可以', weights: { pinuocao: 15, wanbaolu: -10, hedan: -10 } },
      ],
    },
    {
      title: '四、付出的態度',
      prompt: '關於愛情，你對付出的態度是？',
      options: [
        { text: '可以', weights: { wanbaolu: 15, pinuocao: 15, hedan: -10 } },
        { text: '不可以', weights: {} },
        { text: '都可以，雙向就行。', weights: { hedan: 15, wanbaolu: -10, pinuocao: -10 } },
      ],
    },
    {
      title: '五、生活的形容',
      prompt: '你覺得生活更像是以下哪種形容？',
      options: [
        { text: '枯燥的單人遊戲', weights: { pinuocao: 10 } },
        { text: '充斥著博弈的競技場', weights: { wanbaolu: 10 } },
        { text: '戲劇', weights: { pinuocao: 10, hedan: 10 } },
      ],
    },
    {
      title: '六、詞組偏好',
      prompt: '以下的形容詞組，你更喜歡哪一組？',
      options: [
        { text: '用沸水澆死螞蟻，自大？狂妄？正義？', weights: { wanbaolu: 10 } },
        { text: '掌控感、利己主義者、我、我要、我的。', weights: { pinuocao: 10 } },
        { text: '瘋子？惡魔？憑什麼，為什麼？', weights: { hedan: 10 } },
      ],
    },
  ],
};

function getInitialScores(groupId) {
  return Object.fromEntries(characters[groupId].map((character) => [character.id, 0]));
}

function formatScore(score) {
  return score > 0 ? `+${score}` : String(score);
}

export default function EvilFlowerQuizPage() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [answers, setAnswers] = useState([]);
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

  const activeQuiz = selectedGroup ? quizzes[selectedGroup] : [];
  const activeQuestion = activeQuiz[step];
  const selectedAnswer = answers[step];

  const ranking = useMemo(() => {
    if (!selectedGroup) return [];
    const scores = getInitialScores(selectedGroup);
    answers.forEach((answerIndex, questionIndex) => {
      if (answerIndex == null) return;
      const option = quizzes[selectedGroup][questionIndex]?.options[answerIndex];
      Object.entries(option?.weights || {}).forEach(([id, value]) => {
        scores[id] += value;
      });
    });

    return characters[selectedGroup]
      .map((character) => ({ ...character, score: scores[character.id] }))
      .sort((a, b) => b.score - a.score);
  }, [answers, selectedGroup]);

  const winner = ranking[0];
  const maxScore = Math.max(1, ...ranking.map((item) => item.score));
  const minScore = Math.min(0, ...ranking.map((item) => item.score));
  const scoreRange = Math.max(1, maxScore - minScore);
  const progress = !nameConfirmed
    ? 0
    : !selectedGroup
      ? 8
      : showResult
        ? 100
        : Math.round(((step + 1) / activeQuiz.length) * 100);

  const confirmPlayerName = (event) => {
    event.preventDefault();
    if (!playerName.trim()) return;
    setNameConfirmed(true);
  };

  const selectGroup = (groupId) => {
    setSelectedGroup(groupId);
    setAnswers(Array(quizzes[groupId].length).fill(null));
    setStep(0);
    setShowResult(false);
  };

  const chooseAnswer = (optionIndex) => {
    const nextAnswers = answers.slice();
    nextAnswers[step] = optionIndex;
    setAnswers(nextAnswers);

    window.setTimeout(() => {
      if (step >= activeQuiz.length - 1) {
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
    setSelectedGroup(null);
    setAnswers([]);
  };

  const restart = () => {
    setPlayerName('');
    setNameConfirmed(false);
    setSelectedGroup(null);
    setAnswers([]);
    setStep(0);
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={styles.page}>
      <audio ref={audioRef} src="/evil-flower-quiz/music.mp3" loop preload="auto" />

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
          <p className={styles.kicker}>心理分角測驗</p>
          <h1>惡之華</h1>
          <p className={styles.lead}>
            選擇你在謊言、付出、壓力與愛裡最先伸出的手。測驗會依照男女角色分流，最後揭開你最靠近的那朵惡之華。
          </p>
        </header>

        <section className={styles.stage} aria-live="polite">
          <div className={styles.progressArea}>
            <div className={styles.progressTop}>
              <span>{!nameConfirmed ? '玩家登記' : selectedGroup ? (showResult ? '結果解鎖' : `${step + 1} / ${activeQuiz.length}`) : '選擇入口'}</span>
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
                <span>測驗完成後，這個名字會印在你的專屬角色圖卡上。</span>
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
          ) : !selectedGroup ? (
            <div className={styles.groupGrid} aria-label="選擇測驗分流">
              {groups.map((group, index) => (
                <button
                  key={group.id}
                  type="button"
                  className={styles.groupCard}
                  onClick={() => selectGroup(group.id)}
                >
                  <span className={styles.groupNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{group.label}</strong>
                  <em>{group.summary}</em>
                  <span className={styles.groupTitle}>{group.title}</span>
                  <span className={styles.groupNote}>{group.note}</span>
                </button>
              ))}
            </div>
          ) : !showResult ? (
            <div className={styles.quizPanel}>
              <p className={styles.questionMeta}>{activeQuestion.title}</p>
              <h2>{activeQuestion.prompt}</h2>
              <div className={styles.options}>
                {activeQuestion.options.map((option, index) => (
                  <button
                    key={option.text}
                    type="button"
                    className={`${styles.option} ${selectedAnswer === index ? styles.optionSelected : ''}`}
                    onClick={() => chooseAnswer(index)}
                  >
                    <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
              <div className={styles.controls}>
                <button type="button" className={styles.secondaryButton} onClick={goBack}>
                  上一步
                </button>
                <span className={styles.autoHint}>選完後會自動前進</span>
              </div>
            </div>
          ) : (
            <div className={styles.resultPanel}>
              <div className={styles.portraitFrame}>
                <Image
                  src={winner.image}
                  alt={winner.name}
                  fill
                  sizes="(max-width: 840px) 330px, 410px"
                  className={styles.portrait}
                  priority
                />
              </div>

              <div className={styles.resultCopy}>
                <p className={styles.resultKicker}>你的心理角色</p>
                <h2>{winner.name}</h2>
                <p className={styles.epithet}>{winner.epithet}</p>
                <div className={styles.traits}>
                  {winner.traits.map((trait) => (
                    <span key={trait}>{trait}</span>
                  ))}
                </div>
                <p className={styles.description}>{winner.description}</p>

                <div className={styles.symbolLine}>
                  <span>象徵物</span>
                  <strong>{winner.symbol}</strong>
                </div>
                <p className={styles.whisper}>{winner.whisper}</p>

                <ResultCardGenerator
                  scriptTitle="惡之華"
                  characterName={winner.name}
                  characterImage={winner.image}
                  quote={winner.whisper}
                  playerName={playerName}
                  theme="evilFlower"
                  accent="#ff5a2c"
                  secondary="#1e61ff"
                />

                <div className={styles.ranking}>
                  {ranking.map((character, index) => {
                    const width = Math.max(8, ((character.score - minScore) / scoreRange) * 100);
                    return (
                      <div
                        key={character.id}
                        className={`${styles.rankRow} ${index === 0 ? styles.rankWinner : ''}`}
                      >
                        <span>{character.name}</span>
                        <div className={styles.rankTrack}>
                          <div style={{ width: `${width}%` }} />
                        </div>
                        <strong>{formatScore(character.score)}</strong>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.controls}>
                  <button type="button" className={styles.secondaryButton} onClick={goBack}>
                    回上一題
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={restart}>
                    重新測驗
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
