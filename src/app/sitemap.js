import { getAllScripts } from '@/lib/scripts';

export default async function sitemap() {
  const base = 'https://www.bglarp.com';
  const scripts = await getAllScripts();

  const scriptUrls = scripts.map(s => ({
    url: `${base}/scripts/${encodeURIComponent(s.slug || s.name)}`,
    lastModified: s.updatedAt || s.publishedAt
      ? new Date(s.updatedAt || s.publishedAt)
      : undefined,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: base,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/scripts`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/guide`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/taichung/booking`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/hanmen-quiz`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/evil-flower-quiz`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/comet-yuanwu-quiz`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/no-more-heartbreak-quiz`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/qiuji-quiz`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...scriptUrls,
  ];
}
