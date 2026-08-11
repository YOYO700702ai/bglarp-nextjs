import {
  adminJson,
  extractScriptContentInput,
  normalizeIdempotencyKey,
  readAdminJson,
  requireSafeMutationOrigin,
  requireScriptAi,
  requireUuid,
  scriptAdminErrorResponse,
  updateDraftScript,
} from '@/lib/script-admin';

export const runtime = 'nodejs';

export async function PATCH(request, context) {
  try {
    requireSafeMutationOrigin(request, { allowBearerWithoutOrigin: true });
    const { id } = await context.params;
    const scriptId = requireUuid(id);
    const { adminClient, actor } = requireScriptAi(request);
    const body = await readAdminJson(request);
    const idempotencyKey = normalizeIdempotencyKey(
      request.headers.get('idempotency-key'),
      { required: true },
    );
    const versionId = body.expectedVersionId || body.draftVersionId || null;
    if (versionId) requireUuid(versionId, 'expectedVersionId');
    const result = await updateDraftScript(adminClient, actor, scriptId, {
      slug: body.slug,
      content: extractScriptContentInput(body),
      expectedVersionId: versionId,
    }, { idempotencyKey, source: 'ai' });

    return adminJson({ script: result.script }, {
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
