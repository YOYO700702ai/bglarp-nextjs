import {
  adminJson,
  createDraftScript,
  extractScriptContentInput,
  normalizeIdempotencyKey,
  readAdminJson,
  requireSafeMutationOrigin,
  requireScriptAi,
  scriptAdminErrorResponse,
} from '@/lib/script-admin';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    requireSafeMutationOrigin(request, { allowBearerWithoutOrigin: true });
    const { adminClient, actor } = requireScriptAi(request);
    const body = await readAdminJson(request);
    const idempotencyKey = normalizeIdempotencyKey(
      request.headers.get('idempotency-key'),
      { required: true },
    );
    const result = await createDraftScript(adminClient, actor, {
      slug: body.slug,
      content: extractScriptContentInput(body),
    }, { idempotencyKey, source: 'ai' });

    return adminJson({ script: result.script }, {
      status: result.idempotentReplay ? 200 : 201,
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
