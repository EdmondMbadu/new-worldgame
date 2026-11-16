// The live back end: Firebase Realtime Database, with no sign-in (see room.js
// for how a device proves who it is). This file is its own chunk, fetched only
// when someone hosts or joins a room, so the landing page and the solo game
// never pay for it.
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update, onValue, onDisconnect } from 'firebase/database';
import { firebaseConfig } from './config.js';

/** The SDK queues work while offline and never gives up; a person waiting on a button needs an answer. */
const within = (promise, ms = 12000) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

let store = null;
/** A store (see store.js) over play/ in the project's Realtime Database. */
export function liveStore() {
  if (store) return store;
  // Its own named app, so it never touches the main site's signed-in session.
  const db = getDatabase(initializeApp(firebaseConfig, 'play'));
  let offset = 0;
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => { offset = snap.val() || 0; });
  store = {
    kind: 'firebase',
    now: () => Date.now() + offset,
    get: async (path) => (await within(get(ref(db, path)))).val(),
    set: (path, value) => within(set(ref(db, path), value)),
    update: (path, patch) => within(update(ref(db, path), patch)),
    on: (path, cb, onError) => onValue(ref(db, path), (snap) => cb(snap.val()), (e) => onError?.(e)),
    onDisconnectUpdate: (path, patch) => { onDisconnect(ref(db, path)).update(patch).catch(() => {}); },
    connected: (cb) => onValue(ref(db, '.info/connected'), (snap) => cb(!!snap.val())),
  };
  return store;
}
