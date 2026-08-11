import {
  adminJson,
  createCoverUpload,
  readAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  scriptAdminErrorResponse,
} from '@/lib/script-admin';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    requireSafeMutationOrigin(request);
    const { adminClient, actor } = await requireScriptAdmin();
    const body = await readAdminJson(request);
    const upload = await createCoverUpload(adminClient, actor, {
      contentType: body.contentType,
      size: body.size ?? body.fileSize,
    });
    return adminJson({ upload });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
