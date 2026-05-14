const EXPERIENCES = [
  {
    match: ['寒門'],
    label: '心測',
    url: '/hanmen-quiz',
  },
  {
    match: ['惡之華'],
    label: '心測',
    url: '/evil-flower-quiz',
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
