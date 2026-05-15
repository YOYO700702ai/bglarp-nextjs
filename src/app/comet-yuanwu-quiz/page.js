'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ResultCardGenerator from '@/components/ResultCardGenerator';
import styles from './quiz.module.css';

const SCRIPT_TITLE = '彗星掠過鳶屋時';

const groups = [
  {
    id: 'male',
    label: '男生',
    title: '記憶、守護與抉擇',
    note: '測出你在家、責任與犧牲之間，更接近哪一種情感重量。',
  },
  {
    id: 'female',
    label: '女生',
    title: '陪伴、愛與被守護',
    note: '測出你被什麼打動，又會把哪一份溫柔留在彗星之下。',
  },
];

const characters = [
  {
    id: 'aishan',
    group: 'male',
    name: '完山',
    image: '/comet-yuanwu-quiz/characters/aishan.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/aishan-card.jpg',
    epithet: '長輩型守望者',
    traits: ['親情', '守護', '安定'],
    description: '你容易被「有人一直替你把路照亮」這件事打動。你不一定把愛說出口，但你會用很長的時間，把一個人、一個家、一段承諾守到最後。',
    quote: '你會把溫柔藏在日常裡，等別人回頭時才發現它一直都在。',
  },
  {
    id: 'tonegawa',
    group: 'male',
    name: '利根川',
    image: '/comet-yuanwu-quiz/characters/tonegawa.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/tonegawa-card.jpg',
    epithet: '同輩型奔赴者',
    traits: ['同伴', '行動', '熱度'],
    description: '你相信陪伴不是站在原地等待，而是在對方需要時真的走過去。你對情感的反應直接，越重要的人，越會讓你想親手保護。',
    quote: '你不怕路遠，只怕重要的人以為自己只能獨自走完。',
  },
  {
    id: 'echizen',
    group: 'male',
    name: '越前',
    image: '/comet-yuanwu-quiz/characters/echizen.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/echizen-card.jpg',
    epithet: '理想型犧牲者',
    traits: ['大義', '克制', '代價'],
    description: '你會把私人情感放進更大的局勢裡衡量。你並非冷漠，而是知道有些選擇一旦做下去，就必須有人承受看不見的代價。',
    quote: '你會先看清代價，再決定要不要替眾人接住那道光。',
  },
  {
    id: 'ayame',
    group: 'female',
    name: '菖蒲',
    image: '/comet-yuanwu-quiz/characters/ayame.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/ayame-card.jpg',
    epithet: '被愛型閃光者',
    traits: ['被疼愛', '坦率', '明亮'],
    description: '你很容易被真心與熱烈打動，也願意相信有人會無條件走向你。你不是脆弱，而是仍保留著被愛時會發亮的部分。',
    quote: '你值得被捧在掌心，也值得坦率地奔向想見的人。',
  },
  {
    id: 'kohutou',
    group: 'female',
    name: '小糊塗',
    image: '/comet-yuanwu-quiz/characters/kohutou.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/kohutou-card.jpg',
    epithet: '陪伴型記憶者',
    traits: ['簡單生活', '陪伴', '感受力'],
    description: '你最容易被細小卻長久的陪伴打中。對你來說，情感不一定要轟烈，能在疲憊時有一盞燈、一個回應，就已經很珍貴。',
    quote: '你在意的不是盛大的告白，而是有人願意一直陪你回家。',
  },
  {
    id: 'reiko',
    group: 'female',
    name: '令子',
    image: '/comet-yuanwu-quiz/characters/reiko.jpg',
    cardImage: '/comet-yuanwu-quiz/cards/reiko-card.jpg',
    epithet: '靜默型執念者',
    traits: ['愛情', '清醒', '邊界'],
    description: '你對情感敏銳，但不會輕易交出自己。你可以愛得深，也會記得保護心裡最安靜的地方；比起熱鬧，你更相信被理解。',
    quote: '你把真心收得很深，只留給真正聽得懂的人。',
  },
];

