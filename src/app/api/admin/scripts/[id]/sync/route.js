import {
  adminJson,
  readOptionalAdminJson,
  requireSafeMutationOrigin,
  requireScriptAdmin,
  requireUuid,
  retryCatalogScriptSync,
  scriptAdminErrorResponse,
} from '@/lib/script-admin';

export const runtime = 'nodejs';

export async function POST(request, context) {
  try {
    requireSafeMutationOrigin(request);
    const { id } = await context.params;
    const scriptId = requireUuid(id);
    const { adminClient } = await requireScriptAdmin(['publisher', 'admin']);
    await readOptionalAdminJson(request);
    const result = await retryCatalogScriptSync(adminClient, scriptId);
    return adminJson({ script: result.script });
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
