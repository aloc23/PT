import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../supabaseClient.js";

// Subscribes to the Supabase session. `loading` is true until the persisted
// session (if any) has been read from storage.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      // Drop this device's cached bookings so nothing lingers after sign-out.
      Object.keys(localStorage)
        .filter((k) => k.startsWith("pt_cache_") || k.startsWith("pt_queue_"))
        .filter((k) => !k.endsWith("_local"))
        .forEach((k) => localStorage.removeItem(k));
      return supabase.auth.signOut();
    },
  };
}