const questions = [
  {
    title: '一、情感的回聲',
    prompt: '關於劇本中的情感部分，你的屬性更接近哪一種？',
    options: [
      { text: '有哭哭經歷，如果遇到打動自己的故事會哭。', weights: { ayame: 3, kohutou: 3, aishan: 1 } },
      { text: '能推能哭，可以自由切換，是相對綜合的玩家。', weights: { tonegawa: 2, reiko: 2, ayame: 1 } },
      { text: '哭不太出來，但可以感受故事，偶爾會被打動。', weights: { aishan: 2, echizen: 2, reiko: 1 } },
      { text: '完全沒有感情，遇到情感部分會覺得自己在坐牢。', weights: { echizen: 3, reiko: 2 } },
    ],
  },
  {
    title: '二、回到家門口',
    prompt: '下班回到家，你更期待以下哪個場景？',
    options: [
      { text: '家人都在家等候，廚房裡正在做飯，有濃濃的煙火氣。', weights: { aishan: 3, tonegawa: 2, ayame: 1 } },
      { text: '卸下疲憊，和戀愛對象窩在沙發裡看電影。', weights: { ayame: 2, reiko: 3, tonegawa: 1 } },
      { text: '獨居也很好，一人足矣，打開門有小狗搖著尾巴。', weights: { kohutou: 3, echizen: 2, reiko: 1 } },
    ],
  },
  {
    title: '三、第一順位',
    prompt: '以下情感類型中，如果只能把最前面的第一順位寫下來，你會選哪一個？',
    options: [
      { text: '親情，偏向長輩。', weights: { aishan: 4, ayame: 1 } },
      { text: '親情，偏向同輩。', weights: { tonegawa: 3, kohutou: 2 } },
      { text: '愛情。', weights: { reiko: 3, ayame: 2 } },
      { text: '其他，比起關係本身，你更在意命運、理想或陪伴的形式。', weights: { echizen: 3, kohutou: 2 } },
    ],
  },
  {
    title: '四、最先刺進心裡的畫面',
    prompt: '以下哪種情況，更能夠觸動你？',
    options: [
      { text: '被身邊的人們疼愛，捧在掌心，無條件地守護你。', weights: { ayame: 4, aishan: 2 } },
      { text: '認定一個人，談一場轟轟烈烈的感情，相互奔赴。', weights: { reiko: 3, ayame: 2, tonegawa: 1 } },
      { text: '不參與外界紛擾，簡簡單單地生活，有小小的陪伴。', weights: { kohutou: 4, aishan: 1 } },
      { text: '願意為更崇高的理想捨棄安寧生活，為大義而犧牲。', weights: { echizen: 4, tonegawa: 1 } },
    ],
  },
  {
    title: '五、劇裡讓你停住的橋段',
    prompt: '你正在觀看一部電視劇，以下哪個橋段最能讓你感動？',
    options: [
      { text: '父王作為一國之主，為你排除萬難，鼓勵你做自己想做的事。', weights: { aishan: 4, ayame: 1 } },
      { text: '你的長兄舍棄天下江山，只為保護你，給你安寧的生活。', weights: { tonegawa: 4, kohutou: 1 } },
      { text: '心愛的女人被迫與異國聯姻，最終她不顧一切回到你身邊。', weights: { reiko: 4, tonegawa: 1 } },
      { text: '你與夫君相濡以沫、白頭到老，三生三世他只娶你一人。', weights: { ayame: 4, reiko: 1 } },
      { text: '陪你征戰十年的寶刀產生靈魂，為你擋下致命一擊後折斷。', weights: { kohutou: 4, tonegawa: 1 } },
      { text: '丞相犧牲自己的性命，解決百姓衣食溫飽，拯救天下蒼生。', weights: { echizen: 4, aishan: 1 } },
    ],
  },
  {
    title: '六、你最不想踩到的劇情',
    prompt: '以下故事情節中，你嚴重避雷的有哪些？可多選。',
    multiple: true,
    options: [
      { text: '因為仇恨，你做出了極端的事情。', weights: { echizen: 2, aishan: 1 } },
      { text: '你被某人編織的美好幻想所欺騙。', weights: { reiko: 3, kohutou: 1 } },
      { text: '你十分在意的人，在你不知情時為你做出巨大犧牲。', weights: { ayame: 2, kohutou: 2, tonegawa: 1 } },
      { text: '你親手放過殺害親人的仇人，並舍棄復仇的機會。', weights: { aishan: 2, tonegawa: 2 } },
      { text: '以上都還好，我可以接受故事的殘酷。', exclusive: true, weights: { echizen: 2, reiko: 1 } },
    ],
  },
  {
    title: '七、前作的情感座標',
    prompt: '在第一部《沒頭腦東西不傷心》中，你最喜歡誰的故事？可多選。',
    multiple: true,
    options: [
      { text: '愛哭鬼。', weights: { ayame: 2, kohutou: 2 } },
      { text: '大聰明。', weights: { echizen: 2, reiko: 2 } },
      { text: '倒楣蛋。', weights: { tonegawa: 2, kohutou: 1 } },
      { text: '開心果。', weights: { ayame: 2, tonegawa: 1 } },
      { text: '瞌睡蟲。', weights: { aishan: 2, kohutou: 1 } },
      { text: '黏人精。', weights: { ayame: 1, aishan: 1, reiko: 1 } },
      { text: '沒玩過第一部。', exclusive: true, weights: { aishan: 1, tonegawa: 1, echizen: 1, ayame: 1, kohutou: 1, reiko: 1 } },
    ],
  },
];

