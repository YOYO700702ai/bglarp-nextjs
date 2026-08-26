import {
  FLAGSHIP_PRICE_MIN,
  FLAGSHIP_SCRIPT_LABEL,
  isFlagshipScript,
} from '@/lib/scriptClassification';

export const SITE_URL = 'https://www.bglarp.com';

export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const GROUP_BOOKING_SERVICE_ID = `${SITE_URL}/#group-booking-service`;
export const BUSINESS_HOURS_TEXT = '週一至週五 12:00–22:00；週六、週日 10:00–22:00';

export const PLAYER_FAQS = [
  {
    question: '劇本殺是什麼？第一次玩需要先準備嗎？',
    answer: '劇本殺是由玩家分別扮演故事角色，透過閱讀、交流、推理與演繹，一起找出事件真相或完成角色目標的沉浸式遊戲。第一次玩不需要預習；可以先從官網標示「新手」的劇本開始，或在預約時告訴我們是新手，我們會依人數與喜好推薦適合、價格好入門的劇本，再由親切、專業的 GM 帶領遊戲。',
  },
  {
    question: '怎麼選適合自己的劇本？',
    answer: '先確認同行人數，再決定偏好推理還原、情感沉浸、歡樂互動或陣營對抗，最後確認可接受的遊戲時間與價格。官方新手推薦以劇本卡及詳細頁顯示的「新手」標籤為準，名單會隨上映內容更新；無法決定時也可以在預約訊息中請我們推薦。',
  },
  {
    question: '一場需要幾位玩家？人數不足可以玩嗎？',
    answer: '每本劇本需要的人數不同，玩家需自行組滿該劇本頁面標示的人數；單人或人數不足無法直接開場。如果尚未組滿，可以提早私訊店家詢問相關揪團群組資訊，但不保證一定能成團。',
  },
  {
    question: '遊戲時間與費用是多少？',
    answer: `一般新手劇本每人約 NT$450–600；每人 NT$${FLAGSHIP_PRICE_MIN}（含）以上歸類為旗艦劇本，目前最高約 NT$2,200。演員 NPC 配置、遊戲時長與實際費用請以個別劇本頁及預約確認為準。`,
  },
  {
    question: '要提前多久預約？怎麼預約？',
    answer: 'BGLARP 採全預約制，建議至少提前 3 天，透過 BGLARP Facebook 專頁私訊或致電（04）2225-0020 預約。預約時請提供日期、時段、人數，以及想玩的劇本或偏好類型；店家透過訊息回覆確認場次後，預約才算成立。',
  },
  {
    question: '玩劇本殺需要自己準備服裝嗎？',
    answer: '不一定。部分場次會提供相應時代風格的服裝，其他劇本則不需要特殊服裝。請查看個別劇本頁的說明，或在預約時向我們確認。',
  },
  {
    question: 'BGLARP 在哪裡？',
    answer: 'BGLARP 實境推理館位於台中市北區太平路 19 巷 1 號 3 樓，鄰近一中街商圈。場館僅能走樓梯抵達，建議提早 5 分鐘到場，預留上樓與場前準備時間。',
  },
];

