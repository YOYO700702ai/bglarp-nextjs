import { getAllScripts } from '@/lib/scripts';

export default async function sitemap() {
  const base = 'https://www.bglarp.com';
  const scripts = await getAllScripts();

  const scriptUrls = scripts.map(s => ({
    url: `${base}/scripts/${encodeURIComponent(s.name)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/hanmen-quiz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/evil-flower-quiz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${base}/comet-yuanwu-quiz`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...scriptUrls,
  ];
}
