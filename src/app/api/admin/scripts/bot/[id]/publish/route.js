import { adminJson } from '@/lib/script-admin/http';
import { requireUuid } from '@/lib/script-admin/validation';
import { botContext, botErrorResponse, publishBotScript, readBotJson } from '@/lib/script-admin/bot';

export const runtime = 'nodejs';

export async function POST(request, routeContext) {
  try {
    const context = botContext(request, { mutation: true });
    const { id } = await routeContext.params;
    const result = await publishBotScript(context, requireUuid(id), await readBotJson(request));
    return adminJson(result, { status: result.publication.verified ? 200 : 202 });
  } catch (error) { return botErrorResponse(error); }
}
