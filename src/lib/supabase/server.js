import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export class SupabaseServerConfigurationError extends Error {
  constructor() {
    super('Supabase server configuration is incomplete.');
    this.name = 'SupabaseServerConfigurationError';
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getPublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function requireConfiguration(value) {
  if (!value) throw new SupabaseServerConfigurationError();
  return value;
}

/**
 * Cookie-backed Supabase client for Route Handlers and Server Components.
 * Authentication decisions must use auth.getUser(), which verifies the JWT
 * with Supabase instead of trusting cookie contents locally.
 */
export async function createSupabaseServerClient() {
  const url = requireConfiguration(getSupabaseUrl());
  const key = requireConfiguration(getPublishableKey());
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies. Middleware or a
          // Route Handler will refresh the session on the next request.
        }
      },
    },
  });
}

/**
 * Privileged server-only client. Never import this module from a Client
 * Component and never expose the service-role key in a response.
 */
export function createSupabaseAdminClient() {
  const url = requireConfiguration(getSupabaseUrl());
  const serviceRoleKey = requireConfiguration(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
