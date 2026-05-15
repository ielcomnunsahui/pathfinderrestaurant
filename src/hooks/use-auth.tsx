import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "manager" | "staff";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: Role) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

async function loadRoles(userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  const priority: Record<Role, number> = { admin: 0, manager: 1, staff: 2 };
  return ((data?.map((r) => r.role as Role)) ?? []).sort((a, b) => priority[a] - priority[b]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs to track current user ID and initial load — prevents cascading
  // re-renders on token-refresh events that don't change the user.
  const userIdRef = useRef<string | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const applySession = async (s: Session | null) => {
      const currentRequest = ++requestId;
      if (!mounted) return;

      const newUserId = s?.user?.id ?? null;
      const prevUserId = userIdRef.current;

      // If the user hasn't changed and we've already loaded once, this is just
      // a token refresh — update session reference silently without triggering
      // a loading state that would re-render the entire tree and freeze inputs.
      if (initialLoadDone.current && newUserId === prevUserId && newUserId !== null) {
        setSession(s);
        return;
      }

      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      userIdRef.current = newUserId;

      if (s?.user) {
        try {
          const nextRoles = await loadRoles(s.user.id);
          if (mounted && currentRequest === requestId) setRoles(nextRoles);
        } catch {
          if (mounted && currentRequest === requestId) setRoles([]);
        }
      } else {
        setRoles([]);
      }
      if (mounted && currentRequest === requestId) {
        setLoading(false);
        initialLoadDone.current = true;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void applySession(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const value: AuthCtx = {
    user,
    session,
    roles,
    loading,
    signOut: async () => {
      // Reset refs so next sign-in triggers full load
      userIdRef.current = null;
      initialLoadDone.current = false;
      await supabase.auth.signOut();
    },
    hasRole: (r) => roles.includes(r),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
