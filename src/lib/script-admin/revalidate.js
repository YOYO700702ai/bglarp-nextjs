import { revalidatePath } from 'next/cache';

export function revalidatePublishedScript(script) {
  revalidatePath('/');
  revalidatePath('/api/scripts');
  revalidatePath('/sitemap.xml');

  const detailKeys = new Set([script.slug, script.name].filter(Boolean));
  detailKeys.forEach((key) => {
    revalidatePath(`/scripts/${encodeURIComponent(key)}`);
  });
}
