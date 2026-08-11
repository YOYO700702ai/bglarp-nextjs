import {
  adminJson,
  readOptionalAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  requireUuid,
  revalidatePublishedScript,
  scriptAdminErrorResponse,
  unpublishCatalogScript,
} from '@/lib/script-admin';
import { invalidRequest } from '@/lib/script-admin/errors';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    requireSafeMutationOrigin(request);
    const { id } = await context.params;
    const scriptId = requireUuid(id);
    const { adminClient, actor } = await requireScriptAdmin(['publisher', 'admin']);
    const body = await readOptionalAdminJson(request);
    if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
      throw invalidRequest('「reason」格式不正確。', { reason: '必須是文字' });
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length > 500) {
      throw invalidRequest('下架原因過長。', { reason: '最多 500 個字' });
    }
    const publishedVersion = body.publishedVersion ?? null;
    if (
      publishedVersion === null
      || !Number.isInteger(publishedVersion)
      || publishedVersion < 1
    ) {
      throw invalidRequest('正式版本格式不正確。', {
        publishedVersion: '必須是正整數',
      });
    }

    const result = await unpublishCatalogScript(
      adminClient,
      actor,
      scriptId,
      reason || null,
      publishedVersion,
    );
    revalidatePublishedScript(result.script);
    return adminJson({ script: result.script });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
