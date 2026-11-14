// Key/value storage. Production: Netlify Blobs (strong consistency).
// Local tests: set KF_LOCAL=/some/dir to use plain files instead.
import fs from "node:fs";
import path from "node:path";

export interface KV {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  /** read with a version tag (etag) so a later write can refuse to overwrite someone else's newer save */
  getTagged(key: string): Promise<{ data: any; etag: string }>;
  /** write only if the stored version still matches `etag` (empty etag = plain write). ok:false = someone saved in between */
  setIfMatch(key: string, value: any, etag: string): Promise<{ ok: boolean; etag: string }>;
}

const enc = (k: string) => encodeURIComponent(k).replace(/\./g, "%2E");
const dec = (f: string) => decodeURIComponent(f);

function localKV(dir: string): KV {
  fs.mkdirSync(dir, { recursive: true });
  return {
    async get(key) {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, enc(key)), "utf8"));
      } catch {
        return null;
      }
    },
    async set(key, value) {
      fs.writeFileSync(path.join(dir, enc(key)), JSON.stringify(value));
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
        .filter((k) => k.startsWith(prefix))
        .sort();
    },
    async getTagged(key) {
      return { data: await this.get(key), etag: "" };
    },
    async setIfMatch(key, value) {
      await this.set(key, value);
      return { ok: true, etag: "" };
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
    async getTagged(key) {
      const r: any = await store.getWithMetadata(key, { type: "json" });
      return { data: r ? r.data : null, etag: (r && r.etag) || "" };
    },
    async setIfMatch(key, value, etag) {
      const r: any = etag ? await store.setJSON(key, value, { onlyIfMatch: etag }) : await store.setJSON(key, value);
      if (r && r.modified === false) return { ok: false, etag };
      return { ok: true, etag: (r && r.etag) || "" };
    },
  };
  return cached;
}

export function resetKV() {
  cached = null;
}
