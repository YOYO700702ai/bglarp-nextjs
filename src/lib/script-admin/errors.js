import { SupabaseServerConfigurationError } from '@/lib/supabase/server';

const SAFE_DEFAULT_MESSAGE = '後台暫時無法處理，請稍後再試。';

export class ScriptAdminError extends Error {
  constructor(code, message, status = 500, options = {}) {
    super(message);
    this.name = 'ScriptAdminError';
    this.code = code;
    this.status = status;
    this.fields = options.fields || null;
  }
}

export function invalidRequest(message = '請求內容格式不正確。', fields) {
  return new ScriptAdminError('invalid_request', message, 400, { fields });
}

export function unauthenticated() {
  return new ScriptAdminError('unauthenticated', '請先登入後再操作。', 401);
}

export function forbidden() {
  return new ScriptAdminError('forbidden', '你沒有執行此操作的權限。', 403);
}

export function notFound() {
  return new ScriptAdminError('not_found', '找不到指定的劇本資料。', 404);
}

export function conflict(message = '資料已被更新，請重新整理後再試。') {
  return new ScriptAdminError('conflict', message, 409);
}

export function unavailable(message = '後台服務尚未完成設定。') {
  return new ScriptAdminError('unavailable', message, 503);
}

export function databaseError(operation, error) {
  console.error(`[script-admin] ${operation} failed`, {
    code: error?.code || 'unknown',
  });
  return new ScriptAdminError('database_error', SAFE_DEFAULT_MESSAGE, 500);
}

export function normalizeScriptAdminError(error) {
  if (error instanceof ScriptAdminError) return error;
  if (error instanceof SupabaseServerConfigurationError) return unavailable();

  console.error('[script-admin] unexpected server error', {
    name: error?.name || 'Error',
  });
  return new ScriptAdminError('internal_error', SAFE_DEFAULT_MESSAGE, 500);
}
