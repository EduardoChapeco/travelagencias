import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanupBrandKit } from "@/lib/agency-context";

let globalSession: Session | null = null;
let globalSessionPromise: Promise<Session | null> | null = null;
const authListeners = new Set<(session: Session | null) => void>();
let isAuthSubscribed = false;

function subscribeToAuth() {
  if (isAuthSubscribed) return;
  isAuthSubscribed = true;

  supabase.auth.onAuthStateChange((_event, newSession) => {
    globalSession = newSession;
    authListeners.forEach((l) => l(newSession));
  });
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(globalSession);
  const [loading, setLoading] = useState(!globalSession);

  useEffect(() => {
    subscribeToAuth();

    const handleSessionChange = (s: Session | null) => {
      setSession(s);
      setLoading(false);
    };

    authListeners.add(handleSessionChange);

    // Se a sessão global já existe, não precisamos fazer nova query
    if (globalSession) {
      setSession(globalSession);
      setLoading(false);
    } else {
      if (!globalSessionPromise) {
        globalSessionPromise = supabase.auth.getSession().then(({ data }) => {
          globalSession = data.session;
          authListeners.forEach((l) => l(data.session));
          return data.session;
        });
      }
      
      globalSessionPromise.then((s) => {
        setSession(s);
        setLoading(false);
      });
    }

    return () => {
      authListeners.delete(handleSessionChange);
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/**
 * Signs out the current user and cleans up any agency brand kit CSS
 * variables and localStorage cache to prevent cross-tenant visual bleed.
 */
export async function signOut() {
  // Clean all brand kit data before signing out
  cleanupBrandKit();
  await supabase.auth.signOut();
}
