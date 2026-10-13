// Account-scoped intent survives opening the verification email in a new tab.
// Store no credentials or class content here.
const prefix = 'gsl.class-setup.pending.';
export function rememberClassSetup(uid: string): void {
  if (!uid) return;
  try { localStorage.setItem(prefix + uid, String(Date.now())); } catch { /* The explicit return URL is still available. */ }
}
export function hasPendingClassSetup(uid: string): boolean {
  if (!uid) return false;
  try {
    const started = Number(localStorage.getItem(prefix + uid));
    return started > 0 && Date.now() - started < 14 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}
export function finishClassSetup(uid: string): void {
  try { localStorage.removeItem(prefix + uid); } catch { /* Optional storage. */ }
}
