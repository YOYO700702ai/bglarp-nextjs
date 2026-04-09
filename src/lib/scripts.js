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
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();
      pages = pages.concat(data.results || []);
      hasMore = data.has_more || false;
      nextCursor = data.next_cursor;
    } catch { break; }
  }
  return pages;
}

function getText(props, key, isTitle = false) {
  const type = isTitle ? 'title' : 'rich_text';
  const arr = props?.[key]?.[type] || [];
  return arr.map(x => x.plain_text || '').join('');
}

export async function getAllScripts() {
  const pages = await fetchNotionPages();
  return pages.map(p => {
    const props = p.properties || {};
    const name = getText(props, '劇本名稱', true) || '未命名';
    const synopsis = getText(props, '劇情簡介');
    const characters = getText(props, '角色');
    const genre = getText(props, '類型標籤').replace(/\//g, ',').replace(/、/g, ',').split(',').map(s => s.trim()).filter(Boolean);
    const duration = getText(props, '時長');
    const price = props['價格']?.number || null;
    const players = (props['人數']?.multi_select || []).map(o => o.name);
    const coverObj = p.cover || {};
    let image = null;
    if (coverObj.type === 'external') image = coverObj.external?.url || null;
    else if (coverObj.type === 'file') image = coverObj.file?.url || null;
    return { name, synopsis, characters, genre, customTags: '', duration, price, players, image };
  });
}
