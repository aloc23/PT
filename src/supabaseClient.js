import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// We still create a client even with empty values so the rest of the app can
// import it without throwing — the AuthGate will show a config-needed screen
// when supabaseConfigured is false.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      // Persist session across reloads / devices that share a browser profile.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pt_auth_session",
    },
  }
);
