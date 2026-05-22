import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";

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

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Role check error:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      const roles = (data || []).map((r: any) => r.role);

      const adminStatus =
        roles.includes("admin") || roles.includes("super_admin");

      const superAdminStatus = roles.includes("super_admin");

      setIsAdmin(adminStatus);
      setIsSuperAdmin(superAdminStatus);
    } catch (err) {
      console.error("Unexpected role check error:", err);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          return;
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkUserRole(session.user.id);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isSuperAdmin,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
