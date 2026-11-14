// Key/value storage. Production: Netlify Blobs (strong consistency).
// Local tests: set KF_LOCAL=/some/dir to use plain files instead.
import fs from "node:fs";
import path from "node:path";

export interface KV {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  /** write only if nothing is stored under `key` yet. ok:false = something is already there */
  createIfNew(key: string, value: any): Promise<{ ok: boolean }>;
}

const enc = (k: string) => encodeURIComponent(k).replace(/\./g, "%2E");
const dec = (f: string) => decodeURIComponent(f);

function localKV(dir: string): KV {
  fs.mkdirSync(dir, { recursive: true });
  // several local processes can share one folder (like Netlify's many function copies): writes go to a temp file
  // and are renamed into place (a reader never sees half a file), and create-if-new runs under a folder lock
  const put = (f: string, raw: string) => { const t = f + "." + process.pid + ".tmp"; fs.writeFileSync(t, raw); fs.renameSync(t, f); };
  const locked = <T,>(key: string, fn: () => T): T => {
    const l = path.join(dir, enc(key) + ".lock"); const t0 = Date.now();
    for (;;) { try { fs.mkdirSync(l); break; } catch { if (Date.now() - t0 > 5000) { try { fs.rmdirSync(l); } catch {} } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2); } }
    try { return fn(); } finally { try { fs.rmdirSync(l); } catch {} }
  };
  return {
    async get(key) {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, enc(key)), "utf8"));
      } catch {
        return null;
      }
    },
    async set(key, value) {
      put(path.join(dir, enc(key)), JSON.stringify(value));
    },
    async del(key) {
      try {
        fs.unlinkSync(path.join(dir, enc(key)));
      } catch {}
    },
    async list(prefix) {
      return fs
        .readdirSync(dir)
        .map(dec)
        .filter((k) => k.startsWith(prefix) && !k.endsWith(".lock") && !k.endsWith(".tmp"))
        .sort();
    },
    async createIfNew(key, value) {
      const f = path.join(dir, enc(key));
      return locked(key, () => { if (fs.existsSync(f)) return { ok: false }; put(f, JSON.stringify(value)); return { ok: true }; });
    },
  };
}

let cached: KV | null = null;

export async function kv(): Promise<KV> {
  if (cached) return cached;
  const local = process.env.KF_LOCAL;
  if (local) {
    cached = localKV(local);
    return cached;
  }
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "kicks-app", consistency: "strong" });
  cached = {
    async get(key) {
      return await store.get(key, { type: "json" });
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
    async del(key) {
      await store.delete(key);
    },
    async list(prefix) {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b: any) => b.key).sort();
    },
    async createIfNew(key, value) {
      const r: any = await store.setJSON(key, value, { onlyIfNew: true });
      return { ok: !(r && r.modified === false) };
    },
  };
  return cached;
}

export function resetKV() {
  cached = null;
}
