import { createClient } from '@supabase/supabase-js';

function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function playerOptions(minimum, maximum) {
  const min = Number.isInteger(minimum) ? minimum : null;
  const max = Number.isInteger(maximum) ? maximum : min;
  if (!min || min < 1 || !max || max < min) return [];

  // Existing cards expect the Notion-style array of individual player
  // options and derive the visible range from its smallest/largest number.
  return Array.from({ length: max - min + 1 }, (_, index) => `${min + index}人`);
}

function characterLines(characters) {
  if (!Array.isArray(characters)) return '';
  return characters
    .map((character) => {
      const name = String(character?.name || '').trim();
      const description = String(character?.description || '').trim();
      if (!name) return '';
      return description ? `${name}：${description}` : name;
    })
    .filter(Boolean)
    .join('\n');
}

export function mapPublishedCatalogRow(row) {
  const content = row?.content || {};
  const durationMinutes = Number.isInteger(content.durationMinutes)
    ? content.durationMinutes
    : null;
  const priceStatus = ['fixed', 'free', 'tbd'].includes(content.priceStatus)
    ? content.priceStatus
    : 'tbd';

  return {
    scriptId: row.notion_page_id || `catalog:${row.id}`,
    catalogId: row.id,
    slug: row.slug,
    name: String(content.name || '').trim() || '未命名',
    synopsis: String(content.synopsis || '').trim(),
    characters: characterLines(content.characters),
    genre: normalizeStringList(content.genres),
    customTags: normalizeStringList(content.customTags).join('、'),
    duration: String(content.durationLabel || '').trim()
      || (durationMinutes ? `${durationMinutes} 分鐘` : ''),
    durationMinutes,
    priceStatus,
    price: priceStatus === 'free'
      ? 0
      : (priceStatus === 'fixed' && Number.isFinite(content.price) ? content.price : null),
    players: playerOptions(content.playerMin, content.playerMax),
    playerMin: content.playerMin ?? null,
    playerMax: content.playerMax ?? null,
    image: content.cover?.url || null,
    cover: content.cover || null,
    sortOrder: Number.isFinite(content.sortOrder) ? content.sortOrder : 0,
    publishedAt: row.published_at || null,
    updatedAt: row.updated_at || row.published_at || null,
  };
}

export async function getPublishedScriptsFromSupabase() {
  const supabase = getPublicSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase public client is not configured.');
  }

  const { data, error } = await supabase
    .from('published_script_catalog')
    .select('id, notion_page_id, slug, published_at, updated_at, version_id, version_number, content');

  if (error) {
    throw new Error(`Unable to read the published script catalog: ${error.message}`);
  }

  return (data || [])
    .map(mapPublishedCatalogRow)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0);
    });
}

export function shouldReadPublishedCatalog() {
  return process.env.SCRIPT_CATALOG_SOURCE?.toLowerCase() === 'supabase';
}
