import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Brand } from "./types";

interface AuthContextType {
  session: Session | null;
  brand: Brand | null;
  loading: boolean;
  refreshBrand: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  brand: null,
  loading: true,
  refreshBrand: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadBrand(userId: string) {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setBrand(data as Brand | null);
  }

  async function refreshBrand() {
    if (session?.user) {
      await loadBrand(session.user.id);
    }
  }

  useEffect(() => {
    // Sessione iniziale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await loadBrand(session.user.id);
      }
      setLoading(false);
    });

    // Ascolta cambi di sessione (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await loadBrand(session.user.id);
      } else {
        setBrand(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ session, brand, loading, refreshBrand }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
