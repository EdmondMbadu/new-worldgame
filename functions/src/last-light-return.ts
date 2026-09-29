/** A verification email may return only to the standalone game with public launch context or a local checkpoint. */
export function lastLightReturn(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 800 || /[\\\u0000-\u0020]/.test(raw)) return null;
  try {
    const url = new URL(raw, 'https://local.invalid');
    if (!raw.startsWith('/games/last-light/') || url.origin !== 'https://local.invalid' || url.pathname !== '/games/last-light/' || url.hash) return null;
    const rules: Record<string, RegExp> = {
      resume: /^[a-f0-9-]{36}$/,
      lang: /^(en|fr)$/,
      challenge: /^1$/,
      chapter: /^[1-5]$/,
      mode: /^(standard|relaxed)$/,
      variant: /^[01]$/,
      revision: /^\d{1,3}$/,
      player: /^[a-zA-Z0-9_-]{1,80}$/,
    };
    for (const [key, value] of url.searchParams) if (!rules[key]?.test(value) || url.searchParams.getAll(key).length !== 1) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
