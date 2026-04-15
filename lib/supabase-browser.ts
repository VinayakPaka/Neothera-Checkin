import { createBrowserClient } from "@supabase/ssr";

function getBrowserKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

const browserUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const browserKey = getBrowserKey();

export const isBrowserSupabaseConfigured = Boolean(browserUrl && browserKey);

export function createBrowserSupabaseClient() {
  if (!browserUrl || !browserKey) {
    return null;
  }

  return createBrowserClient(browserUrl, browserKey);
}
