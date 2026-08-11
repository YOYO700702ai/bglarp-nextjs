import { cache } from 'react';
import {
  getPublishedScriptsFromSupabase,
  shouldReadPublishedCatalog,
} from '@/lib/publishedScripts';

async function fetchNotionPages() {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.DATABASE_ID;
  if (!token || !dbId) return [];

  const url = `https://api.notion.com/v1/databases/${dbId}/query`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  let pages = [];
  let hasMore = true;
  let nextCursor = null;

  while (hasMore) {
    const payload = { page_size: 100 };
    if (nextCursor) payload.start_cursor = nextCursor;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      throw new Error(`Notion catalog request failed with status ${res.status}.`);
    }

    const data = await res.json();
    if (!Array.isArray(data.results)) {
      throw new Error('Notion catalog returned an invalid response.');
    }

    pages = pages.concat(data.results);
    hasMore = data.has_more || false;
    nextCursor = data.next_cursor;
  }
  return pages;
}

function getText(props, key, isTitle = false) {
  const type = isTitle ? 'title' : 'rich_text';
  const arr = props?.[key]?.[type] || [];
  return arr.map(x => x.plain_text || '').join('');
}

export async function getAllScriptsFromNotion() {
  const pages = await fetchNotionPages();
  const demoteToBottom = new Set(['血色牌局', '安生', '灰鼠之冬']);
  const getName = p => (p.properties?.['劇本名稱']?.title || []).map(x => x.plain_text || '').join('');
  pages.sort((a, b) => {
    const aDemote = demoteToBottom.has(getName(a));
    const bDemote = demoteToBottom.has(getName(b));
    if (aDemote !== bDemote) return aDemote ? 1 : -1;
    return new Date(b.created_time) - new Date(a.created_time);
  });
  return pages.map(p => {
    const props = p.properties || {};
    const name = getText(props, '劇本名稱', true) || '未命名';
    const synopsis = getText(props, '劇情簡介');
    const charMulti = props['角色']?.multi_select || [];
    const charRich = getText(props, '角色');
    const characters = charMulti.length > 0 ? charMulti.map(o => o.name).join('\n') : charRich;
    const genreMulti = (props['類型']?.multi_select || []).map(o => o.name);
    const customTags = getText(props, '類型標籤');
    const genreText = customTags.split(/[,\/、.。·\s]+/).map(s => s.trim()).filter(Boolean);
    const genre = [...new Set([...genreMulti, ...genreText])];
    const duration = getText(props, '時長');
    const notionPrice = props['價格']?.number;
    const price = typeof notionPrice === 'number' ? notionPrice : null;
    const priceStatus = price === 0 ? 'free' : (price !== null ? 'fixed' : 'tbd');
    const players = (props['人數']?.multi_select || []).map(o => o.name);
    const coverObj = p.cover || {};
    let image = null;
    if (coverObj.type === 'external') image = coverObj.external?.url || null;
    else if (coverObj.type === 'file') image = coverObj.file?.url || null;
    // Keep Notion's page ID: names can change, but linked systems must stay
    // attached to the same script even after a title edit.
    return {
      scriptId: p.id,
      name,
      synopsis,
      characters,
      genre,
      customTags,
      duration,
      price,
      priceStatus,
      players,
      image,
    };
  });
}

async function loadAllScripts() {
  if (shouldReadPublishedCatalog()) {
    // Once cut over, an automatic Notion fallback could re-publish a script
    // whose Notion unpublish job is still pending. Throwing lets ISR/CDN keep
    // serving the last successful snapshot. An operator can deliberately set
    // SCRIPT_CATALOG_SOURCE=notion when a manual fallback is appropriate.
    return getPublishedScriptsFromSupabase();
  }

  return getAllScriptsFromNotion();
}

// Metadata and page rendering can request the same catalog in one server
// render. React cache deduplicates that work without adding another Vercel
// revalidation schedule.
export const getAllScripts = cache(loadAllScripts);
