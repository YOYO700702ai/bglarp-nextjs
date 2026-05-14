'use client';

import { useMemo, useRef, useState } from 'react';
import ResultCardGenerator from '@/components/ResultCardGenerator';
import styles from './quiz.module.css';

const characters = [
  {
    name: '蕭凌風',
    group: 'male',
    image: '/hanmen-quiz/characters/蕭凌風.jpg',
    epithet: '決斷型守護者',
    traits: ['堅毅', '外冷內熱', '行動派'],
    description:
      '你在關係裡不太說漂亮話，但會把責任扛在身上。當局面變得混亂，你的本能是先站出去，替重要的人把風雨擋下來。',
  },
  {
    name: '修璟',
    group: 'male',
    image: '/hanmen-quiz/characters/修璟.jpg',
    epithet: '克制型記憶者',
    traits: ['理性', '愧疚感強', '重視承諾'],
    description:
      '你習慣把情緒收得很深，先想清楚因果，再決定如何補償。你不一定最快出手，卻會記得每一句承諾、每一份虧欠。',
  },
  {
    name: '云清明',
    group: 'male',
    image: '/hanmen-quiz/characters/云清明.jpg',
    epithet: '全局型執棋者',
    traits: ['冷靜', '自尊心強', '看重家國大義'],
    description:
      '你不容易被情緒牽著走。越是艱難的選擇，你越會逼自己看見更大的代價，哪怕因此被誤會，也會把局面推到最可能的解法。',
  },
  {
    name: '宣萱',
    group: 'female',
    image: '/hanmen-quiz/characters/宣萱.jpg',
    epithet: '溫柔型安定者',
    traits: ['溫柔善良', '重親情', '願意被愛'],
    description:
      '你很容易先感受到別人的痛。你不會把溫柔當成軟弱，而是把它變成讓大家撐下去的力量；在關係裡，你也願意學著接受被照顧。',
  },
  {
    name: '容雪鳶',
    group: 'female',
    image: '/hanmen-quiz/characters/容雪鳶.jpg',
    epithet: '敏銳型自由者',
    traits: ['肆意瀟灑', '敏感', '自尊心強'],
    description:
      '你很會讀空氣，也很會保護自己的心。你看似灑脫，實際上非常在意被理解；若有人想靠近你，必須先尊重你的邊界。',
  },
  {
    name: '莫辭',
    group: 'female',
    image: '/hanmen-quiz/characters/莫辭.jpg',
    epithet: '沉默型承擔者',
    traits: ['內向', '能忍', '愧疚線強'],
    description:
      '你不擅長替自己辯解，卻會默默把該做的事做完。你對愧疚與虧欠很敏感，常常寧可自己受委屈，也不想讓重要的人為難。',
  },
];

const groups = [
  { id: 'male', label: '男生' },
  { id: 'female', label: '女生' },
];

