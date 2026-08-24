import {
  FLAGSHIP_PRICE_MIN,
  FLAGSHIP_SCRIPT_LABEL,
  isFlagshipScript,
} from '@/lib/scriptClassification';

export const SITE_URL = 'https://www.bglarp.com';

export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const PLAYER_FAQS = [
  {
    question: '劇本殺是什麼？第一次玩需要先準備嗎？',
    answer: '劇本殺是由玩家分別扮演故事角色，透過閱讀、交流、推理與演繹，一起找出事件真相或完成角色目標的沉浸式遊戲。第一次玩不需要預習；預約時告訴我們是新手，我們會依人數與喜好推薦適合、價格好入門的劇本，再由親切、專業的 GM 帶領遊戲。',
  },
  {
    question: '怎麼選適合自己的劇本？',
    answer: '先確認同行人數，再決定偏好推理還原、情感沉浸、歡樂互動或陣營對抗，最後確認可接受的遊戲時間與價格。BGLARP 每本劇本頁都會標示人數、類型、預估時長與收費，無法決定時也可以在預約訊息中請我們推薦。',
  },
  {
    question: '一場需要幾位玩家？人數不足可以玩嗎？',
    answer: '每本劇本需要的人數不同，請以該劇本頁面顯示的人數限制為準。劇本的角色數通常與玩家人數相對應；如果尚未確定人數，建議先私訊告知目前人數，再一起挑選可安排的劇本。',
  },
  {
    question: '遊戲時間與費用是多少？',
    answer: `一般新手劇本每人約 NT$450–600；每人 NT$${FLAGSHIP_PRICE_MIN}（含）以上歸類為旗艦劇本，目前最高約 NT$2,200。演員 NPC 配置、遊戲時長與實際費用請以個別劇本頁及預約確認為準。`,
  },
  {
    question: '要提前多久預約？怎麼預約？',
    answer: 'BGLARP 採全預約制，建議至少提前 3 天，透過 BGLARP Facebook 專頁私訊或致電（04）2225-0020 預約。預約時請提供日期、時段、人數，以及想玩的劇本或偏好類型。',
  },
  {
    question: '玩劇本殺需要自己準備服裝嗎？',
    answer: '不一定。部分場次會提供相應時代風格的服裝，其他劇本則不需要特殊服裝。請查看個別劇本頁的說明，或在預約時向我們確認。',
  },
  {
    question: 'BGLARP 在哪裡？',
    answer: 'BGLARP 實境推理館位於台中市北區太平路 19 巷 1 號 3 樓，鄰近一中街商圈。建議提早 5 分鐘抵達，預留上樓與場前準備時間。',
  },
];

const businessJsonLd = {
  '@type': 'EntertainmentBusiness',
  '@id': BUSINESS_ID,
  name: 'BGLARP 實境推理館',
  alternateName: 'BGLARP',
  description: '台中一中街全預約制實境推理體驗，提供新手友善的選本協助、親切專業的 GM 帶場，以及一般新手劇本每人約 NT$450–600 的入門選擇。',
  url: SITE_URL,
  telephone: '+886-4-2225-0020',
  image: `${SITE_URL}/hero-cover.jpg`,
  priceRange: 'NT$450–2,200／人',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '北區太平路19巷1號3樓',
    addressLocality: '台中市',
    addressRegion: '台中市',
    addressCountry: 'TW',
  },
  areaServed: {
    '@type': 'City',
    name: '台中市',
  },
  hasMap: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%8C%97%E5%8D%80%E5%A4%AA%E5%B9%B3%E8%B7%AF19%E5%B7%B71%E8%99%9F3%E6%A8%93',
  sameAs: [
    'https://www.facebook.com/bglarp.studio/',
    'https://www.instagram.com/bglarp.studio/',
  ],
  knowsAbout: ['劇本殺', '劇本殺新手推薦', '沉浸式劇場', '實境推理', '狼人殺', '陣營遊戲'],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+886-4-2225-0020',
    contactType: 'reservations',
    availableLanguage: ['zh-Hant'],
  },
};

export const ROOT_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    businessJsonLd,
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: 'BGLARP 實境推理館',
      inLanguage: 'zh-Hant-TW',
      publisher: { '@id': BUSINESS_ID },
    },
  ],
};

export const HOME_FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#player-faq`,
  url: `${SITE_URL}/#guide`,
  inLanguage: 'zh-Hant-TW',
  mainEntity: PLAYER_FAQS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
};

