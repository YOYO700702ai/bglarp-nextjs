import { adminJson } from '@/lib/script-admin/http';
import { botContext, botErrorResponse, createBotMediaUpload, readBotJson } from '@/lib/script-admin/bot';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const context = botContext(request, { mutation: true });
    const upload = await createBotMediaUpload(context, await readBotJson(request));
    return adminJson({ upload });
  } catch (error) { return botErrorResponse(error); }
}