export const BOOKING_FAQS = [
  {
    question: '營業時間與客服回覆時間是什麼時候？',
    answer: `${BUSINESS_HOURS_TEXT}。BGLARP 採全預約制，特殊假日如有異動，以店家公告與預約回覆為準；客服訊息的實際回覆時間也以店家回覆為準。`,
  },
  {
    question: '附近可以停車嗎？',
    answer: 'BGLARP 沒有合作停車場。場館正對面及附近有民營收費停車場，其中鄰近一處目前為每小時 NT$20；費率與空位可能變動，請以停車場現場公告為準。',
  },
  {
    question: '可以舉辦生日、包場、公司或學校團體活動嗎？',
    answer: '可以。BGLARP 承接生日聚會、朋友私人包場、公司團建與校園社團活動；可安排的劇本、人數、時段與費用請先私訊確認。',
  },
  {
    question: '傳送預約訊息後，場次就成立了嗎？',
    answer: '還沒有。收到店家訊息回覆並確認場次後，預約才算成立。',
  },
  {
    question: '預約後可以取消或改期嗎？',
    answer: '取消或改期會依場次與實際情況個別處理，請儘早聯絡店家確認。',
  },
  {
    question: '玩家遲到會怎麼處理？',
    answer: '會依劇本流程與當日排程處理，可能縮短遊戲時間；尖峰假日若影響後續場次，也可能取消場次。若可能遲到，請儘早聯絡店家。',
  },
  {
    question: '玩家有年齡限制嗎？',
    answer: '原則上至少 12 歲；少數劇本限制 18 歲以上。適用年齡依各劇本規定，預約時請向店家再次確認。',
  },
  {
    question: '恐怖、NPC／肢體互動或敏感內容會事先提醒嗎？',
    answer: '如劇本涉及恐怖、NPC／肢體互動或其他需注意內容，店家會在預約與場次確認過程中提醒；如有在意的內容，請在選本前先提出。',
  },
  {
    question: '場館有電梯嗎？',
    answer: '沒有。BGLARP 位於 3 樓，僅能由樓梯抵達；如有行動需求，請在預約前先評估。',
  },
];

const GUIDE_FAQS = [...PLAYER_FAQS, ...BOOKING_FAQS];

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
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Monday',
        'https://schema.org/Tuesday',
        'https://schema.org/Wednesday',
        'https://schema.org/Thursday',
        'https://schema.org/Friday',
      ],
      opens: '12:00',
      closes: '22:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Saturday',
        'https://schema.org/Sunday',
      ],
      opens: '10:00',
      closes: '22:00',
    },
  ],
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

const groupBookingServiceJsonLd = {
  '@type': 'Service',
  '@id': GROUP_BOOKING_SERVICE_ID,
  name: 'BGLARP 劇本殺團體預約',
  description: 'BGLARP 承接生日聚會、私人包場、公司團建與校園社團活動，可安排內容以店家訊息回覆為準。',
  serviceType: ['生日聚會', '私人包場', '公司團建', '校園社團活動'],
  provider: { '@id': BUSINESS_ID },
  areaServed: {
    '@type': 'City',
    name: '台中市',
  },
  url: `${SITE_URL}/taichung/booking`,
};

export const ROOT_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    businessJsonLd,
    groupBookingServiceJsonLd,
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

const GUIDE_PAGE_URL = `${SITE_URL}/guide`;
const GUIDE_FAQ_ID = `${GUIDE_PAGE_URL}#faq`;

export const GUIDE_PAGE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${GUIDE_PAGE_URL}#webpage`,
      url: GUIDE_PAGE_URL,
      name: '劇本殺新手指南 | BGLARP 實境推理館',
      description: '第一次玩劇本殺，從人數、喜好、時間與價格開始挑選，並查看 BGLARP 玩家、預約與到店常見問題。',
      inLanguage: 'zh-Hant-TW',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': GUIDE_FAQ_ID },
    },
    {
      '@type': 'FAQPage',
      '@id': GUIDE_FAQ_ID,
      url: GUIDE_PAGE_URL,
      inLanguage: 'zh-Hant-TW',
      mainEntity: GUIDE_FAQS.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${GUIDE_PAGE_URL}#breadcrumb`,
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
          name: '新手指南',
          item: GUIDE_PAGE_URL,
        },
      ],
    },
  ],
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
      description: 'BGLARP 採全預約制，建議至少提前 3 天私訊或致電，提供日期、時段、人數與劇本偏好；店家訊息回覆確認後，預約才算成立。',
      inLanguage: 'zh-Hant-TW',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': BUSINESS_ID },
      mainEntity: { '@id': GROUP_BOOKING_SERVICE_ID },
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
