// Shared server code for the Student Voice admin.
import { getStore } from "@netlify/blobs";
import { scryptSync, randomBytes, createHmac, timingSafeEqual, createHash } from "node:crypto";

export const env = (k: string) => {
  try { return (globalThis as any).Netlify?.env?.get(k) ?? process.env[k]; } catch { return process.env[k]; }
};

export const store = (name: string) => getStore({ name, consistency: "strong" });
const S = {
  data: () => store("sv-data"),       // collections, settings
  inbox: () => store("sv-inbox"),     // form submissions
  auth: () => store("sv-auth"),       // users, owner password, lockouts, magic links
  hist: () => store("sv-history"),    // version history
  track: () => store("sv-track"),     // anonymous stats events
  media: () => store("sv-media"),     // public images
  files: () => store("sv-files"),     // private evidence files
};
export { S };

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export const uid = () => Date.now().toString(36) + randomBytes(4).toString("hex");
export const now = () => new Date().toISOString();

/* ---------------- passwords ---------------- */
export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return "scrypt$" + salt + "$" + scryptSync(pw, salt, 32).toString("hex");
}
export function checkPassword(pw: string, stored?: string | null) {
  if (!stored || !pw) return false;
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const a = scryptSync(pw, salt, 32), b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function ownerHash() {
  const o = await S.auth().get("owner", { type: "json" }) as any;
  return o?.hash || env("ADMIN_PASSWORD_HASH") || null;
}

/* ---------------- sessions ---------------- */
const IDLE_MS = 30 * 60 * 1000;
const b64u = (s: string) => Buffer.from(s).toString("base64url");
const sign = (s: string) => createHmac("sha256", env("SESSION_SECRET") || "").update(s).digest("base64url");

export async function sessionVersion() {
  const v = await S.auth().get("session-version", { type: "json" }) as any;
  return v?.v || 1;
}
export async function makeCookie(user: { id: string; email?: string; name?: string; role: string }) {
  const payload = b64u(JSON.stringify({ ...user, v: await sessionVersion(), exp: Date.now() + IDLE_MS }));
  const val = payload + "." + sign(payload);
  return `sv_admin=${val}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${IDLE_MS / 1000}`;
}
export const clearCookie = "sv_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

export async function getUser(req: Request) {
  if (!env("SESSION_SECRET")) return null;
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)sv_admin=([^;]+)/);
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  let u: any; try { u = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!u.exp || u.exp < Date.now()) return null;
  if (u.v !== await sessionVersion()) return null;
  if (u.role !== "owner") { // a removed teammate loses access right away
    const users = await listUsers();
    const cur = users.find((x: any) => x.id === u.id);
    if (!cur) return null;
    u.role = cur.role;
  }
  return u as { id: string; email?: string; name?: string; role: "owner" | "editor" | "viewer" };
}

/* ---------------- users ---------------- */
export async function listUsers() {
  return ((await S.auth().get("users", { type: "json" })) as any[]) || [];
}
export async function findByEmail(email: string) {
  email = (email || "").trim().toLowerCase();
  if (!email) return null;
  const owner = (env("ADMIN_EMAIL") || "").toLowerCase();
  if (owner && email === owner) return { id: "owner", email, name: "Owner", role: "owner" };
  const u = (await listUsers()).find((x: any) => (x.email || "").toLowerCase() === email);
  return u ? { id: u.id, email: u.email, name: u.name, role: u.role } : null;
}

/* ---------------- lockout ---------------- */
const ipKey = (ip: string) => "lock/" + createHash("sha256").update(ip + (env("SESSION_SECRET") || "")).digest("hex").slice(0, 24);
export async function lockState(ip: string) {
  const r = (await S.auth().get(ipKey(ip), { type: "json" })) as any;
  if (r?.until && r.until > Date.now()) return { locked: true, until: r.until };
  return { locked: false, fails: r?.until && r.until <= Date.now() ? 0 : r?.fails || 0 };
}
export async function noteFail(ip: string) {
  const st = await lockState(ip);
  const fails = (st as any).fails + 1;
  await S.auth().setJSON(ipKey(ip), fails >= 5 ? { fails: 0, until: Date.now() + 15 * 60 * 1000 } : { fails });
  return 5 - fails;
}
export const clearFails = (ip: string) => S.auth().delete(ipKey(ip));

/* ---------------- collections ---------------- */
export async function getCol(name: string): Promise<any[]> {
  return ((await S.data().get("col/" + name, { type: "json" })) as any[]) || [];
}
export async function setCol(name: string, items: any[]) { await S.data().setJSON("col/" + name, items); }
export async function getSettings() {
  const s = ((await S.data().get("settings", { type: "json" })) as any) || {};
  return {
    retentionDays: 365,
    blockedWords: [],
    redactions: (env("REDACT_WORDS") || "").split(",").map((x: string) => x.trim()).filter(Boolean),
    allowNames: [],
    cwSections: ["r-framework"],
    maintenance: false,
    sheetsKey: "",
    crisis: "If you or someone you know is in crisis, call or text 988 (Suicide & Crisis Lifeline). Talk to a school counselor, or call 911 in an emergency.",
    replyTemplates: [
      "Thanks for writing in. I sent your question to the district on [date] and I'll post the answer word for word on the site.",
      "Thanks! This one is already answered on the site: [link].",
      "Got it. I'll bring this up at the next meeting with district staff.",
    ],
    ...s,
  };
}
export async function audit(user: any, action: string, detail = "") {
  const key = "log/" + new Date().toISOString().slice(0, 7);
  const log = ((await S.data().get(key, { type: "json" })) as any[]) || [];
  log.unshift({ at: now(), who: user?.email || user?.name || user?.id || "system", action, detail: String(detail).slice(0, 200) });
  await S.data().setJSON(key, log.slice(0, 2000));
}

