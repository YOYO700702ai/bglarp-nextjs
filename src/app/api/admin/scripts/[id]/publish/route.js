import {
  adminJson,
  publishCatalogScript,
  readOptionalAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  requireUuid,
  revalidatePublishedScript,
  scriptAdminErrorResponse,
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
    const versionId = body.versionId || body.draftVersionId || null;
    if (versionId) requireUuid(versionId, 'versionId');
    const versionNumber = body.draftVersion ?? null;
    if (versionNumber !== null && (!Number.isInteger(versionNumber) || versionNumber < 1)) {
      throw invalidRequest('草稿版本格式不正確。', { draftVersion: '必須是正整數' });
    }

    const result = await publishCatalogScript(
      adminClient,
      actor,
      scriptId,
      versionId,
      versionNumber,
    );
    revalidatePublishedScript(result.script);
    return adminJson({ script: result.script });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
