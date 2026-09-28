/** Only local app routes are valid authentication return destinations. */
export function safeAuthReturn(raw: unknown): string | null {
  if (
    typeof raw !== 'string' ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(raw)
  )
    return null;
  try {
    const url = new URL(raw, 'https://local.invalid');
    return url.origin === 'https://local.invalid'
      ? url.pathname + url.search + url.hash
      : null;
  } catch {
    return null;
  }
}
export function captureAuthReturn(): string | null {
  if (typeof window === 'undefined') return null;
  const query = safeAuthReturn(
    new URLSearchParams(location.search).get('redirectTo'),
  );
  try {
    if (query) sessionStorage.setItem('redirectTo', query);
    return query || safeAuthReturn(sessionStorage.getItem('redirectTo'));
  } catch {
    return query;
  }
}
export function gameAuthReturn(): string | null {
  const value = captureAuthReturn();
  return value && /^\/games\/last-light\/(?:\?|$)/.test(value) ? value : null;
}
export function navigateAuthReturn(
  router: { navigateByUrl: (url: string) => unknown },
  target: string,
) {
  const safe = safeAuthReturn(target) || '/home';
  try {
    sessionStorage.removeItem('redirectTo');
  } catch {
    /* Browser storage can be restricted. */
  }
  if (/^\/games\/last-light\/(?:\?|$)/.test(safe)) window.location.assign(safe);
  else void router.navigateByUrl(safe);
}

export function clearAuthReturn() {
  try {
    sessionStorage.removeItem('redirectTo');
  } catch {
    /* Optional storage. */
  }
}
