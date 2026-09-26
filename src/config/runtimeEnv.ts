// Runtime-configurable env for the dashboard's static build. Vite's
// `import.meta.env.VITE_*` is inlined at `npm run build` time (a step
// already completed when this image was published), so it can't vary
// per deployment -- the same published image must work against whatever
// renewvan bus a given Pi/host is pointed at. `docker/generate-env-js.sh`
// (run as an nginx `docker-entrypoint.d` script, see Dockerfile) writes
// `window.__ENV__` from the *container's* environment at startup; this
// module prefers that when present and falls back to the build-time
// value otherwise (so `npm run dev` / `vite build` previews still work
// without a running container).

declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>
  }
}

export function getEnv(key: string): string | undefined {
  const runtimeValue = typeof window !== 'undefined' ? window.__ENV__?.[key] : undefined
  if (runtimeValue) return runtimeValue
  return (import.meta.env as Record<string, string | undefined>)[key]
}
