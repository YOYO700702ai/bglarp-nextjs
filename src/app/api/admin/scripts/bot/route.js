import { adminJson } from '@/lib/script-admin/http';
import { botContext, botErrorResponse, createBotDraft, readBotJson, searchBotScripts } from '@/lib/script-admin/bot';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { adminClient } = botContext(request);
    return adminJson(await searchBotScripts(adminClient, request.nextUrl.searchParams.get('name')));
  } catch (error) { return botErrorResponse(error); }
}

export async function POST(request) {
  try {
    const context = botContext(request, { mutation: true });
    const result = await createBotDraft(context, await readBotJson(request));
    return adminJson(result, {
      status: result.idempotentReplay ? 200 : 201,
      headers: result.idempotentReplay ? { 'Idempotent-Replayed': 'true' } : undefined,
    });
  } catch (error) { return botErrorResponse(error); }
}
