// Client-only stub for @tanstack/react-start used by the SPA (Vercel) build.
// Server functions cannot run in a static SPA — calling one will throw.
const notAvailable = () => {
  throw new Error("Server functions are not available in the static SPA build. Deploy via the TanStack Start build for admin features.");
};

const chain = () => {
  const obj: any = {};
  obj.middleware = () => obj;
  obj.inputValidator = () => obj;
  obj.handler = () => notAvailable;
  obj.server = () => obj;
  obj.client = () => obj;
  return obj;
};

export const createServerFn = (_opts?: any) => chain();
export const createMiddleware = (_opts?: any) => chain();
export const createStart = (_fn?: any) => ({});
export const useServerFn = (_fn: any) => notAvailable;
