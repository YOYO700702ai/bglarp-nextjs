import { getAllScripts } from '@/lib/scripts';

export default async function sitemap() {
  const base = 'https://bglarp-tw.com';
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
    ...scriptUrls,
  ];
}
