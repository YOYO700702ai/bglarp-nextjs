export const SCRIPT_ADMIN_ROLES = Object.freeze(['editor', 'publisher', 'admin']);
export const SCRIPT_PUBLISH_ROLES = Object.freeze(['publisher', 'admin']);

export const SCRIPT_STATUSES = Object.freeze(['draft', 'published', 'unpublished']);
export const SCRIPT_SOURCES = Object.freeze(['human', 'ai', 'import']);

export const SCRIPT_TABLE = 'catalog_scripts';
export const SCRIPT_VERSION_TABLE = 'catalog_script_versions';
export const SCRIPT_ADMIN_USER_TABLE = 'script_admin_users';
export const SCRIPT_SYNC_JOB_TABLE = 'script_sync_jobs';
export const SCRIPT_AUDIT_TABLE = 'script_audit_log';
export const FORUM_SCRIPT_TABLE = 'forum_scripts';

export const SCRIPT_COLUMNS = [
  'id',
  'slug',
  'status',
  'draft_version_id',
  'published_version_id',
  'notion_page_id',
  'forum_script_id',
  'published_at',
  'updated_at',
].join(',');

export const SCRIPT_VERSION_COLUMNS = [
  'id',
  'script_id',
  'version_no',
  'content',
  'source',
  'idempotency_key',
  'created_at',
].join(',');

export const SCRIPT_SYNC_JOB_COLUMNS = [
  'id',
  'script_id',
  'version_id',
  'target',
  'action',
  'status',
  'attempts',
  'last_error',
  'next_attempt_at',
  'created_at',
  'updated_at',
].join(',');

export const DEFAULT_COVER_BUCKET = 'script-covers';
export const DEFAULT_COVER_MAX_BYTES = 8 * 1024 * 1024;
