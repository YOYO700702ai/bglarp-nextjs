export const SOURCE_LABELS = Object.freeze({ direct: '直接／無來源', google: 'Google', facebook: 'Facebook', instagram: 'Instagram', line: 'LINE', other: '其他來源' });
export const DEVICE_LABELS = Object.freeze({ mobile: '手機', tablet: '平板', desktop: '電腦' });
export const SOURCE_KEYS = Object.keys(SOURCE_LABELS);
export const DEVICE_KEYS = Object.keys(DEVICE_LABELS);
const PAGES = Object.freeze({ '/': '官網首頁', '/guide': '新手指南', '/team-building': '企業團建', '/taichung/booking': '預約資訊', '/hanmen-quiz': '寒門心測', '/evil-flower-quiz': '惡之華心測', '/comet-yuanwu-quiz': '彗星掠過鳶屋時心測', '/no-more-heartbreak-quiz': '沒頭腦東西不傷心心測', '/qiuji-quiz': '求己心測' });
export const TARGET_LABELS = Object.freeze({
  'booking:messenger': 'Messenger 預約', 'booking:october': '十月活動預約', 'booking:facebook': 'Facebook 預約',
  'booking:phone': '電話聯絡', 'line:friend': '加入官方 LINE', 'line:member': '開啟 LINE 會員卡',
  'activity:member': '會員活動辦法', 'activity:video': '活動影片播放',
  'tab:showing': '現正熱映分頁', 'tab:flagship': '旗艦劇本分頁', 'tab:quiz': '心測專區分頁', 'tab:activity': '最新活動分頁',
  'social:facebook': 'Facebook', 'social:instagram': 'Instagram', 'contact:map': '查看地圖',
});

export function taipeiDay(date = new Date()) {
  return new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Only public content paths are accepted. Never retain query strings, fragments or free-form input.
export function normalizePage(value) {
  if (typeof value !== 'string' || value.length > 1200 || /[?#\\\s]/u.test(value)) return null;
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  const path = decoded === '/' ? '/' : decoded.replace(/\/$/, '');
  if (Object.hasOwn(PAGES, path)) return path;
  if (/^\/scripts\/[^/\\?#\u0000-\u001f\u007f]{1,150}$/u.test(path) && !/\/\.{1,2}$/.test(path)) return path;
  return null;
}

export function normalizeTarget(value) {
  if (typeof value !== 'string') return null;
  if (Object.hasOwn(TARGET_LABELS, value)) return value;
  for (const prefix of ['script:', 'page:']) {
    if (value.startsWith(prefix)) {
      const page = normalizePage(value.slice(prefix.length));
      if (page && (prefix !== 'script:' || page.startsWith('/scripts/'))) return `${prefix}${page}`;
    }
  }
  return null;
}

export function pageLabel(path) {
  return PAGES[path] || (path?.startsWith('/scripts/') ? path.slice('/scripts/'.length) : path) || '未知頁面';
}
export function targetLabel(target) {
  if (TARGET_LABELS[target]) return TARGET_LABELS[target];
  if (target?.startsWith('script:')) return `劇本卡片：${pageLabel(target.slice(7))}`;
  if (target?.startsWith('page:')) return `前往${pageLabel(target.slice(5))}`;
  return '其他點擊';
}

export function sourceFromLocation(href, referrer, origin) {
  const classify = value => {
    const source = value.toLowerCase();
    if (/^(google|googleads|adwords)$/.test(source) || /(^|\.)google\.[a-z.]+$/.test(source)) return 'google';
    if (/^(facebook|fb|meta)$/.test(source) || /(^|\.)(facebook\.com|fb\.com)$/.test(source)) return 'facebook';
    if (/^(instagram|ig)$/.test(source) || /(^|\.)instagram\.com$/.test(source)) return 'instagram';
    if (source === 'line' || /(^|\.)(line\.me|lin\.ee)$/.test(source)) return 'line';
    return 'other';
  };
  try {
    const url = new URL(href);
    const utm = url.searchParams.get('utm_source');
    if (utm) return classify(utm);
    if (!referrer) return 'direct';
    const ref = new URL(referrer);
    return ref.origin === origin ? 'direct' : classify(ref.hostname);
  } catch { return 'direct'; }
}

export function targetFromHref(href, origin) {
  if (typeof href !== 'string') return null;
  if (href.startsWith('tel:')) return 'booking:phone';
  try {
    const url = new URL(href, origin);
    if (url.origin === origin) {
      const tabs = { '#scripts': 'tab:showing', '#scripts-flagship': 'tab:flagship', '#quiz': 'tab:quiz', '#scripts-limited': 'tab:activity', '#scripts-booking': 'tab:activity' };
      if (url.pathname === '/' && tabs[url.hash]) return tabs[url.hash];
      if (url.hash) return null;
      const page = normalizePage(url.pathname);
      return page ? `${page.startsWith('/scripts/') ? 'script' : 'page'}:${page}` : null;
    }
    if (url.hostname === 'm.me') return 'booking:messenger';
    if (url.hostname === 'liff.line.me') return 'line:member';
    if (['lin.ee', 'line.me'].includes(url.hostname)) return 'line:friend';
    if (/(^|\.)facebook\.com$/.test(url.hostname)) return 'social:facebook';
    if (/(^|\.)instagram\.com$/.test(url.hostname)) return 'social:instagram';
    if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'maps.google.com' || (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith('/maps'))) return 'contact:map';
  } catch { /* Non-URL links are intentionally ignored. */ }
  return null;
}
