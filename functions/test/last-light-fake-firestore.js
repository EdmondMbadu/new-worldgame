// Minimal in-memory Firestore for exercising the Last Light callables offline.
const store = new Map(); // path -> data
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
class Snap { constructor(id, data) { this.id = id; this.exists = data !== undefined; this._d = data; } data() { return clone(this._d); } }
class DocRef {
  constructor(path) { this.path = path; this.id = path.split('/').pop(); }
  collection(name) { return new Query(`${this.path}/${name}`); }
  async get() { return new Snap(this.id, store.get(this.path)); }
  async set(data, opts) { write(this.path, data, opts); }
  async update(data) { if (!store.has(this.path)) throw new Error('NOT_FOUND ' + this.path); write(this.path, data, { merge: true }); }
  async delete() { store.delete(this.path); }
}
function write(path, data, opts) { store.set(path, clone(opts?.merge ? { ...(store.get(path) || {}), ...data } : data)); }
class Query {
  constructor(path, spec = { order: [], where: [], start: null, end: null, after: null, lim: Infinity }) { this.path = path; this.spec = spec; }
  doc(id) { return new DocRef(`${this.path}/${id}`); }
  _with(p) { return new Query(this.path, { ...this.spec, ...p }); }
  orderBy(f) { return this._with({ order: [...this.spec.order, f] }); }
  where(f, op, v) { return this._with({ where: [...this.spec.where, [f, op, v]] }); }
  startAt(v) { return this._with({ start: v }); }
  endAt(v) { return this._with({ end: v }); }
  startAfter(snap) { return this._with({ after: snap }); }
  limit(n) { return this._with({ lim: n }); }
  _docs() {
    const prefix = this.path + '/';
    let docs = [...store].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')).map(([p, d]) => new Snap(p.split('/').pop(), d));
    for (const [f, op, v] of this.spec.where) docs = docs.filter((d) => (op === '<' ? d._d[f] < v : op === '==' ? d._d[f] === v : true));
    const cmp = (a, b) => { for (const f of this.spec.order) { if (a._d[f] < b._d[f]) return -1; if (a._d[f] > b._d[f]) return 1; } return 0; };
    docs.sort(cmp);
    const first = this.spec.order[0];
    if (this.spec.start !== null) docs = docs.filter((d) => d._d[first] >= this.spec.start);
    if (this.spec.end !== null) docs = docs.filter((d) => d._d[first] <= this.spec.end);
    if (this.spec.after) { const i = docs.findIndex((d) => d.id === this.spec.after.id); docs = docs.slice(i + 1); }
    return docs.slice(0, this.spec.lim);
  }
  async get() { const docs = this._docs(); return { docs, size: docs.length }; }
  count() { return { get: async () => ({ data: () => ({ count: this._with({ lim: Infinity })._docs().length }) }) }; }
}
const db = {
  collection: (name) => new Query(name),
  async runTransaction(fn) {
    const writes = [];
    const tx = {
      get: (ref) => { if (writes.length) throw new Error('Read after write in transaction'); return ref.get(); },
      set: (ref, data, opts) => { writes.push(() => write(ref.path, data, opts)); return tx; },
      update: (ref, data) => { writes.push(() => write(ref.path, data, { merge: true })); return tx; },
      delete: (ref) => { writes.push(() => store.delete(ref.path)); return tx; },
    };
    const result = await fn(tx);
    writes.forEach((w) => w());
    return result;
  },
};
function install(admin) {
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => 'server-time' };
  firestore.Timestamp = { fromMillis: (ms) => ({ ms }) };
  Object.defineProperty(admin, 'firestore', { value: firestore, configurable: true, writable: true });
}
module.exports = { db, store, install };
