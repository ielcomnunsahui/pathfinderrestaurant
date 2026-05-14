import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Inject the Supabase session token on every server-fn call from the browser
// so middlewares like requireSupabaseAuth can authenticate the user.
// Also surfaces a user-friendly toast + Re-login action if no session is
// available or the server responds 401, instead of crashing the UI.
const supabaseAuthClientMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let headers: Record<string, string> = {};
    let hasToken = false;

    if (typeof window !== "undefined") {
      try {
        const { supabase } = await import("./integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          headers = { Authorization: `Bearer ${token}` };
          hasToken = true;
        }
      } catch (e) {
        console.error("Failed to attach Supabase auth header", e);
      }
    }

    const notifyAuthError = async (description: string) => {
      if (typeof window === "undefined") return;
      try {
        const { toast } = await import("sonner");
        toast.error("Your session has expired", {
          description,
          duration: 8000,
          action: {
            label: "Re-login",
            onClick: () => { window.location.href = "/login"; },
          },
        });
      } catch {
        /* ignore */
      }
    };

    // Don't proactively toast on missing token — let the server's 401 drive it,
    // so we don't fire during legitimate logged-out states (e.g., on /login).

    try {
      return await next({ headers });
    } catch (err) {
      // h3/TanStack server-fn surfaces a Response when handler throws one.
      const status =
        err instanceof Response
          ? err.status
          : (err as { status?: number; statusCode?: number })?.status ??
            (err as { statusCode?: number })?.statusCode;
      if (status === 401) {
        await notifyAuthError("You were signed out or your session is no longer valid.");
        throw new Error("Your session has expired. Please sign in again.");
      }
      throw err;
    }
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [supabaseAuthClientMiddleware],
}));
