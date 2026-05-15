const EXPERIENCES = [
  {
    match: ['寒門'],
    label: '心測',
    url: '/hanmen-quiz',
    characterImages: {
      '蕭凌風': '/hanmen-quiz/characters/蕭凌風.jpg',
      '修璟': '/hanmen-quiz/characters/修璟.jpg',
      '云清明': '/hanmen-quiz/characters/云清明.jpg',
      '宣萱': '/hanmen-quiz/characters/宣萱.jpg',
      '莫辭': '/hanmen-quiz/characters/莫辭.jpg',
      '容雪鳶': '/hanmen-quiz/characters/容雪鳶.jpg',
    },
  },
  {
    match: ['惡之華'],
    label: '心測',
    url: '/evil-flower-quiz',
    characterImages: {
      '萬寶路': '/evil-flower-quiz/characters/wanbaolu.jpg',
      '核彈': '/evil-flower-quiz/characters/hedan.jpg',
      '匹諾曹': '/evil-flower-quiz/characters/pinuocao.jpg',
      '氏子': '/evil-flower-quiz/characters/shizi.jpg',
      '阿而': '/evil-flower-quiz/characters/aer.jpg',
      '玻璃糖': '/evil-flower-quiz/characters/bolitang.jpg',
    },
  },
  {
    match: ['彗星掠過鳶屋時', '彗星掠过鸢屋时', '鳶屋', '鸢屋'],
    label: '心測',
    url: '/comet-yuanwu-quiz',
    characterImages: {
      '愛山': '/comet-yuanwu-quiz/characters/aishan.jpg',
      '利根川': '/comet-yuanwu-quiz/characters/tonegawa.jpg',
      '越前': '/comet-yuanwu-quiz/characters/echizen.jpg',
      '真蒲': '/comet-yuanwu-quiz/characters/ayame.jpg',
      '小糊塗': '/comet-yuanwu-quiz/characters/kohutou.jpg',
      '令子': '/comet-yuanwu-quiz/characters/reiko.jpg',
    },
  },
  {
    match: ['塑料溫室', '塑料温室'],
    label: '心測',
    url: 'https://del110931-cmd.github.io/plastik-quiz/',
  },
  {
    match: ['焚心'],
    label: '心測',
    url: 'https://del110931-cmd.github.io/fenxin/',
  },
];

function normalizeName(name = '') {
  return String(name).replace(/\s+/g, '');
}

export function getScriptExperience(name) {
  const normalized = normalizeName(name);
  return EXPERIENCES.find(item =>
    item.match.some(alias => normalized.includes(normalizeName(alias)))
  ) || null;
}

export function getCharacterImage(scriptName, characterName) {
  const exp = getScriptExperience(scriptName);
  if (!exp || !exp.characterImages) return null;
  const trimmed = String(characterName || '').trim();
  if (exp.characterImages[trimmed]) return exp.characterImages[trimmed];
  // Fallback: match by includes (handle 「無常：男」 format)
  for (const [key, url] of Object.entries(exp.characterImages)) {
    if (trimmed.includes(key)) return url;
  }
  return null;
}