function getInitialAnswers() {
  return questions.map(() => []);
}

function getScores() {
  return Object.fromEntries(characters.map(({ id }) => [id, 0]));
}

export default function CometYuanwuQuizPage() {
  const [playerName, setPlayerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [answers, setAnswers] = useState(getInitialAnswers);
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const activeQuestion = questions[step];
  const selectedOptions = answers[step] || [];
  const totalSteps = questions.length + 2;
  const completedSteps = (nameConfirmed ? 1 : 0) + (selectedGroup ? 1 : 0) + (showResult ? questions.length : step);
  const progress = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

  const scores = useMemo(() => {
    const nextScores = getScores();
    answers.forEach((choiceIndexes, questionIndex) => {
      choiceIndexes.forEach((choiceIndex) => {
        const option = questions[questionIndex].options[choiceIndex];
        Object.entries(option.weights || {}).forEach(([id, value]) => {
          nextScores[id] += value;
        });
      });
    });
    return nextScores;
  }, [answers]);

  const ranking = useMemo(
    () => characters
      .filter((character) => character.group === (selectedGroup || 'male'))
      .map((character) => ({ ...character, score: scores[character.id] }))
      .sort((a, b) => b.score - a.score),
    [scores, selectedGroup]
  );

  const result = ranking[0] || characters[0];

  const confirmName = () => {
    if (!playerName.trim()) return;
    setNameConfirmed(true);
  };

  const selectGroup = (groupId) => {
    setSelectedGroup(groupId);
  };

  const toggleOption = (optionIndex) => {
    const question = questions[step];
    setAnswers((current) => {
      const next = current.map((entry) => [...entry]);
      if (!question.multiple) {
        next[step] = [optionIndex];
        return next;
      }

      const option = question.options[optionIndex];
      const currentChoices = next[step];
      if (option.exclusive) {
        next[step] = currentChoices.includes(optionIndex) ? [] : [optionIndex];
        return next;
      }

      const exclusiveIndexes = question.options
        .map((item, index) => (item.exclusive ? index : null))
        .filter((index) => index !== null);
      const withoutExclusive = currentChoices.filter((index) => !exclusiveIndexes.includes(index));
      next[step] = withoutExclusive.includes(optionIndex)
        ? withoutExclusive.filter((index) => index !== optionIndex)
        : [...withoutExclusive, optionIndex];
      return next;
    });
  };

  const goNext = () => {
    if (selectedOptions.length === 0) return;
    if (step >= questions.length - 1) {
      setShowResult(true);
      return;
    }
    setStep((current) => current + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setStep((current) => current - 1);
  };

  const restart = () => {
    setSelectedGroup(null);
    setAnswers(getInitialAnswers());
    setStep(0);
    setShowResult(false);
  };

  return (
    <main className={styles.page}>
      <div className={styles.texture} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <Link href="/" className={styles.homeLink}>回到首頁</Link>
          <p className={styles.kicker}>心理角色測驗</p>
          <h1>{SCRIPT_TITLE}</h1>
          <p className={styles.lead}>
            彗星掠過鳶屋的夜晚，留下來的不只是願望，還有你面對親情、愛與犧牲時最真實的反應。
          </p>
        </header>

        <section className={styles.stage}>
          <div className={styles.progressArea}>
            <div className={styles.progressTop}>
              <span>{showResult ? '結果解鎖' : '測驗進行中'}</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {!nameConfirmed && (
            <div className={styles.namePanel}>
              <p className={styles.questionMeta}>進入鳶屋前</p>
              <h2>請留下玩家名字，最後會寫進你的專屬角色圖卡。</h2>
              <label className={styles.nameField}>
                <span>玩家名字</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') confirmName();
                  }}
                  placeholder="輸入你的名字"
                />
              </label>
              <button className={styles.primaryButton} type="button" onClick={confirmName} disabled={!playerName.trim()}>
                走進鳶屋
              </button>
            </div>
          )}

          {nameConfirmed && !selectedGroup && (
            <div className={styles.groupPanel}>
              <p className={styles.questionMeta}>選擇角色池</p>
              <h2>{playerName.trim()}，你想測哪一組角色？</h2>
              <div className={styles.groupGrid}>
                {groups.map((group) => (
                  <button key={group.id} className={styles.groupCard} type="button" onClick={() => selectGroup(group.id)}>
                    <span>{group.label}</span>
                    <strong>{group.title}</strong>
                    <em>{group.note}</em>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nameConfirmed && selectedGroup && !showResult && (
            <div className={styles.quizPanel}>
              <p className={styles.questionMeta}>第 {step + 1} 題 / {questions.length}</p>
              <span className={styles.questionTitle}>{activeQuestion.title}</span>
              <h2>{activeQuestion.prompt}</h2>
              <div className={styles.options}>
                {activeQuestion.options.map((option, index) => {
                  const isActive = selectedOptions.includes(index);
                  return (
                    <button
                      key={option.text}
                      type="button"
                      aria-pressed={isActive}
                      className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                      onClick={() => toggleOption(index)}
                    >
                      <span className={styles.optionMark}>{String.fromCharCode(65 + index)}</span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.navRow}>
                <button className={styles.secondaryButton} type="button" onClick={goBack} disabled={step === 0}>
                  上一題
                </button>
                <button className={styles.primaryButton} type="button" onClick={goNext} disabled={selectedOptions.length === 0}>
                  {step >= questions.length - 1 ? '查看結果' : '下一題'}
                </button>
              </div>
            </div>
          )}

          {showResult && (
            <div className={styles.resultPanel}>
              <div className={styles.resultImage}>
                <Image
                  src={result.cardImage}
                  alt={result.name}
                  fill
                  sizes="(max-width: 860px) min(92vw, 480px), 480px"
                  className={styles.resultPortrait}
                  priority
                />
              </div>
              <div className={styles.resultCopy}>
                <p className={styles.resultKicker}>你的心理角色</p>
                <h2>{result.name}</h2>
                <p className={styles.epithet}>{result.epithet}</p>
                <div className={styles.traits}>
                  {result.traits.map((trait) => <span key={trait}>{trait}</span>)}
                </div>
                <p className={styles.description}>{result.description}</p>
                <blockquote>{result.quote}</blockquote>
                <ResultCardGenerator
                  scriptTitle={SCRIPT_TITLE}
                  characterName={result.name}
                  characterImage={result.cardImage}
                  quote={result.quote}
                  playerName={playerName}
                  theme="comet"
                  accent="#dff7ff"
                  secondary="#77c8ff"
                  cardLayout="portrait"
                  imageFit="cover"
                  precomposedArtwork
                />
                <button className={styles.secondaryButton} type="button" onClick={restart}>
                  重新測驗
                </button>
              </div>
              <div className={styles.scoreBoard}>
                {ranking.map((character) => (
                  <div key={character.id} className={styles.scoreRow}>
                    <span>{character.name}</span>
                    <div className={styles.scoreTrack}>
                      <div
                        className={styles.scoreFill}
                        style={{ width: `${Math.max(8, Math.min(100, (character.score / Math.max(1, ranking[0].score)) * 100))}%` }}
                      />
                    </div>
                    <strong>{character.score}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
