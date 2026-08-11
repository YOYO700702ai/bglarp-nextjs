'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient;

export function getSupabaseBrowserConnection() {
  if (typeof window === 'undefined') {
    return { status: 'checking', client: null };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Publishable keys are the current Supabase default. The anon-key fallback
  // keeps the setup compatible with an existing legacy Supabase project.
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url && !key) {
    return { status: 'unconfigured', client: null };
  }

  if (!url || !key) {
    return { status: 'misconfigured', client: null };
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }

  return { status: 'ready', client: browserClient };
}

export function getSupabaseBrowserClient() {
  return getSupabaseBrowserConnection().client;
}