function structuredImageUrl(value) {
  if (!value) return undefined;

  try {
    const url = new URL(value, SITE_URL);
    const isBglarpAsset = url.hostname === 'www.bglarp.com' || url.hostname === 'bglarp.com';
    const isPublicSupabaseAsset = url.hostname.endsWith('.supabase.co')
      && url.pathname.includes('/storage/v1/object/public/');
    return isBglarpAsset || isPublicSupabaseAsset ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function cleanText(value, fallback = '') {
  const normalized = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

export function buildScriptDirectoryJsonLd(scripts) {
  const pageUrl = `${SITE_URL}/scripts`;
  const items = scripts.map((card, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: cleanText(card.name, '未命名劇本'),
    url: `${SITE_URL}/scripts/${encodeURIComponent(card.slug || card.name)}`,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: '台中劇本殺劇本目錄 | BGLARP 實境推理館',
        description: '瀏覽 BGLARP 實境推理館的上映劇本，查看人數、類型、時長、價格與劇情簡介。',
        inLanguage: 'zh-Hant-TW',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': `${pageUrl}#list` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#list`,
        name: 'BGLARP 上映劇本',
        numberOfItems: items.length,
        itemListElement: items,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BGLARP 首頁', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: '上映劇本', item: pageUrl },
        ],
      },
    ],
  };
}

export const BOOKING_PAGE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/taichung/booking#webpage`,
      url: `${SITE_URL}/taichung/booking`,
      name: '台中一中街劇本殺預約 | BGLARP 實境推理館',
      description: 'BGLARP 採全預約制，建議至少提前 3 天私訊或致電，提供日期、時段、人數與劇本偏好。',
      inLanguage: 'zh-Hant-TW',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': BUSINESS_ID },
      breadcrumb: { '@id': `${SITE_URL}/taichung/booking#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/taichung/booking#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'BGLARP 首頁', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '預約入戲', item: `${SITE_URL}/taichung/booking` },
      ],
    },
  ],
};

function playerAudience(values) {
  if (!Array.isArray(values)) return '';
  const labels = [...new Set(values.map(item => cleanText(item)).filter(Boolean))];
  if (!labels.length) return '';

  const numericPlayers = labels.map(label => {
    const match = label.match(/^(\d+)\s*人$/);
    return match ? Number(match[1]) : null;
  });

  if (numericPlayers.every(Number.isInteger)) {
    const sorted = [...new Set(numericPlayers)].sort((left, right) => left - right);
    if (sorted.length === 1) return `${sorted[0]} 人玩家`;
    const isContinuous = sorted.every((value, index) => index === 0 || value === sorted[index - 1] + 1);
    return isContinuous
      ? `${sorted[0]}–${sorted.at(-1)} 人玩家`
      : `${sorted.join('、')} 人玩家`;
  }

  return `${labels.join('、')}玩家`;
}

function scriptOffer(card, pageUrl) {
  const hasFixedPrice = card.priceStatus === 'free'
    || card.priceStatus === 'fixed'
    || (card.priceStatus == null && typeof card.price === 'number');
  if (!hasFixedPrice || typeof card.price !== 'number') return undefined;

  return {
    '@type': 'Offer',
    url: pageUrl,
    price: card.price,
    priceCurrency: 'TWD',
    seller: { '@id': BUSINESS_ID },
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: card.price,
      priceCurrency: 'TWD',
      unitText: '每人',
    },
  };
}

export function buildScriptJsonLd(card) {
  const routeKey = card.slug || card.name;
  const pageUrl = `${SITE_URL}/scripts/${encodeURIComponent(routeKey)}`;
  const description = cleanText(
    card.synopsis,
    `${card.name}，台中 BGLARP 實境推理館劇本殺體驗。`,
  );
  const players = playerAudience(card.players);
  const genres = Array.isArray(card.genre)
    ? card.genre.map(item => cleanText(item)).filter(Boolean)
    : [];
  const isFlagship = isFlagshipScript(card);
  const categories = isFlagship
    ? [...new Set([FLAGSHIP_SCRIPT_LABEL, ...genres])]
    : (genres.length ? genres : ['劇本殺', '實境推理']);

  const offer = scriptOffer(card, pageUrl);
  const stableImage = structuredImageUrl(card.image);
  const service = {
    '@type': 'Service',
    '@id': `${pageUrl}#service`,
    name: card.name,
    description,
    url: pageUrl,
    ...(stableImage ? { image: stableImage } : {}),
    serviceType: isFlagship
      ? `${FLAGSHIP_SCRIPT_LABEL}${genres.length ? `｜${genres.join('、')}` : ''}`
      : (genres.length ? genres.join('、') : '劇本殺沉浸式推理體驗'),
    category: categories,
    provider: { '@id': BUSINESS_ID },
    areaServed: {
      '@type': 'City',
      name: '台中市',
    },
    ...(players ? {
      audience: {
        '@type': 'Audience',
        audienceType: players,
      },
    } : {}),
    ...(offer ? { offers: offer } : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${card.name} | BGLARP 實境推理館`,
        description,
        inLanguage: 'zh-Hant-TW',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': `${pageUrl}#service` },
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      service,
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'BGLARP 首頁',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: card.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}
