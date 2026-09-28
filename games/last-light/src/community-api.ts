import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { firebaseConfig } from './firebase-config';
const emulators =
  import.meta.env.DEV && import.meta.env.VITE_LAST_LIGHT_EMULATORS === '1';
const app =
  getApps()[0] ||
  initializeApp(
    emulators
      ? { ...firebaseConfig, projectId: 'demo-last-light' }
      : firebaseConfig,
  );
export const auth = getAuth(app),
  functions = getFunctions(app);
// Explicit development opt-in only; production can never connect to test auth.
if (emulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9106', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5006);
}
export const watchAuth = (fn: (user: User | null) => void) =>
  onAuthStateChanged(auth, fn);
export async function call<T>(name: string, data: unknown = {}): Promise<T> {
  return (
    await httpsCallable<unknown, T>(functions, name, { timeout: 12000 })(data)
  ).data;
}
export const ready = new Promise<void>((resolve) => {
  const off = onAuthStateChanged(auth, () => {
    off();
    resolve();
  });
});