/* ---------------- text checks ---------------- */
const COMMON = new Set(("Sun Prairie,Student Voice,School Board,Board Of,Of Education,High School,Middle School,West High,East High,Area School,School District,Prairie Area,Student Senate,Student Advisory,Advisory Council,Professional Learning,Learning Center,Kroncke Drive,Public Comment,United States,Teaching Learning,Act Ninety,Ask The,The District,Did You,You Said,We Did,Weighted Grades,Dual Credit,Google Form,Google Doc,Google Sites,Instagram Post,Wisconsin State,Police Department,Monday Nov,Tuesday Nov,Wednesday Nov,Thursday Nov,Friday Nov").split(",").map(s => s.toLowerCase()));
const MONTHS = /^(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
export async function checkText(text: string) {
  const st = await getSettings();
  const contacts = await getCol("contacts");
  const staff = new Set<string>([...contacts.map((c: any) => (c.name || "").toLowerCase()), ...st.allowNames.map((x: string) => x.toLowerCase())]);
  const staffLast = new Set<string>([...staff].map(n => n.split(" ").pop() || ""));
  const names: string[] = [];
  const re = /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const full = m[0], low = full.toLowerCase();
    if (COMMON.has(low) || MONTHS.test(m[1]) || MONTHS.test(m[2])) continue;
    if (staff.has(low) || staffLast.has(m[2].toLowerCase())) continue;
    if (/^(Dr|Mr|Mrs|Ms|Superintendent|Principal|Chief|Board|Member|President)$/.test(m[1])) continue;
    if (!names.includes(full)) names.push(full);
  }
  const phones = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g) || [];
  const red = st.redactions.filter((w: string) => w && new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text));
  return { names, phones, redactions: red };
}

/* ---------------- inbox helpers ---------------- */
const TOPICS: [string, RegExp][] = [
  ["weighted grades", /weight|gpa|grade|\bap\b|dual credit|honors|class rank/i],
  ["phones", /phone|cell|device|yondr/i],
  ["safety", /safe|fight|threat|bully|lockdown|police|weapon|harass/i],
  ["schedules", /schedule|start time|bell|period|block|calendar|late start/i],
  ["council", /council|senate|student voice|represent|board rep/i],
  ["lunch & buildings", /lunch|food|bathroom|building|heat|cold|bus/i],
];
const SAFETY = /suicid|kill (my|him|her|them)self|self[- ]?harm|cutting|want to die|end my life|abuse|abused|touch(ed)? me|gun|shoot|bomb|threat/i;
export async function classify(data: Record<string, string>) {
  const text = Object.values(data || {}).join(" ");
  const st = await getSettings();
  const topic = (TOPICS.find(([, r]) => r.test(text)) || ["other"])[0];
  const links = (text.match(/https?:\/\//g) || []).length;
  const spam = links >= 3 || /viagra|casino|crypto|seo service|backlink|loan offer/i.test(text) || (text.length > 0 && text.length < 3);
  const flag = SAFETY.test(text);
  const held = st.blockedWords.some((w: string) => w && text.toLowerCase().includes(w.toLowerCase()));
  return { topic, spam, flag, held };
}
export async function saveSubmission(form: string, data: Record<string, string>, extra: Record<string, unknown> = {}) {
  const c = await classify(data);
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(data || {})) if (!/^(bot-field|form-name|g-recaptcha-response)$/.test(k)) clean[k] = String(v ?? "").slice(0, 5000);
  const key = "sub/" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomBytes(3).toString("hex");
  const rec = { key, form, data: clean, created: now(), status: "new", tag: c.topic, suggested: c.topic, spam: c.spam, flag: c.flag, held: c.held, notes: "", ...extra };
  await S.inbox().setJSON(key, rec);
  return rec;
}
export async function allSubmissions() {
  const { blobs } = await S.inbox().list({ prefix: "sub/" });
  const out = await Promise.all(blobs.map(b => S.inbox().get(b.key, { type: "json" })));
  return (out.filter(Boolean) as any[]).sort((a, b) => (a.created < b.created ? 1 : -1));
}

/* ---------------- email (optional, via Resend) ---------------- */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = env("RESEND_API_KEY");
  if (!key || !to) return { ok: false, reason: "Email isn't set up (RESEND_API_KEY missing)." };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({ from: env("RESEND_FROM") || "Student Voice Admin <onboarding@resend.dev>", to: [to], subject, html }),
  });
  return { ok: r.ok, reason: r.ok ? "" : await r.text() };
}
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
