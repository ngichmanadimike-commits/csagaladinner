import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isSuperAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (data || []).map((r: any) => r.role);
      setIsSuperAdmin(roles.includes("super_admin"));
      setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        await checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        await checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    // Re-check admin role whenever the tab regains focus.
    // This fixes the case where a user's role is removed then re-granted:
    // their session JWT is still valid but the user_roles row changed.
    // Without this, they must fully sign out + sign in to see the update.
    const handleFocus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await checkAdmin(session.user.id);
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isSuperAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
