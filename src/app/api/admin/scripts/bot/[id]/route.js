import { adminJson } from '@/lib/script-admin/http';
import { requireUuid } from '@/lib/script-admin/validation';
import { botContext, botErrorResponse, getBotScript, patchBotDraft, readBotJson } from '@/lib/script-admin/bot';

export const runtime = 'nodejs';

export async function GET(request, routeContext) {
  try {
    const context = botContext(request);
    const { id } = await routeContext.params;
    return adminJson(await getBotScript(context, requireUuid(id)));
  } catch (error) { return botErrorResponse(error); }
}

export async function PATCH(request, routeContext) {
  try {
    const context = botContext(request, { mutation: true });
    const { id } = await routeContext.params;
    const result = await patchBotDraft(context, requireUuid(id), await readBotJson(request));
    return adminJson(result, {
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) { return botErrorResponse(error); }
}
