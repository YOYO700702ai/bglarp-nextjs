import {
  adminJson,
  createDraftScript,
  extractScriptContentInput,
  listCatalogScripts,
  normalizeIdempotencyKey,
  readAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  scriptAdminErrorResponse,
} from '@/lib/script-admin';

export const runtime = 'nodejs';

function queryInteger(value, fallback, field, { min = 0, max = 100 } = {}) {
  if (value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    const error = new Error(`「${field}」格式不正確。`);
    error.code = 'route_invalid_integer';
    throw error;
  }
  return number;
}

export async function GET(request) {
  try {
    const { adminClient } = await requireScriptAdmin();
    const limit = queryInteger(request.nextUrl.searchParams.get('limit'), 50, 'limit', { min: 1, max: 100 });
    const offset = queryInteger(request.nextUrl.searchParams.get('offset'), 0, 'offset', {
      min: 0,
      max: 100000,
    });
    const result = await listCatalogScripts(adminClient, {
      limit,
      offset,
      status: request.nextUrl.searchParams.get('status') || null,
    });
    return adminJson(result);
  } catch (error) {
    if (error?.code === 'route_invalid_integer') {
      return adminJson({ error: error.message, code: 'invalid_request' }, { status: 400 });
    }
    return scriptAdminErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    requireSafeMutationOrigin(request);
    const { adminClient, actor } = await requireScriptAdmin();
    const body = await readAdminJson(request);
    const idempotencyKey = normalizeIdempotencyKey(request.headers.get('idempotency-key'));
    const result = await createDraftScript(adminClient, actor, {
      slug: body.slug,
      content: extractScriptContentInput(body),
    }, {
      idempotencyKey,
      source: 'human',
    });
    return adminJson({ script: result.script }, {
      status: result.idempotentReplay ? 200 : 201,
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
