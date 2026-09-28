import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readAnalyticsReport } from '@/lib/analytics/report.mjs';
import { requireScriptAdmin, adminJson, scriptAdminErrorResponse } from '@/lib/script-admin';
import { invalidRequest, unavailable } from '@/lib/script-admin/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await requireScriptAdmin();
    const input = request.nextUrl.searchParams.get('days');
    const days = input === null ? 7 : Number(input);
    if (!['1', '7', '30', '90'].includes(input ?? '7')) {
      throw invalidRequest('請選擇今日、7 天、30 天或 90 天。');
    }
    const db = getCloudflareContext().env.ANALYTICS_DB;
    if (!db) throw unavailable('官網統計尚未完成設定。');
    return adminJson(await readAnalyticsReport(db, { days }));
  } catch (error) {
    return scriptAdminErrorResponse(error);
  }
}
