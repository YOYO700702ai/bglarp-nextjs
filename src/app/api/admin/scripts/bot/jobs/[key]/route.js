import { adminJson } from '@/lib/script-admin/http';
import { botContext, botErrorResponse, getBotJob, readBotJson, saveBotJob } from '@/lib/script-admin/bot';

export const runtime = 'nodejs';

export async function GET(request, routeContext) {
  try {
    const { adminClient } = botContext(request);
    const { key } = await routeContext.params;
    return adminJson(await getBotJob(adminClient, key));
  } catch (error) { return botErrorResponse(error); }
}

export async function PUT(request, routeContext) {
  try {
    const { adminClient } = botContext(request, { mutation: true });
    const { key } = await routeContext.params;
    return adminJson(await saveBotJob(adminClient, key, await readBotJson(request, { job: true })));
  } catch (error) { return botErrorResponse(error); }
}
