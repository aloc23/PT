import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../supabaseClient.js";

// Tiny auth hook — listens for Supabase session changes and exposes the user.
// We deliberately don't wrap this in a Context provider; the app is small
// enough that the AuthGate component can just call this once and pass the
// user down via props.
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
