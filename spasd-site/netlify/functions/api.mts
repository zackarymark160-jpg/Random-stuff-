// One router for every admin and public data endpoint.
import type { Config, Context } from "@netlify/functions";
import {
  S, env, json, uid, now, esc, hashPassword, checkPassword, ownerHash, makeCookie, clearCookie, getUser,
  listUsers, findByEmail, lockState, noteFail, clearFails, getCol, setCol, getSettings, audit, checkText,
  allSubmissions, saveSubmission, sendEmail,
} from "../lib/core.mts";
import { randomBytes, createHash } from "node:crypto";

const PUBLIC_COLS = ["updates", "homecards", "dates", "promises", "answers", "banner", "dyk", "faq", "changelog", "pubq", "boardmtg", "weekly", "squotes"];
const PRIVATE_COLS = ["questions", "emails", "meetings", "quotes", "agenda", "records", "contacts", "roster", "mtgnotes",
  "hours", "tasks", "adopt", "partners", "subscribers", "igposts", "press", "translations", "notes", "newsletters", "qrlinks"];
const ALL_COLS = new Set([...PUBLIC_COLS, ...PRIVATE_COLS]);
const LABEL: Record<string, string> = { updates: "Updates", homecards: "Home cards", dates: "Calendar", promises: "You Said, We Did", answers: "District answers", banner: "Banner", dyk: "Did you know", faq: "FAQ and myths", changelog: "Changelog", pubq: "Public questions", boardmtg: "Board meetings", weekly: "Weekly line", squotes: "Student quotes" };

const can = (u: any, need: "view" | "edit" | "owner") =>
  !!u && (need === "view" || (need === "edit" && u.role !== "viewer") || (need === "owner" && u.role === "owner"));
const slug = (s: unknown, n = 40) => String(s ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, n) || "x";
// Uploaded "media" is shown publicly on the site's own domain, so only real image types are served inline.
const IMAGE_TYPES = /^image\/(png|jpe?g|gif|webp|avif)$/;
// Link-like fields can't use script-capable schemes like javascript: or data: (web, mail, phone and relative links are fine).
const LINK_KEYS = /^(link|url|href|recording|minutes|agenda|src|image|video)$/i;
const badLink = (b: any) => Object.entries(b || {}).find(([k, v]) => LINK_KEYS.test(k) && typeof v === "string" && /^[a-z][a-z0-9+.-]*:/i.test(v.replace(/[\s\u0000-\u001f]/g, "")) && !/^(https?|mailto|tel):/i.test(v.replace(/[\s\u0000-\u001f]/g, "")));
// Spreadsheet apps run cells that start with = + - @ as formulas; prefix them so they stay plain text.
const csvCell = (v: unknown) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
// Simple per-person hourly cap for public writes (one small counter per person per hour).
async function overLimit(ip: string, kind: string, max: number) {
  const who = createHash("sha256").update(ip + (env("SESSION_SECRET") || "")).digest("hex").slice(0, 20);
  const key = `rl/${new Date().toISOString().slice(0, 13)}/${kind}/${who}`;
  const n = (((await S.track().get(key, { type: "json" })) as any)?.n || 0) + 1;
  if (n > max) return true;
  await S.track().setJSON(key, { n });
  return false;
}
const isLive = (i: any, t = Date.now()) =>
  i.status === "published" && (!i.publishAt || Date.parse(i.publishAt) <= t) && (!i.endAt || Date.parse(i.endAt) > t);

async function publicPayload() {
  const out: Record<string, unknown> = {};
  const t = Date.now();
  for (const c of PUBLIC_COLS) {
    out[c] = (await getCol(c)).filter(i => isLive(i, t)).map(({ by, history, ...rest }: any) => rest);
  }
  const st = await getSettings();
  out.maintenance = !!st.maintenance;
  out.cwSections = st.cwSections || [];
  out.lastUpdated = st.lastPublished || null;
  // upvotes and "did this answer it?" counts, one blob per person per question (no counters to race)
  const qv: Record<string, number> = {}, qr: Record<string, { yes: number; no: number }> = {};
  const { blobs: vb } = await S.track().list({ prefix: "qv/" });
  for (const b of vb) { const id = b.key.split("/")[1]; qv[id] = (qv[id] || 0) + 1; }
  const { blobs: rb } = await S.track().list({ prefix: "qr/" });
  for (const b of rb) { const [, id, v] = b.key.split("/"); const r = (qr[id] ||= { yes: 0, no: 0 }); if (v === "yes" || v === "no") r[v]++; }
  out.qvotes = qv; out.qrates = qr;
  out.squotes = ((out.squotes as any[]) || []).filter((q: any) => q.consent);
  const rx: Record<string, Record<string, number>> = {};
  const { blobs: xb } = await S.track().list({ prefix: "rx/" });
  for (const b of xb) { const [, id, r] = b.key.split("/"); const o = (rx[id] ||= {}); o[r] = (o[r] || 0) + 1; }
  out.reactions = rx;
  return out;
}

