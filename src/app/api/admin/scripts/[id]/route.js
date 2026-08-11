import {
  adminJson,
  extractScriptContentInput,
  getCatalogScript,
  normalizeIdempotencyKey,
  readAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  requireUuid,
  scriptAdminErrorResponse,
  updateDraftScript,
} from '@/lib/script-admin';
import { invalidRequest } from '@/lib/script-admin/errors';

export const runtime = 'nodejs';

function expectedVersionNumber(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1) {
    throw invalidRequest('草稿版本格式不正確。', { draftVersion: '必須是正整數' });
  }
  return value;
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const scriptId = requireUuid(id);
    const { adminClient } = await requireScriptAdmin();
    return adminJson({ script: await getCatalogScript(adminClient, scriptId) });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}

export async function PATCH(request, context) {
  try {
    requireSafeMutationOrigin(request);
    const { id } = await context.params;
    const scriptId = requireUuid(id);
    const { adminClient, actor } = await requireScriptAdmin();
    const body = await readAdminJson(request);
    const versionId = body.expectedVersionId || body.draftVersionId || null;
    if (versionId) requireUuid(versionId, 'expectedVersionId');
    const result = await updateDraftScript(adminClient, actor, scriptId, {
      slug: body.slug,
      content: extractScriptContentInput(body),
      expectedVersionId: versionId,
      expectedVersionNumber: expectedVersionNumber(body.draftVersion),
    }, {
      idempotencyKey: normalizeIdempotencyKey(request.headers.get('idempotency-key')),
      source: 'human',
    });
    return adminJson({ script: result.script }, {
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
