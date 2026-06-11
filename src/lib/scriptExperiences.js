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
      '完山': '/comet-yuanwu-quiz/characters/aishan.jpg',
      '利根川': '/comet-yuanwu-quiz/characters/tonegawa.jpg',
      '越前': '/comet-yuanwu-quiz/characters/echizen.jpg',
      '菖蒲': '/comet-yuanwu-quiz/characters/ayame.jpg',
      '小糊塗': '/comet-yuanwu-quiz/characters/kohutou.jpg',
      '令子': '/comet-yuanwu-quiz/characters/reiko.jpg',
    },
  },
  {
    match: ['求己'],
    label: '心測',
    url: '/qiuji-quiz',
    characterImages: {
      '趙明合': '/qiuji-quiz/cards/zhao-minghe-model-painted-card.jpg',
      '赵明合': '/qiuji-quiz/cards/zhao-minghe-model-painted-card.jpg',
      '即墨永康': '/qiuji-quiz/cards/jimo-yongkang-model-painted-card.jpg',
      '溫若儀': '/qiuji-quiz/cards/wen-ruoyi-model-painted-card.jpg',
      '温若仪': '/qiuji-quiz/cards/wen-ruoyi-model-painted-card.jpg',
      '艾憐': '/qiuji-quiz/cards/ai-lian-model-painted-card.jpg',
      '艾怜': '/qiuji-quiz/cards/ai-lian-model-painted-card.jpg',
      '沈千': '/qiuji-quiz/cards/shen-qian-model-painted-card.jpg',
      '雲依': '/qiuji-quiz/cards/yun-yi-model-painted-card.jpg',
      '云依': '/qiuji-quiz/cards/yun-yi-model-painted-card.jpg',
    },
  },
  {
    match: ['連環殺人犯那些事引發的血案', '连环杀人犯那些事引发的血案'],
    characterImages: {
      '變態': '/xueyan/characters/pervert.jpg',
      '渣男': '/xueyan/characters/jerk.jpg',
      '兇手': '/xueyan/characters/killer.jpg',
      '小三': '/xueyan/characters/mistress.jpg',
      '騙子': '/xueyan/characters/liar.jpg',
    },
  },
  {
    match: ['女巫請睜眼', '女巫请睁眼'],
    characterImages: {
      '巴頓': '/witch/characters/barton.jpg',
      '安德烈': '/witch/characters/andrei.jpg',
      '瑪德琳': '/witch/characters/madeline.jpg',
      '里西': '/witch/characters/leslie.jpg',
      '波琳娜': '/witch/characters/polina.jpg',
      '諾娜': '/witch/characters/nona.jpg',
    },
  },
  {
    match: ['幻方館謀殺奇境', '幻方馆谋杀奇境', '幻方館'],
    characterImages: {
      '武藤孝太': '/huanfangguan/characters/muto-takata.jpg',
      '武藤 孝太': '/huanfangguan/characters/muto-takata.jpg',
      '武藤楓': '/huanfangguan/characters/muto-kaede.jpg',
      '武藤 楓': '/huanfangguan/characters/muto-kaede.jpg',
      '紅谷拓也': '/huanfangguan/characters/benitani-takuya.jpg',
      '紅谷 拓也': '/huanfangguan/characters/benitani-takuya.jpg',
      '紅谷雅美': '/huanfangguan/characters/benitani-masami.jpg',
      '紅谷 雅美': '/huanfangguan/characters/benitani-masami.jpg',
      '竹間英助': '/huanfangguan/characters/takema-eisuke.jpg',
      '竹間 英助': '/huanfangguan/characters/takema-eisuke.jpg',
      '竹間明日香': '/huanfangguan/characters/takema-asuka.jpg',
      '竹間 明日香': '/huanfangguan/characters/takema-asuka.jpg',
    },
  },
  {
    match: ['沒頭腦東西不傷心', '没头脑东西不伤心'],
    label: '心測',
    url: '/no-more-heartbreak-quiz',
    characterImages: {
      '倒霉蛋': '/no-more-heartbreak-quiz/cards/cooler-card.jpg',
      '大聰明': '/no-more-heartbreak-quiz/cards/smart-card.jpg',
      '愛哭鬼': '/no-more-heartbreak-quiz/cards/crybaby-card.jpg',
      '瞌睡蟲': '/no-more-heartbreak-quiz/cards/sleepy-card.jpg',
      '黏人精': '/no-more-heartbreak-quiz/cards/clingy-card.jpg',
      '粘人精': '/no-more-heartbreak-quiz/cards/clingy-card.jpg',
      '開心果': '/no-more-heartbreak-quiz/cards/laugh-card.jpg',
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