async function body(req: Request) { try { return await req.json(); } catch { return {}; } }

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  const M = req.method;
  const ip = context.ip || "0.0.0.0";

  // Simple CSRF guard: every state-changing admin call must send this header (cookies are SameSite=Strict too).
  const needsHeader = M !== "GET" && p.startsWith("/api/") && !["/api/track", "/api/login", "/api/google", "/api/magic", "/api/qvote", "/api/qrate", "/api/voice", "/api/react"].includes(p);
  if (needsHeader && req.headers.get("x-sv") !== "1") return json({ error: "Bad request" }, 400);

  /* ======== public ======== */
  if (p === "/api/public" && M === "GET") {
    return json(await publicPayload(), 200, { "cache-control": "public, max-age=60" });
  }
  if (p === "/api/track" && M === "POST") {
    const b: any = await body(req);
    const t = ["view", "tab", "quiz", "qr"].includes(b.t) ? b.t : null;
    if (!t) return json({ ok: false }, 400);
    if (await overLimit(ip, "track", 200)) return json({ ok: false }, 429);
    const day = new Date().toISOString().slice(0, 10);
    let key = `ev/${day}/${t}/${slug(b.v)}`;
    if (t === "quiz") key += `/${Math.max(0, Math.min(99, +b.s || 0))}-${Math.max(1, Math.min(99, +b.n || 1))}`;
    await S.track().set(key + "/" + randomBytes(5).toString("hex"), "1");
    return json({ ok: true });
  }
  if ((p === "/api/qvote" || p === "/api/qrate") && M === "POST") {
    const b: any = await body(req);
    const id = slug(b.id, 30);
    const qs = await getCol("pubq");
    if (!qs.some(q => q.id === b.id && isLive(q))) return json({ ok: false }, 404);
    const who = createHash("sha256").update(ip + (env("SESSION_SECRET") || "")).digest("hex").slice(0, 20);
    if (p === "/api/qvote") await S.track().set(`qv/${id}/${who}`, "1", { onlyIfNew: true });
    else { const v = b.v === "no" ? "no" : "yes"; await S.track().delete(`qr/${id}/${v === "yes" ? "no" : "yes"}/${who}`); await S.track().set(`qr/${id}/${v}/${who}`, "1"); }
    return json({ ok: true });
  }
  if (p === "/api/react" && M === "POST") {
    const b: any = await body(req);
    const r = ["up", "q", "fire"].includes(b.r) ? b.r : null;
    if (!r) return json({ ok: false }, 400);
    const ups = await getCol("updates");
    if (!ups.some(u => u.id === b.id && isLive(u))) return json({ ok: false }, 404);
    const who = createHash("sha256").update(ip + (env("SESSION_SECRET") || "")).digest("hex").slice(0, 20);
    await S.track().set(`rx/${slug(b.id, 30)}/${r}/${who}`, "1", { onlyIfNew: true });
    return json({ ok: true });
  }
  if (p === "/api/voice" && M === "POST") {
    const b: any = await body(req);
    const mm = String(b.data || "").match(/^data:(audio\/[\w.+-]+)(?:;[^,]*)?;base64,(.+)$/);
    if (!mm) return json({ ok: false, error: "Bad audio" }, 400);
    const buf = Buffer.from(mm[2], "base64");
    if (buf.length > 3 * 1024 * 1024) return json({ ok: false, error: "Too long" }, 400);
    const lock = await lockState(ip); if (lock.locked) return json({ ok: false }, 429);
    if (await overLimit(ip, "voice", 5)) return json({ ok: false, error: "Too many voice questions this hour. Try again later." }, 429);
    const key = "voice-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
    await S.files().set(key, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) as ArrayBuffer, { metadata: { type: mm[1], name: key + ".webm", size: buf.length, by: "voice question", note: "Voice question from the site" } });
    await saveSubmission("voice", { audio: key, route: String(b.route || "").slice(0, 40), lang: String(b.lang || "en").slice(0, 5), message: "(voice question, open to listen)" });
    return json({ ok: true });
  }
  if (p.startsWith("/api/media/") && M === "GET") {
    const k = decodeURIComponent(p.slice(11));
    const e = await S.media().getWithMetadata(k, { type: "arrayBuffer" });
    if (!e) return new Response("Not found", { status: 404 });
    const type = String((e.metadata as any)?.type || "image/jpeg");
    const safe = IMAGE_TYPES.test(type);
    return new Response(e.data as ArrayBuffer, { headers: {
      "content-type": safe ? type : "application/octet-stream",
      ...(safe ? {} : { "content-disposition": "attachment" }),
      "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (p === "/calendar.ics") {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SPASD Student Voice//EN", "X-WR-CALNAME:SPASD Student Voice", "CALSCALE:GREGORIAN"];
    const ev: { d: string; t: string; s: string; id: string }[] = [];
    try {
      const html = await (await fetch(new URL("/index.html", url))).text();
      const ul = html.match(/<ul class="dates" id="datelist">([\s\S]*?)<\/ul>/);
      if (ul) for (const m of ul[1].matchAll(/<li data-end="(\d{4}-\d{2}-\d{2})"[^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>/g))
        ev.push({ d: m[1], t: m[2].replace(/<[^>]+>/g, ""), s: m[3].replace(/<[^>]+>/g, ""), id: "static-" + m[1] + slug(m[2], 20) });
    } catch {}
    for (const d of (await getCol("dates")).filter(i => isLive(i))) ev.push({ d: d.date, t: d.title, s: [d.time, d.place, d.note].filter(Boolean).join(" · "), id: d.id });
    const icsEsc = (s: string) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n").replace(/&amp;/g, "&");
    for (const e of ev) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.d || "")) continue;
      const d = e.d.replace(/-/g, ""), next = new Date(Date.parse(e.d) + 864e5).toISOString().slice(0, 10).replace(/-/g, "");
      lines.push("BEGIN:VEVENT", `UID:${e.id}@spasdstudentvoice`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${icsEsc(e.t)}`, `DESCRIPTION:${icsEsc(e.s)}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.join("\r\n"), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=300" } });
  }
  if (p === "/feed.xml") {
    let xml = "";
    try { xml = await (await fetch(new URL("/feed-static.xml", url))).text(); } catch {}
    const ups = (await getCol("updates")).filter(i => isLive(i)).sort((a, b) => (a.date < b.date ? 1 : -1));
    const items = ups.map(u => `<item><title>${esc(u.title)}</title><link>${esc(url.origin)}/#updates</link><guid isPermaLink="false">${esc(u.id)}</guid><pubDate>${new Date(u.publishAt || u.date || u.updatedAt).toUTCString()}</pubDate><description>${esc(u.body)}</description></item>`).join("");
    xml = xml.includes("<item>") ? xml.replace("<item>", items + "<item>") : xml.replace("</channel>", items + "</channel>");
    return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
  }
  if (p === "/lite.html") {
    let html = "";
    try { html = await (await fetch(new URL("/lite-static.html", url))).text(); } catch {}
    const pub = await publicPayload() as any;
    let block = "";
    for (const b of pub.banner) block += `<p style="padding:10px;border:2px solid #e8561c"><b>${esc(b.title)}</b> ${esc(b.body || "")}</p>`;
    const ups = (pub.updates as any[]).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
    if (ups.length) block += "<h2>Latest</h2><ul>" + ups.map(u => `<li><b>${esc(u.date || "")}</b> ${esc(u.title)}: ${esc(u.body)}</li>`).join("") + "</ul>";
    html = html.replace(/(<body[^>]*>)/i, "$1" + block);
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120" } });
  }
  if (p === "/api/sheet.csv") {
    const st = await getSettings();
    if (!st.sheetsKey || url.searchParams.get("k") !== st.sheetsKey) return new Response("Forbidden", { status: 403 });
    const what = url.searchParams.get("c") || "inbox";
    let rows: any[];
    if (what === "inbox") rows = (await allSubmissions()).filter(s => !s.spam).map(s => ({ date: s.created, form: s.form, status: s.status, topic: s.tag, ...s.data }));
    else if (ALL_COLS.has(what)) rows = await getCol(what);
    else return new Response("Unknown", { status: 404 });
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !["by", "history"].includes(k));
    const q = csvCell;
    return new Response([cols.map(q).join(","), ...rows.map(r => cols.map(c => q(typeof r[c] === "object" ? JSON.stringify(r[c]) : r[c])).join(","))].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8" } });
  }

  /* ======== login ======== */
  if (p === "/api/config" && M === "GET") {
    return json({ google: env("GOOGLE_CLIENT_ID") || null, magic: !!(env("RESEND_API_KEY") && env("ADMIN_EMAIL")), ready: !!(env("SESSION_SECRET") && (await ownerHash())) });
  }
  if (p === "/api/login" && M === "POST") {
    const ls = await lockState(ip);
    if (ls.locked) return json({ error: `Too many wrong tries. Try again after ${new Date((ls as any).until).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })}.` }, 429);
    const b: any = await body(req);
    const email = String(b.email || "").trim().toLowerCase();
    let user: any = null;
    if (!email || email === (env("ADMIN_EMAIL") || "").toLowerCase()) {
      if (checkPassword(String(b.password || ""), await ownerHash())) user = { id: "owner", email: env("ADMIN_EMAIL") || "", name: "Owner", role: "owner" };
    } else {
      const u = (await listUsers()).find((x: any) => (x.email || "").toLowerCase() === email);
      if (u && checkPassword(String(b.password || ""), u.hash)) user = { id: u.id, email: u.email, name: u.name, role: u.role };
    }
    if (!user) {
      const left = await noteFail(ip);
      return json({ error: left > 0 ? `Wrong password. ${left} ${left === 1 ? "try" : "tries"} left before a 15-minute lock.` : "Locked for 15 minutes." }, 401);
    }
    await clearFails(ip);
    await audit(user, "Logged in", "password");
    return json({ ok: true, user }, 200, { "set-cookie": await makeCookie(user) });
  }
  if (p === "/api/google" && M === "POST") {
    const cid = env("GOOGLE_CLIENT_ID");
    if (!cid) return json({ error: "Google sign-in isn't set up." }, 400);
    const b: any = await body(req);
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(String(b.credential || "")));
    const t: any = r.ok ? await r.json() : null;
    if (!t || t.aud !== cid || String(t.email_verified) !== "true") { await noteFail(ip); return json({ error: "Google sign-in failed." }, 401); }
    const user = await findByEmail(t.email);
    if (!user) { await noteFail(ip); return json({ error: "That Google account doesn't have admin access." }, 403); }
    await audit(user, "Logged in", "Google");
    return json({ ok: true, user }, 200, { "set-cookie": await makeCookie(user) });
  }
  if (p === "/api/magic" && M === "POST") {
    const b: any = await body(req);
    const user = await findByEmail(String(b.email || ""));
    if (user && env("RESEND_API_KEY")) {
      const tok = randomBytes(24).toString("base64url");
      await S.auth().setJSON("magic/" + tok, { user, exp: Date.now() + 15 * 60 * 1000 });
      const link = `${url.origin}/api/magic?t=${tok}`;
      await sendEmail(user.email!, "Your Student Voice admin login link", `<p>Tap to log in. The link works once and expires in 15 minutes.</p><p><a href="${link}">Log in to Student Voice admin</a></p><p>If you didn't ask for this, ignore this email.</p>`);
    }
    return json({ ok: true, message: "If that email has admin access, a login link is on its way." });
  }
  if (p === "/api/magic" && M === "GET") {
    const tok = url.searchParams.get("t") || "";
    const rec: any = tok ? await S.auth().get("magic/" + tok, { type: "json" }) : null;
    if (tok) await S.auth().delete("magic/" + tok);
    if (!rec || rec.exp < Date.now()) return new Response(null, { status: 302, headers: { location: "/admin/?e=expired" } });
    await audit(rec.user, "Logged in", "email link");
    return new Response(null, { status: 302, headers: { location: "/admin/", "set-cookie": await makeCookie(rec.user) } });
  }

  /* ======== everything below needs a login ======== */
  const user = await getUser(req);
  if (!user) return json({ error: "Not logged in" }, 401);
  const refresh = { "set-cookie": await makeCookie(user) }; // sliding 30-minute idle timeout
  const ok = (d: unknown, s = 200) => json(d, s, refresh);
  const deny = () => json({ error: "Your role can't do that." }, 403, refresh);

  if (p === "/api/me") return ok({ user });
  if (p === "/api/logout" && M === "POST") return json({ ok: true }, 200, { "set-cookie": clearCookie });
  if (p === "/api/logout-all" && M === "POST") {
    if (!can(user, "owner")) return deny();
    const v = ((await S.auth().get("session-version", { type: "json" })) as any)?.v || 1;
    await S.auth().setJSON("session-version", { v: v + 1 });
    await audit(user, "Logged out everywhere");
    return json({ ok: true }, 200, { "set-cookie": clearCookie });
  }
  if (p === "/api/password" && M === "POST") {
    const b: any = await body(req);
    if (String(b.next || "").length < 10) return ok({ error: "Use at least 10 characters." }, 400);
    if (user.role === "owner") {
      if (!checkPassword(String(b.current || ""), await ownerHash())) return ok({ error: "Current password is wrong." }, 401);
      await S.auth().setJSON("owner", { hash: hashPassword(b.next) });
    } else {
      const users = await listUsers(); const u = users.find((x: any) => x.id === user.id);
      if (!u || !checkPassword(String(b.current || ""), u.hash)) return ok({ error: "Current password is wrong." }, 401);
      u.hash = hashPassword(b.next); await S.auth().setJSON("users", users);
    }
    await audit(user, "Changed password");
    return ok({ ok: true });
  }

  /* ---- users / roles ---- */
  if (p === "/api/users") {
    if (M === "GET") return ok((await listUsers()).map(({ hash, ...u }: any) => u));
    if (!can(user, "owner")) return deny();
    const users = await listUsers();
    if (M === "POST") {
      const b: any = await body(req);
      const email = String(b.email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) return ok({ error: "Enter an email." }, 400);
      if (!["editor", "viewer"].includes(b.role)) return ok({ error: "Pick a role." }, 400);
      let u = users.find((x: any) => x.email === email);
      if (!u) { u = { id: uid(), email, created: now() }; users.push(u); }
      u.name = String(b.name || "").slice(0, 60); u.role = b.role;
      if (b.password) { if (String(b.password).length < 10) return ok({ error: "Password needs 10+ characters." }, 400); u.hash = hashPassword(b.password); }
      await S.auth().setJSON("users", users);
      await audit(user, "Saved teammate", `${email} (${b.role})`);
      return ok({ ok: true });
    }
    if (M === "DELETE") {
      const id = url.searchParams.get("id");
      await S.auth().setJSON("users", users.filter((x: any) => x.id !== id));
      await audit(user, "Removed teammate", id || "");
      return ok({ ok: true });
    }
  }

  /* ---- settings ---- */
  if (p === "/api/settings") {
    if (M === "GET") { const st: any = await getSettings(); if (!can(user, "owner")) delete st.sheetsKey; return ok(st); }
    if (!can(user, "owner")) return deny();
    const b: any = await body(req);
    const cur = ((await S.data().get("settings", { type: "json" })) as any) || {};
    const allowed = ["retentionDays", "blockedWords", "redactions", "allowNames", "cwSections", "maintenance", "sheetsKey", "crisis", "replyTemplates", "digestEmail", "weeklyEmail"];
    for (const k of allowed) if (k in b) cur[k] = b[k];
    if (b.newSheetsKey) cur.sheetsKey = randomBytes(18).toString("base64url");
    await S.data().setJSON("settings", cur);
    await audit(user, "Changed settings", Object.keys(b).join(", "));
    return ok(await getSettings());
  }

  /* ---- collections ---- */
  let m = p.match(/^\/api\/c\/([a-z]+)(?:\/([\w-]+))?$/);
  if (m) {
    const [, col, id] = m;
    if (!ALL_COLS.has(col)) return ok({ error: "Unknown list" }, 404);
    const items = await getCol(col);
    if (M === "GET") return ok(items);
    if (M === "POST") {
      if (!can(user, "edit")) return deny();
      const b: any = await body(req);
      const isPublic = PUBLIC_COLS.includes(col);
      if (isPublic && b.status === "published" && user.role !== "owner") return ok({ error: "Only the owner can publish. Saved as a draft instead?" }, 403);
      const bad = badLink(b);
      if (bad) return ok({ error: `"${bad[0]}" can't use that kind of link. Use a web link (https://...), a page on this site, or an email/phone link.` }, 400);
      const i = items.findIndex(x => x.id === b.id);
      const prev = i >= 0 ? items[i] : null;
      if (isPublic && prev?.status === "published" && user.role !== "owner") return ok({ error: "This is live on the site, so only the owner can change it. Ask the owner, or make a new draft." }, 403);
      if (prev) await S.hist().setJSON(`h/${col}/${prev.id}/${Date.now()}`, prev);
      const item = { ...(prev || {}), ...b, id: prev?.id || uid(), updatedAt: now(), by: user.email || user.name || user.id };
      if (!prev) item.createdAt = now();
      if (i >= 0) items[i] = item; else items.unshift(item);
      await setCol(col, items);
      const liveNow = !item.publishAt || Date.parse(item.publishAt) <= Date.now();
      const wentLive = isPublic && liveNow && item.status === "published" && prev?.status !== "published";
      if (isPublic && liveNow && item.status === "published") {
        const st = ((await S.data().get("settings", { type: "json" })) as any) || {};
        st.lastPublished = now(); await S.data().setJSON("settings", st);
      }
      if (wentLive && col !== "changelog") {
        const cl = await getCol("changelog");
        cl.unshift({ id: uid(), status: "published", date: new Date().toISOString().slice(0, 10), title: (LABEL[col] || col) + " updated", body: String(item.title || item.text || item.body || "").slice(0, 120), auto: true, createdAt: now() });
        await setCol("changelog", cl.slice(0, 200));
      }
      await audit(user, prev ? "Edited" : "Added", `${col}: ${item.title || item.name || item.text || item.id}`);
      return ok(item);
    }
    if (M === "DELETE" && id) {
      if (!can(user, "owner")) return deny();
      const prev = items.find(x => x.id === id);
      if (prev) await S.hist().setJSON(`h/${col}/${id}/${Date.now()}`, { ...prev, _deleted: true });
      await setCol(col, items.filter(x => x.id !== id));
      await audit(user, "Deleted", `${col}: ${prev?.title || prev?.name || id}`);
      return ok({ ok: true });
    }
  }
  m = p.match(/^\/api\/hist\/([a-z]+)\/([\w-]+)$/);
  if (m) {
    const [, col, id] = m;
    if (M === "GET") {
      const { blobs } = await S.hist().list({ prefix: `h/${col}/${id}/` });
      const list = await Promise.all(blobs.slice(-30).map(async b => ({ ts: +b.key.split("/").pop()!, item: await S.hist().get(b.key, { type: "json" }) })));
      return ok(list.sort((a, b) => b.ts - a.ts));
    }
    if (M === "POST") {
      if (!can(user, "owner")) return deny();
      const b: any = await body(req);
      const old: any = await S.hist().get(`h/${col}/${id}/${+b.ts}`, { type: "json" });
      if (!old) return ok({ error: "Version not found" }, 404);
      delete old._deleted;
      const items = await getCol(col);
      const i = items.findIndex(x => x.id === id);
      if (i >= 0) { await S.hist().setJSON(`h/${col}/${id}/${Date.now()}`, items[i]); items[i] = { ...old, updatedAt: now() }; }
      else items.unshift({ ...old, updatedAt: now() });
      await setCol(col, items);
      await audit(user, "Restored an old version", `${col}: ${old.title || id}`);
      return ok({ ok: true });
    }
  }
  if (p === "/api/snapshot" && M === "POST") { // undo for the whole site's content
    if (!can(user, "owner")) return deny();
    const b: any = await body(req);
    if (b.restore) {
      const snap: any = await S.hist().get("snap/" + b.restore, { type: "json" });
      if (!snap) return ok({ error: "Not found" }, 404);
      for (const c of PUBLIC_COLS) if (snap[c]) await setCol(c, snap[c]);
      await audit(user, "Rolled back site content", new Date(+b.restore).toLocaleString("en-US", { timeZone: "America/Chicago" }));
      return ok({ ok: true });
    }
    const snap: Record<string, unknown> = {};
    for (const c of PUBLIC_COLS) snap[c] = await getCol(c);
    await S.hist().setJSON("snap/" + Date.now(), snap);
    await audit(user, "Saved a content snapshot");
    return ok({ ok: true });
  }
  if (p === "/api/snapshots" && M === "GET") {
    const { blobs } = await S.hist().list({ prefix: "snap/" });
    return ok(blobs.map(b => +b.key.slice(5)).sort((a, b) => b - a).slice(0, 40));
  }

  /* ---- inbox ---- */
  if (p === "/api/inbox") {
    if (M === "GET") return ok(await allSubmissions());
    if (M === "PATCH") {
      if (!can(user, "edit")) return deny();
      const b: any = await body(req);
      const rec: any = await S.inbox().get(String(b.key || ""), { type: "json" });
      if (!rec) return ok({ error: "Not found" }, 404);
      for (const k of ["status", "tag", "spam", "flag", "held", "notes", "approved"]) if (k in b) rec[k] = b[k];
      await S.inbox().setJSON(rec.key, rec);
      return ok(rec);
    }
    if (M === "DELETE") {
      if (!can(user, "owner")) return deny();
      const key = url.searchParams.get("key") || "";
      const rec: any = await S.inbox().get(key, { type: "json" });
      if (rec?.netlifyId && env("NETLIFY_API_TOKEN"))
        await fetch(`https://api.netlify.com/api/v1/submissions/${rec.netlifyId}`, { method: "DELETE", headers: { authorization: "Bearer " + env("NETLIFY_API_TOKEN") } }).catch(() => {});
      await S.inbox().delete(key);
      await audit(user, "Deleted a message", rec?.form || "");
      return ok({ ok: true });
    }
  }
  if (p === "/api/inbox/import" && M === "POST") {
    if (!can(user, "owner")) return deny();
    const tok = env("NETLIFY_API_TOKEN");
    if (!tok) return ok({ error: "Add a NETLIFY_API_TOKEN in Netlify first (see Settings)." }, 400);
    const have = new Set((await allSubmissions()).map(s => s.netlifyId).filter(Boolean));
    let added = 0;
    for (let page = 1; page <= 20; page++) {
      const r = await fetch(`https://api.netlify.com/api/v1/sites/${context.site.id}/submissions?per_page=100&page=${page}`, { headers: { authorization: "Bearer " + tok } });
      if (!r.ok) return ok({ error: "Netlify said no: " + r.status }, 502);
      const list: any[] = await r.json();
      for (const s of list) if (!have.has(s.id)) { await saveSubmission(s.form_name, s.data || {}, { netlifyId: s.id, created: s.created_at }); added++; }
      if (list.length < 100) break;
    }
    await audit(user, "Imported old messages", String(added));
    return ok({ ok: true, added });
  }
  if (p === "/api/inbox/reply" && M === "POST") {
    if (!can(user, "edit")) return deny();
    const b: any = await body(req);
    const rec: any = await S.inbox().get(String(b.key || ""), { type: "json" });
    const to = rec?.data?.email || rec?.data?.Email;
    if (!to) return ok({ error: "This message has no email to reply to." }, 400);
    const r = await sendEmail(to, "Re: your message to SPASD Student Voice", `<p>${esc(b.text).replace(/\n/g, "<br>")}</p><p>— SPASD Student Voice</p>`);
    if (!r.ok) return ok({ error: r.reason }, 400);
    rec.status = "answered"; rec.replied = now(); await S.inbox().setJSON(rec.key, rec);
    await audit(user, "Replied by email", rec.form);
    return ok({ ok: true });
  }

  /* ---- checks ---- */
  if (p === "/api/check" && M === "POST") { const b: any = await body(req); return ok(await checkText(String(b.text || ""))); }
  if (p === "/api/linkcheck" && M === "GET") {
    const html = await (await fetch(new URL("/index.html", url))).text();
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    const views = new Set([...html.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]));
    const badGo = [...new Set([...html.matchAll(/data-go="([^"]+)"/g)].map(m => m[1]))].filter(g => !ids.has(g) && !views.has(g));
    const refs = [...new Set([...html.matchAll(/\s(?:href|src)="([^"#]+)/g)].map(m => m[1]))].filter(h => !/^(mailto:|tel:|javascript:|data:|sms:)/.test(h));
    const results: { url: string; status: number | string }[] = [];
    const check = async (h: string) => {
      const u = new URL(h, url);
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
        let r = await fetch(u, { method: "HEAD", redirect: "follow", signal: ctl.signal });
        if (r.status === 405 || r.status === 403) r = await fetch(u, { method: "GET", redirect: "follow", signal: ctl.signal });
        clearTimeout(t);
        if (r.status >= 400) results.push({ url: h, status: r.status });
      } catch (e) { results.push({ url: h, status: "no answer" }); }
    };
    const list = refs.slice(0, 120);
    for (let i = 0; i < list.length; i += 10) await Promise.all(list.slice(i, i + 10).map(check));
    return ok({ checked: list.length, broken: results, badGo });
  }

  /* ---- stats ---- */
  if (p === "/api/stats" && M === "GET") {
    const days = Math.min(90, +(url.searchParams.get("days") || 30));
    const counts: Record<string, Record<string, number>> = { view: {}, tab: {}, qr: {} };
    const perDay: Record<string, number> = {};
    const quiz: Record<string, { n: number; pct: number }> = {};
    for (let d = 0; d < days; d++) {
      const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      const { blobs } = await S.track().list({ prefix: `ev/${day}/` });
      for (const b of blobs) {
        const [, , t, v, sc] = b.key.split("/");
        if (t === "view") perDay[day] = (perDay[day] || 0) + 1;
        if (t === "quiz") { const [s, n] = sc.split("-").map(Number); const q = (quiz[v] ||= { n: 0, pct: 0 }); q.pct = (q.pct * q.n + (s / n) * 100) / (q.n + 1); q.n++; }
        else if (counts[t]) counts[t][v] = (counts[t][v] || 0) + 1;
      }
    }
    return ok({ days, perDay, tabs: counts.tab, qr: counts.qr, quiz });
  }

  /* ---- uploads ---- */
  if ((p === "/api/media" || p === "/api/files") && M === "POST") {
    if (!can(user, "edit")) return deny();
    const b: any = await body(req);
    const mm = String(b.data || "").match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!mm) return ok({ error: "Bad file" }, 400);
    if (p === "/api/media" && !IMAGE_TYPES.test(mm[1])) return ok({ error: "Public media must be a PNG, JPG, GIF, WebP or AVIF image." }, 400);
    const buf = Buffer.from(mm[2], "base64");
    if (buf.length > 4 * 1024 * 1024) return ok({ error: "Max 4 MB per file." }, 400);
    const key = Date.now().toString(36) + "-" + slug(b.name || "file", 50);
    const st = p === "/api/media" ? S.media() : S.files();
    await st.set(key, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) as ArrayBuffer, { metadata: { type: mm[1], name: String(b.name || "file").slice(0, 120), size: buf.length, by: user.email || user.id, note: String(b.note || "").slice(0, 300) } });
    await audit(user, "Uploaded", `${p.slice(5)}: ${b.name}`);
    return ok({ ok: true, key, url: p === "/api/media" ? "/api/media/" + key : null });
  }
  if (p === "/api/files" && M === "GET") {
    const { blobs } = await S.files().list();
    return ok(await Promise.all(blobs.map(async b => ({ key: b.key, ...((await S.files().getMetadata(b.key))?.metadata || {}) }))));
  }
  m = p.match(/^\/api\/files\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    if (M === "DELETE") { if (!can(user, "owner")) return deny(); await S.files().delete(key); await audit(user, "Deleted file", key); return ok({ ok: true }); }
    const e = await S.files().getWithMetadata(key, { type: "arrayBuffer" });
    if (!e) return new Response("Not found", { status: 404 });
    const md: any = e.metadata || {};
    return new Response(e.data as ArrayBuffer, { headers: { "content-type": md.type || "application/octet-stream", "content-disposition": `attachment; filename="${String(md.name || key).replace(/"/g, "")}"`, "cache-control": "private, no-store" } });
  }

  /* ---- backup, log, email test ---- */
  if (p === "/api/export" && M === "GET") {
    if (!can(user, "owner")) return deny();
    const out: Record<string, unknown> = { exported: now(), settings: await getSettings(), inbox: await allSubmissions() };
    for (const c of ALL_COLS) out[c] = await getCol(c);
    await audit(user, "Downloaded a backup");
    return new Response(JSON.stringify(out, null, 1), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="student-voice-backup-${now().slice(0, 10)}.json"`, ...refresh } });
  }
  if (p === "/api/log" && M === "GET") {
    const month = url.searchParams.get("m") || now().slice(0, 7);
    return ok(((await S.data().get("log/" + month, { type: "json" })) as any[]) || []);
  }
  if (p === "/api/email-test" && M === "POST") {
    if (!can(user, "owner")) return deny();
    const r = await sendEmail(env("ADMIN_EMAIL") || "", "Student Voice admin: test email", "<p>Email works.</p>");
    return ok(r);
  }

  return ok({ error: "Not found" }, 404);
};

export const config: Config = { path: ["/api/*", "/feed.xml", "/lite.html", "/calendar.ics"] };
