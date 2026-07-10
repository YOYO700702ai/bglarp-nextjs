import { NextResponse } from 'next/server';
import { getAllScripts } from '@/lib/scripts';

// Cache the script list for 10 minutes so the homepage doesn't hit
// Notion's paginated API on every single visit (126+ pages = slow).
export const revalidate = 600;

export async function GET() {
  const scripts = await getAllScripts();
  return NextResponse.json(scripts, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
