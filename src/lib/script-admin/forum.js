import { FORUM_SCRIPT_TABLE, SCRIPT_TABLE } from './constants';
import { databaseError } from './errors';

export async function ensureForumScript(adminClient, script, version, isActive) {
  const now = new Date().toISOString();
  const notionPageId = script.notion_page_id || `catalog:${script.id}`;
  let forumId = script.forum_script_id;

  if (forumId) {
    const { data, error } = await adminClient
      .from(FORUM_SCRIPT_TABLE)
      .update({
        notion_page_id: notionPageId,
        title: version.content.name,
        is_active: isActive,
        synced_at: now,
      })
      .eq('id', forumId)
      .select('id')
      .maybeSingle();
    if (error) throw databaseError('update forum catalog script', error);
    if (data) return forumId;
    forumId = null;
  }

  const { data: forum, error: forumError } = await adminClient
    .from(FORUM_SCRIPT_TABLE)
    .upsert({
      notion_page_id: notionPageId,
      title: version.content.name,
      is_active: isActive,
      synced_at: now,
    }, { onConflict: 'notion_page_id' })
    .select('id')
    .single();
  if (forumError) throw databaseError('upsert forum catalog script', forumError);

  const { error: linkError } = await adminClient
    .from(SCRIPT_TABLE)
    .update({ forum_script_id: forum.id })
    .eq('id', script.id);
  if (linkError) throw databaseError('link forum catalog script', linkError);
  return forum.id;
}
