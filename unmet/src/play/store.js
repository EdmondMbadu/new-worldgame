// The small set of database operations the game needs. Two things provide
// them: Firebase Realtime Database (fb.js, used on the real site) and the
// in-memory hub below (used by the Node tests, and by `?mock` in a local
// preview so several browser tabs can play each other with no back end).
//
//   store.now()                        the shared clock, in ms
//   store.get(path)                    read once
//   store.set(path, value)             replace
//   store.update(path, patch)          set several children at once; keys may be 'a/b' paths, null deletes
//   store.on(path, cb, onError)        live value; returns a function that stops it
//   store.onDisconnectUpdate(path, p)  what the server should write if this device drops
//   store.connected(cb)                live connection state; returns a stop function

/** Stands for "the server's clock at the moment of writing". */
export const TS = { '.sv': 'timestamp' };

/** True when a write or read was refused by the security rules. */
export const denied = (e) => /permission|denied/i.test(`${e?.code || ''} ${e?.message || ''}`);

const clone = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
const parts = (path) => String(path).split('/').filter(Boolean);

export class MockHub {
  constructor() {
    this.tree = {};
    this.subs = new Set();
    this.skew = 0;
  }
  now() { return Date.now() + this.skew; }
  /** Moves the shared clock forward (tests). */
  advance(ms) { this.skew += ms; }
  read(path) {
    let node = this.tree;
    for (const k of parts(path)) { if (node == null || typeof node !== 'object') return null; node = node[k]; }
    return node ?? null;
  }
  stamp(value) {
    if (value && typeof value === 'object') {
      if (value['.sv'] === 'timestamp') return this.now();
      const out = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) { const s = this.stamp(v); if (s != null) out[k] = s; }
      return Object.keys(out).length ? out : null;
    }
    return value ?? null;
  }
  put(path, value) {
    const keys = parts(path);
    if (!keys.length) { this.tree = value || {}; return; }
    const trail = [];
    let node = this.tree;
    for (const k of keys.slice(0, -1)) {
      if (node[k] == null || typeof node[k] !== 'object') { if (value == null) return; node[k] = {}; }
      trail.push([node, k]); node = node[k];
    }
    const last = keys[keys.length - 1];
    if (value == null) delete node[last]; else node[last] = value;
    // Like the real database, an object with nothing in it does not exist.
    for (let i = trail.length - 1; i >= 0; i--) { const [parent, k] = trail[i]; if (Object.keys(parent[k]).length) break; delete parent[k]; }
  }
  /** Applies a batch of writes, then tells every listener whose value changed. */
  apply(ops, { quiet = false } = {}) {
    for (const { path, value } of ops) this.put(path, this.stamp(clone(value)));
    if (!quiet) this.changed(ops);
    this.flush();
  }
  changed() { /* the browser hub overrides this to tell other tabs */ }
  flush() {
    for (const sub of [...this.subs]) {
      const value = this.read(sub.path), text = JSON.stringify(value);
      if (text === sub.last) continue;
      sub.last = text;
      sub.cb(clone(value));
    }
  }
  listen(path, cb) {
    const sub = { path, cb, last: undefined };
    this.subs.add(sub);
    Promise.resolve().then(() => { if (!this.subs.has(sub) || sub.last !== undefined) return; const value = this.read(path); sub.last = JSON.stringify(value); cb(clone(value)); });
    return () => this.subs.delete(sub);
  }
}

/** A hub shared by every tab of one browser: for trying the live game locally with no back end. */
export class BrowserHub extends MockHub {
  constructor(name = 'play.mock') {
    super();
    this.name = name;
    try { this.tree = JSON.parse(localStorage.getItem(name) || '{}'); } catch { this.tree = {}; }
    this.channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null;
    if (this.channel) this.channel.onmessage = (e) => { for (const { path, value } of e.data) this.put(path, value); this.flush(); };
  }
  changed(ops) {
    const sent = ops.map(({ path }) => ({ path, value: this.read(path) }));
    this.channel?.postMessage(sent);
    try { localStorage.setItem(this.name, JSON.stringify(this.tree)); } catch { /* storage full or blocked */ }
  }
}

export function mockStore(hub) {
  let onDrop = [];
  const ops = (path, patch) => Object.entries(patch).map(([k, v]) => ({ path: `${path}/${k}`, value: v }));
  return {
    kind: 'mock',
    now: () => hub.now(),
    get: async (path) => clone(hub.read(path)),
    set: async (path, value) => hub.apply([{ path, value }]),
    update: async (path, patch) => hub.apply(ops(path, patch)),
    on: (path, cb) => hub.listen(path, cb),
    onDisconnectUpdate: (path, patch) => { onDrop = ops(path, patch); },
    connected: (cb) => { Promise.resolve().then(() => cb(true)); return () => {}; },
    /** Tests: behave as if this device lost its connection. */
    drop: () => hub.apply(onDrop.splice(0)),
  };
}