const questions = [
  {
    title: '一、燈下同行',
    prompt: '長夜趕路後，你身邊的人把最後一盞暖燈推到你面前，說：「這次換我照顧你。」你會怎麼反應？',
    options: [
      { text: '嘴上說不用，隔天卻替對方把最辛苦的事做完。', weights: { 蕭凌風: 3, 莫辭: 2 } },
      { text: '認真道謝，讓自己安心接受這份照顧。', weights: { 宣萱: 3, 修璟: 1 } },
      { text: '先確認對方是不是也很累，再決定怎麼分擔。', weights: { 修璟: 2, 云清明: 2 } },
      { text: '半開玩笑收下，但不讓對方看見你其實很感動。', weights: { 容雪鳶: 3 } },
    ],
  },
  {
    title: '二、未寄出的信',
    prompt: '你曾因一個錯誤讓某人受傷。多年後，你終於有機會寫一封信給對方，你會寫下什麼？',
    options: [
      { text: '把歉意說清楚，也承認自己當年不夠好。', weights: { 修璟: 3, 宣萱: 1 } },
      { text: '不解釋，只告訴對方：往後需要我，我一定到。', weights: { 蕭凌風: 2, 莫辭: 2 } },
      { text: '寫了又撕掉，覺得現在打擾對方太自私。', weights: { 莫辭: 3 } },
      { text: '用很輕鬆的語氣開頭，真正的愧疚藏在最後一句。', weights: { 容雪鳶: 2, 修璟: 1 } },
    ],
  },
  {
    title: '三、五封急信',
    prompt: '桌上有五封急信同時送來：戀人、家人、國土、師長、摯友都在等你回應。你會先拆哪一封？',
    options: [
      { text: '家人。血脈與牽掛，是你最先放心不下的事。', weights: { 宣萱: 3, 莫辭: 1 } },
      { text: '國土。若大局崩壞，誰都無法真正安穩。', weights: { 云清明: 3, 蕭凌風: 1 } },
      { text: '師長。你很難放下曾經教你、成就你的人。', weights: { 修璟: 3 } },
      { text: '戀人或摯友。你會先奔向那個正在等你的人。', weights: { 容雪鳶: 2, 蕭凌風: 1, 宣萱: 1 } },
    ],
  },
  {
    title: '四、家書三封',
    prompt: '遠行前，你只能帶走一封家書。祖輩、父母、手足各留了一封，你會選哪一封放進懷裡？',
    options: [
      { text: '祖輩的信，那像是一條從很遠的地方牽住你的線。', weights: { 修璟: 2, 宣萱: 2 } },
      { text: '父母的信，無論愛與缺憾，你都想再讀懂一次。', weights: { 莫辭: 3, 云清明: 1 } },
      { text: '手足的信，平輩之間的理解最讓你放不下。', weights: { 容雪鳶: 2, 蕭凌風: 1 } },
      { text: '都不帶。記在心裡就好，路還是要自己走。', weights: { 蕭凌風: 2, 云清明: 2 } },
    ],
  },
  {
    title: '五、路上的人',
    prompt: '故事中有一位重要 NPC 一路陪你同行，他可能成為戀人，也可能像家人。你最能接受哪一種牽絆？',
    options: [
      { text: '能接受愛情線，只要彼此的選擇夠真。', weights: { 容雪鳶: 3, 蕭凌風: 1 } },
      { text: '更想要親情線，被理解、被接住會很打動你。', weights: { 宣萱: 3, 莫辭: 1 } },
      { text: '師徒或知己線更適合，情感可以深，但不必是愛情。', weights: { 修璟: 3, 云清明: 1 } },
      { text: '都可以，但你需要保留自己的邊界。', weights: { 云清明: 2, 容雪鳶: 2 } },
    ],
  },
  {
    title: '六、山河將傾',
    prompt: '仙俠世界裡，一場災劫即將波及無辜百姓。你手中有改變局面的機會，但代價很高。你會？',
    options: [
      { text: '只要能救更多人，就算代價落在自己身上也願意。', weights: { 蕭凌風: 3, 莫辭: 2 } },
      { text: '先算清代價，不能用一時熱血害了更多人。', weights: { 云清明: 3, 修璟: 1 } },
      { text: '先護住身邊的人，再想辦法救更多人。', weights: { 宣萱: 3 } },
      { text: '不相信唯一解，會去找第三條路。', weights: { 容雪鳶: 2, 修璟: 2 } },
    ],
  },
  {
    title: '七、不能踩的線',
    prompt: '玩情感故事時，如果一定會遇到一段很痛的橋段，你最不希望它是哪一種？',
    options: [
      { text: '親情虧欠，尤其是明明相愛卻來不及好好說。', weights: { 宣萱: 2, 莫辭: 2 } },
      { text: '被重要的人誤解，還不能立刻解釋。', weights: { 莫辭: 3, 修璟: 1 } },
      { text: '愛情裡被迫放手，兩個人都沒有錯。', weights: { 容雪鳶: 3 } },
      { text: '為了大局犧牲個人，還要親手做選擇。', weights: { 云清明: 3, 蕭凌風: 1 } },
    ],
  },
  {
    title: '八、你像哪一種人',
    prompt: '朋友遇到麻煩時，你最常被說像哪一種人？',
    options: [
      { text: '外冷內熱，不一定安慰，但一定會出現。', weights: { 蕭凌風: 3 } },
      { text: '自尊心強，明明在意卻不想被看穿。', weights: { 容雪鳶: 2, 云清明: 2 } },
      { text: '溫柔善良，會先照顧別人的情緒。', weights: { 宣萱: 3 } },
      { text: '內向能忍，很多事都自己消化。', weights: { 莫辭: 3, 修璟: 1 } },
      { text: '理性堅定，越混亂越會逼自己冷靜。', weights: { 云清明: 3, 修璟: 2 } },
    ],
  },
  {
    title: '九、不能說的真相',
    prompt: '好友請你保守一個秘密，但這個秘密可能讓更多人受傷。你會怎麼做？',
    options: [
      { text: '先守住承諾，再私下逼自己找補救方法。', weights: { 莫辭: 2, 修璟: 2 } },
      { text: '如果會傷害更多人，就算被恨也要說出來。', weights: { 蕭凌風: 2, 云清明: 2 } },
      { text: '先查清完整脈絡，不讓任何人被片面真相推著走。', weights: { 云清明: 3, 修璟: 1 } },
      { text: '用迂迴的方法提醒當事人，盡量不直接撕破。', weights: { 容雪鳶: 3, 宣萱: 1 } },
    ],
  },
  {
    title: '十、天亮以前',
    prompt: '所有人都要在天亮後走向不同的路。最後一夜，你會把時間留給什麼？',
    options: [
      { text: '把該準備的都準備好，不讓明天多一分風險。', weights: { 蕭凌風: 2, 云清明: 2 } },
      { text: '寫下該記住的事，怕有些話再也沒人記得。', weights: { 修璟: 3 } },
      { text: '陪大家好好吃一頓飯，把告別變得不那麼冷。', weights: { 宣萱: 3 } },
      { text: '裝作灑脫地離開，真正想說的話留在風裡。', weights: { 容雪鳶: 3, 莫辭: 1 } },
      { text: '留下到最後，確定所有人都走遠了再走。', weights: { 莫辭: 3 } },
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

function getScores() {
  return Object.fromEntries(characters.map(({ name }) => [name, 0]));
}

export default function HanmenQuizPage() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);
  const totalSteps = questions.length + 2;
  const isGroupStep = nameConfirmed && step === 0;

  const scores = useMemo(() => {
    const nextScores = getScores();
    answers.forEach((choiceIndex, questionIndex) => {
      if (choiceIndex == null) return;
      const option = questions[questionIndex].options[choiceIndex];
      Object.entries(option.weights).forEach(([name, value]) => {
        nextScores[name] += value;
      });
    });
    return nextScores;
  }, [answers]);

  const ranking = useMemo(
    () => characters
      .filter((character) => character.group === (selectedGroup || 'male'))
      .map((character) => ({ ...character, score: scores[character.name] }))
      .sort((a, b) => b.score - a.score),
    [scores, selectedGroup]
  );

  const currentQuestion = questions[Math.max(0, step - 1)];
  const selected = isGroupStep ? selectedGroup : answers[step - 1];
  const winner = ranking[0];
  const progress = showResult
    ? 100
    : !nameConfirmed
      ? Math.round((1 / totalSteps) * 100)
      : Math.round(((step + 2) / totalSteps) * 100);

  const confirmPlayerName = (event) => {
    event.preventDefault();
    if (!playerName.trim()) return;
    setNameConfirmed(true);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }
    try {
      audio.volume = 0.52;
      await audio.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setShowResult(false);
    window.setTimeout(() => setStep(1), 150);
  };

  const chooseAnswer = (optionIndex) => {
    const nextAnswers = answers.slice();
    nextAnswers[step - 1] = optionIndex;
    setAnswers(nextAnswers);
    window.setTimeout(() => {
      if (step === questions.length) {
        setShowResult(true);
        return;
      }
      setStep((value) => value + 1);
    }, 150);
  };

  const previous = () => {
    if (!nameConfirmed) return;
    if (showResult) {
      setShowResult(false);
      return;
    }
    if (step === 0) {
      setNameConfirmed(false);
      setSelectedGroup(null);
      return;
    }
    setStep((value) => value - 1);
  };

  const restart = () => {
    setPlayerName('');
    setNameConfirmed(false);
    setAnswers(Array(questions.length).fill(null));
    setSelectedGroup(null);
    setStep(0);
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={styles.page}>
      <audio ref={audioRef} src="/hanmen-quiz/hanmen-music.mp3" loop preload="auto" />

      <button
        type="button"
        className={styles.musicButton}
        onClick={toggleMusic}
        aria-label={musicOn ? '關閉背景音樂' : '開啟背景音樂'}
        title={musicOn ? '關閉背景音樂' : '開啟背景音樂'}
      >
        <MusicNote muted={!musicOn} />
      </button>

      <section className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.kicker}>BGLARP · 心測</p>
          <h1>寒門</h1>
        </header>

        <div className={styles.progressArea} aria-label={`測驗進度 ${progress}%`}>
          <div className={styles.progressTop}>
            <span>{showResult ? '結果' : `第 ${step + 1} 問`}</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!showResult ? (
          <section className={styles.quizPanel}>
            {!nameConfirmed ? (
              <>
                <div className={styles.questionMeta}>零、玩家名字</div>
                <h2>請留下你的名字</h2>
                <form className={styles.namePanel} onSubmit={confirmPlayerName}>
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
              </>
            ) : isGroupStep ? (
              <>
                <div className={styles.questionMeta}>一、性別</div>
                <h2>你的性別是？</h2>
                <div className={styles.genderOptions} aria-label="選擇玩家性別">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className={`${styles.genderOption} ${selectedGroup === group.id ? styles.genderOptionSelected : ''}`}
                      onClick={() => selectGroup(group.id)}
                    >
                      <strong>{group.label}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className={styles.questionMeta}>{currentQuestion.title}</div>
                <h2>{currentQuestion.prompt}</h2>
                <div className={styles.options}>
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={option.text}
                      type="button"
                      className={`${styles.option} ${selected === index ? styles.optionSelected : ''}`}
                      onClick={() => chooseAnswer(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option.text}
                    </button>
                  ))}
                </div>
              </>
            )}

            {nameConfirmed && (
              <div className={styles.controls}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={previous}
                >
                  上一題
                </button>
                <div className={styles.autoHint}>選擇後自動進入下一題</div>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.resultPanel}>
            <div className={styles.resultImageWrap}>
              <img src={winner.image} alt={winner.name} className={styles.resultImage} />
            </div>
            <div className={styles.resultCopy}>
              <p className={styles.resultKicker}>結果</p>
              <h2>{winner.name}</h2>
              <p className={styles.epithet}>{winner.epithet}</p>
              <div className={styles.traits}>
                {winner.traits.map((trait) => <span key={trait}>{trait}</span>)}
              </div>
              <p className={styles.description}>{winner.description}</p>

              <ResultCardGenerator
                scriptTitle="寒門"
                characterName={winner.name}
                characterImage={winner.image}
                quote={winner.description}
                playerName={playerName}
                theme="hanmen"
                accent="#e7bd67"
                secondary="#9f3022"
              />

              <div className={styles.ranking}>
                {ranking.map((character, index) => (
                  <div
                    key={character.name}
                    className={`${styles.rankRow} ${index === 0 ? styles.rankWinner : ''}`}
                  >
                    <span>{character.name}</span>
                    <div className={styles.rankTrack}>
                      <div
                        style={{ width: `${Math.max(8, (character.score / Math.max(1, winner.score)) * 100)}%` }}
                      />
                    </div>
                    <strong>{character.score}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.controls}>
                <button type="button" className={styles.secondaryButton} onClick={previous}>
                  回上一題
                </button>
                <button type="button" className={styles.primaryButton} onClick={restart}>
                  重新測驗
                </button>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
