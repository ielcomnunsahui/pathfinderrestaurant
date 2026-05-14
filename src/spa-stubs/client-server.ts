// Stub used in static SPA build — admin features won't work without server runtime.
const denied = new Proxy({}, {
  get() { throw new Error("supabaseAdmin is not available in the static SPA build."); },
});
export const supabaseAdmin: any = denied;
