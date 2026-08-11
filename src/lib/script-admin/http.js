import { NextResponse } from 'next/server';
import { forbidden, invalidRequest, normalizeScriptAdminError } from './errors';

const NO_STORE_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
});

export function adminJson(body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

export async function readAdminJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 256 * 1024) {
    throw invalidRequest('請求內容過大。');
  }

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 256 * 1024) {
      throw invalidRequest('請求內容過大。');
    }
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw invalidRequest('請求內容必須是 JSON 物件。');
    }
    return body;
  } catch (error) {
    if (error?.code === 'invalid_request') throw error;
    throw invalidRequest('無法讀取 JSON 請求內容。');
  }
}

export async function readOptionalAdminJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 256 * 1024) {
    throw invalidRequest('請求內容過大。');
  }

  try {
    const raw = await request.text();
    if (!raw.trim()) return {};
    if (Buffer.byteLength(raw, 'utf8') > 256 * 1024) {
      throw invalidRequest('請求內容過大。');
    }
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw invalidRequest('請求內容必須是 JSON 物件。');
    }
    return body;
  } catch (error) {
    if (error?.code === 'invalid_request') throw error;
    throw invalidRequest('無法讀取 JSON 請求內容。');
  }
}

/**
 * Cookie-authenticated mutations must originate from this site. Requests
 * without Origin are accepted only on explicitly bearer-authenticated routes,
 * which keeps CLI/server automation possible without weakening CSRF checks.
 */
export function requireSafeMutationOrigin(request, { allowBearerWithoutOrigin = false } = {}) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin === request.nextUrl.origin) return;
    } catch {
      // Fall through to the same safe forbidden response.
    }
    throw forbidden();
  }

  const hasBearer = /^Bearer\s+\S+/i.test(request.headers.get('authorization') || '');
  if (allowBearerWithoutOrigin && hasBearer) return;
  throw forbidden();
}

export function scriptAdminErrorResponse(error) {
  const safeError = normalizeScriptAdminError(error);
  const payload = {
    error: safeError.message,
    code: safeError.code,
  };
  if (safeError.fields) payload.fields = safeError.fields;
  return adminJson(payload, { status: safeError.status });
}
