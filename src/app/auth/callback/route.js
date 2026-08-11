import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeNextUrl(requestUrl, value) {
  const fallback = new URL('/admin/scripts', requestUrl);
  if (!value) return fallback;

  try {
    const target = new URL(value, requestUrl);
    return target.origin === requestUrl.origin ? target : fallback;
  } catch {
    return fallback;
  }
}

function redirectResponse(nextUrl, authError) {
  const redirectUrl = new URL(nextUrl);
  if (authError) redirectUrl.searchParams.set('auth_error', authError);

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const requestUrl = new URL(request.url);
  const nextUrl = safeNextUrl(requestUrl, requestUrl.searchParams.get('next'));

  if (!url || !key) {
    return redirectResponse(nextUrl, 'not_configured');
  }

  let response = redirectResponse(nextUrl);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = redirectResponse(nextUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers || {}).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return redirectResponse(nextUrl, 'missing_code');
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectResponse(nextUrl, 'sign_in_failed');
  }

  return response;
}
