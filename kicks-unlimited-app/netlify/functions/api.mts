// Kicks Unlimited app API — logins, the shared studio data, and email/text delivery.
import {
  loadState, saveState, resetState, staffByName, view, actor, applyChanges, deliver, queue, newSession, getSession, endSession,
  limited, failHit, failClear, sha, uid, code6, normName, validEmail, DEFAULT_PW, today, ARR, OBJ2, OBJ, SCALAR,
  pwCheck, pwSet, pwHash, pwLegacy, setTempPw, mustChangePw, isStarterInput, StateConflict, withState,
} from "../lib/state.mts";
import { mailOn, smsOn } from "../lib/mail.mts";
import { kv } from "../lib/store.mts";
import { pushOn, vapidPublic, pushTo, notifyChanges, snapshot } from "../lib/push.mts";
import { eventBilling, orderBilling, readArchive, tell } from "../lib/state.mts";
import { sendSMS } from "../lib/mail.mts";
import crypto from "node:crypto";
import { aiOn, aiAnswer, icsFor, stripe, logError, autopayRun, staffIcs, subTok, creditBal, packCredit } from "../lib/extra.mts";
import { R3 } from "../lib/state.mts";
const STRIPE = () => process.env.STRIPE_SECRET_KEY || "";
/* who has a real spot (not waitlisted) in each capped event */
function waitIn(S: any) { const r: any = {}; for (const e of S.events || []) { const cap = +e.spots || 0; if (!cap) continue; r[e.id] = (S.signups || []).filter((s: any) => s.eventId === e.id).sort((a: any, b: any) => (a.ts || 0) - (b.ts || 0)).slice(0, cap).map((s: any) => s.studentId); } return r; }
/* gift cards pay open bills oldest first; discount codes take money off the newest open bill they fit */
function redeem(S: any, fid: string, code: string, es: boolean) {
  const L = (a: string, b: string) => (es ? b : a), m = (c: number) => "$" + (c / 100).toFixed(2);
  const open = S.invoices.filter((i: any) => i.familyId === fid && i.status === "open").sort((a: any, b: any) => String(a.due).localeCompare(String(b.due)));
  const g = (S.giftCards || []).find((x: any) => x.code === code);
  if (g) {
    if (!(g.balance > 0)) throw bad(L("That gift card is used up.", "Esa tarjeta ya no tiene saldo."));
    let used = 0;
    for (const i of open) { if (g.balance <= 0) break; const take = Math.min(g.balance, i.amount); i.amount -= take; g.balance -= take; used += take; i.gift = [...(i.gift || []), { code, amt: take }]; if (i.amount <= 0) Object.assign(i, { amount: 0, status: "paid", paidAt: Date.now(), method: "Gift card" }); }
    if (!used) throw bad(L("No open bills to use it on.", "No hay facturas pendientes."));
    return L(`${m(used)} from the gift card applied. ${m(g.balance)} left on it.`, `Se aplicaron ${m(used)} de la tarjeta. Quedan ${m(g.balance)}.`);
  }
  const c = (S.codes || []).find((x: any) => x.code === code && x.on !== false);
  if (!c || (c.until && c.until < today()) || (c.max && (c.used || 0) >= c.max)) throw bad(L("That code isn't valid.", "Ese código no es válido."));
  const fits = (i: any) => !i.disc && (c.scope === "all" || (c.scope === "events" && i.eventId) || (c.scope === "shop" && i.orderId) || (c.scope === "tuition" && i.tuitionKey));
  const inv = open.slice().reverse().find(fits);
  if (!inv) throw bad(L("That code doesn't fit any of your open bills.", "Ese código no aplica a sus facturas pendientes."));
  const off = Math.min(inv.amount, c.kind === "pct" ? Math.round(inv.amount * Math.min(100, c.val) / 100) : Math.round(c.val * 100));
  inv.amount -= off; inv.disc = { code, amt: off }; c.used = (c.used || 0) + 1; if (inv.amount <= 0) Object.assign(inv, { amount: 0, status: "paid", paidAt: Date.now(), method: "Discount" });
  return L(`${m(off)} off ${inv.desc}`, `${m(off)} de descuento en ${inv.descEs || inv.desc}`);
}
const T = (v: any, n: number) => String(v == null ? "" : v).trim().slice(0, n);

export const config = { path: "/api/*" };

class Err extends Error {
  code: number;
  constructor(code: number, msg: string) { super(msg); this.code = code; }
}
const bad = (m: string, code = 400) => new Err(code, m);
const J = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const mask = (e: string) => { const [u, d] = String(e).split("@"); return (u.length <= 2 ? u[0] + "•" : u.slice(0, 2) + "•••") + "@" + d; };
const STUDIO_HELP = "the front desk — call or text (608) 834-9992 for your code";

async function out(S: any, sess: any) {
  const me = actor(S, sess);
  const v = view(S, me);
  return { view: v, ver: sha(JSON.stringify(v)).slice(0, 20), me: me ? { kind: sess.kind, id: me.id, role: me.role, view: !!(sess.g && ((me.rec.guardians || []).find((x: any) => x.email === sess.g) || {}).view) } : null };
}

/* the body can only be read once, so read it here; if two saves collide the whole request re-runs on fresh data */
export default async (req: Request) => {
  const raw = req.method === "POST" ? await req.text() : "";
  try { return await withState(() => handle(req, raw)); }
  catch (e) { console.error(e); return J({ error: "The studio app is busy — try again in a moment." }, 503); }
};
const viewOnly = (me: any, sess: any) => !!(sess && sess.g && me && ((me.rec.guardians || []).find((x: any) => x.email === sess.g) || {}).view);
const MUST_PW_OK = ["state", "password", "logout"];

async function handle(req: Request, raw: string) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    if (raw.length > (path === "media" ? 5_800_000 : 4_000_000)) throw bad("That's too big to save.");
    let body: any = {}; if (raw && path !== "stripe-webhook") { try { body = JSON.parse(raw); } catch { body = {}; } }

    if (path === "health") return J({ kicks: true, mail: mailOn(), sms: smsOn(), push: pushOn(), vapid: vapidPublic(), stripe: !!STRIPE(), ai: aiOn() });

    // public images (team photos, gallery)
    if (req.method === "GET" && path.startsWith("media/")) {
      const db = await kv();
      const m = await db.get("media/" + path.slice(6).replace(/[^\w-]/g, ""));
      if (!m) return new Response("Not found", { status: 404 });
      return new Response(Buffer.from(m.b64, "base64"), { headers: { "content-type": m.type, "cache-control": "public, max-age=31536000, immutable" } });
    }

    const S = await loadState();
    if (req.method === "GET" && /^cal\/[\w-]{10,60}\.ics$/.test(path)) { // a family's live calendar feed (secret link)
      const key = path.slice(4, -4), f = S.families.find((x: any) => x.calKey === key && x.status === "approved");
      if (!f) return new Response("Not found", { status: 404 });
      return new Response(icsFor(S, f), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
    }
    if (req.method === "GET" && /^scal\/[\w-]{10,60}\.ics$/.test(path)) { // a staff member's shifts feed
      const key = path.slice(5, -4), m = S.staff.find((x: any) => x.calKey === key); if (!m) return new Response("Not found", { status: 404 });
      return new Response(staffIcs(S, m), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
    }
    if (req.method === "GET" && path === "unsub") { const e = String(url.searchParams.get("e") || "").toLowerCase(), t = url.searchParams.get("t") || ""; if (t === subTok(e)) { S.newsSubs = (S.newsSubs || []).filter((x: any) => x.email !== e); await saveState(S); } return new Response("<p style='font:18px system-ui;padding:40px'>You're unsubscribed from the Kicks Unlimited newsletter.</p>", { headers: { "content-type": "text/html" } }); }
    if (["hit", "rsvp", "party-rsvp", "sub", "space-req", "guest-shop", "gift-buy", "reviews", "alumni"].includes(path)) {
      const ipk = req.headers.get("x-nf-client-connection-ip") || "x";
      if (path === "hit") { const db = await kv(), d = today(), k = "hits/" + d, h = (await db.get(k)) || {}; const pg = T(body.p, 40).replace(/[^\w/-]/g, "") || "/", src = T(body.src, 40).replace(/[^\w-]/g, ""); h[pg] = (h[pg] || 0) + 1; if (src) h["src:" + src] = (h["src:" + src] || 0) + 1; if (body.first) h["_visits"] = (h["_visits"] || 0) + 1; await db.set(k, h); return J({ ok: true }); }
      if (path === "reviews") { const key = process.env.GOOGLE_PLACES_KEY, pid = process.env.GOOGLE_PLACE_ID; if (!key || !pid) return J({ reviews: [] }); const db = await kv(), c = await db.get("reviews"); if (c && Date.now() - c.ts < 864e5) return J(c.data); const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(pid)}?fields=rating,userRatingCount,reviews,googleMapsUri`, { headers: { "X-Goog-Api-Key": key } }); const j: any = await r.json().catch(() => ({})); const data = r.ok ? { rating: j.rating || 0, count: j.userRatingCount || 0, url: j.googleMapsUri || "", reviews: (j.reviews || []).filter((x: any) => (x.rating || 0) >= 4).slice(0, 5).map((x: any) => ({ name: (x.authorAttribution || {}).displayName || "", text: ((x.originalText || x.text || {}).text || "").slice(0, 500), rating: x.rating, when: x.relativePublishTimeDescription || "" })) } : { reviews: [] }; await db.set("reviews", { ts: Date.now(), data }); return J(data); }
      if (await limited("pub:" + path + ":" + ipk)) throw bad("That's a lot of tries — please call (608) 834-9992.", 429);
      await failHit("pub:" + path + ":" + ipk);
      if (path === "rsvp") { const e = S.events.find((x: any) => x.id === body.eventId && x.aud !== "staff" && x.rsvp); if (!e) throw bad("That event isn't taking RSVPs."); const name = T(body.name, 80); if (!name) throw bad("Add your name."); S.rsvps = S.rsvps || []; S.rsvps.push({ id: uid("rv"), eventId: e.id, name, email: validEmail(body.email) ? T(body.email, 120) : "", n: Math.max(1, Math.min(10, parseInt(body.n) || 1)), ts: Date.now() }); await saveState(S); return J({ ok: true }); }
      if (path === "party-rsvp") { const pt = S.parties.find((x: any) => x.id === body.partyId && x.rsvpKey && x.rsvpKey === body.key); if (!pt) throw bad("That invite link isn't working. Ask the family for a new one."); const name = T(body.name, 80); if (!name) throw bad("Add your child's name."); S.partyGuests = S.partyGuests || []; S.partyGuests.push({ id: uid("pg"), partyId: pt.id, name, parent: T(body.parent, 80), phone: T(body.phone, 30), going: body.going !== false, allergies: T(body.allergies, 200), ts: Date.now() }); await saveState(S); return J({ ok: true }); }
      if (path === "alumni") { const name = T(body.name, 80), email = T(body.email, 120).toLowerCase(); if (!name || !validEmail(email) || !body.ok) throw bad("Add your name, email and tick the box."); (S.alumni = S.alumni || []).push({ id: uid("al"), name, email, years: T(body.years, 40), rank: T(body.rank, 60), note: T(body.note, 400), ts: Date.now() }); await saveState(S); return J({ ok: true }); }
      if (path === "sub") { const e = T(body.email, 120).toLowerCase(); if (!validEmail(e)) throw bad("Check the email."); S.newsSubs = S.newsSubs || []; if (!S.newsSubs.some((x: any) => x.email === e)) S.newsSubs.push({ id: uid("sb"), email: e, ts: Date.now(), lang: body.lang === "es" ? "es" : "en" }); (S.consents = S.consents || []).unshift({ id: uid("cs"), ts: Date.now(), who: e, what: "newsletter", v: true }); await saveState(S); return J({ ok: true }); }
      if (path === "space-req") { const name = T(body.name, 80), phone = T(body.phone, 30); if (!name || !phone) throw bad("Add your name and phone."); S.spaceReqs = S.spaceReqs || []; S.spaceReqs.push({ id: uid("sq"), name, phone, email: validEmail(body.email) ? T(body.email, 120) : "", group: T(body.group, 100), date: T(body.date, 10), time: T(body.time, 20), people: T(body.people, 10), note: T(body.note, 600), status: "new", ts: Date.now() }); if (S.mail && S.mail.addr) queue(S, S.mail.addr, `Space rental request: ${T(body.group, 60) || name}`, `${name} · ${phone}\n${T(body.date, 10)} ${T(body.time, 20)} · ${T(body.people, 10)} people\n${T(body.note, 600)}\n\nStudio admin → Studio → Rentals.`); await saveState(S); return J({ ok: true }); }
      if (path === "guest-shop" || path === "gift-buy") {
        if (!STRIPE()) throw bad("Online payments aren't set up yet — call (608) 834-9992.");
        const name = T(body.name, 80), email = T(body.email, 120).toLowerCase(); if (!name || !validEmail(email)) throw bad("Add your name and email.");
        let lines: any[] = [], meta: any = {};
        if (path === "gift-buy") { const amt = Math.round((+body.amount || 0) * 100); if (amt < 1000 || amt > 50000) throw bad("Gift cards are $10 to $500."); lines = [{ name: "Kicks Unlimited gift card", amount: amt, qty: 1 }]; meta = { kind: "gift", to: T(body.to, 80), msg: T(body.msg, 200) }; }
        else { const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20).map((i: any) => { const it = (S.inventory || []).find((q: any) => q.id === i.id && q.pub && (+q.qty || 0) > 0); return it ? { id: it.id, name: it.name + (it.size ? ` (${it.size})` : ""), qty: Math.max(1, Math.min(+it.qty || 1, parseInt(i.qty) || 1)), price: +it.price } : null; }).filter(Boolean); if (!items.length) throw bad("Pick something first."); const o = { id: uid("or"), familyId: "", guest: { name, email, phone: T(body.phone, 30) }, items, status: "unpaid", ts: Date.now(), billed: true }; S.orders.push(o); lines = items.map((i: any) => ({ name: i.name, amount: Math.round(i.price * 100), qty: i.qty })); meta = { kind: "guest", order: o.id }; await saveState(S); }
        const origin = new URL(req.url).origin, f = new URLSearchParams({ mode: "payment", customer_email: email, success_url: `${origin}/#/${path === "gift-buy" ? "gift" : "shop"}?paid=1`, cancel_url: `${origin}/#/${path === "gift-buy" ? "gift" : "shop"}`, "metadata[kind]": meta.kind, "metadata[name]": name, "metadata[email]": email, ...(meta.order ? { "metadata[order]": meta.order } : {}), ...(meta.to ? { "metadata[to]": meta.to } : {}), ...(meta.msg ? { "metadata[msg]": meta.msg } : {}) });
        lines.forEach((l: any, n: number) => { f.set(`line_items[${n}][quantity]`, String(l.qty)); f.set(`line_items[${n}][price_data][currency]`, "usd"); f.set(`line_items[${n}][price_data][unit_amount]`, String(l.amount)); f.set(`line_items[${n}][price_data][product_data][name]`, l.name); });
        const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: "Bearer " + STRIPE(), "content-type": "application/x-www-form-urlencoded" }, body: f });
        const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw bad("Couldn't open checkout. Try again."); return J({ url: j.url });
      }
    }
    if (path === "sms-in") { // Twilio: a family texted the studio number → it lands in their portal messages
      const tok = process.env.TWILIO_TOKEN || "", params = Object.fromEntries(new URLSearchParams(raw));
      const sigOk = (() => { const data = url.origin + url.pathname + Object.keys(params).sort().map((k) => k + params[k]).join(""); const want = crypto.createHmac("sha1", tok).update(data).digest("base64"), got = req.headers.get("x-twilio-signature") || ""; return !!tok && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want)); })();
      const twiml = (t = "") => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${t ? `<Message>${t.replace(/[<&>]/g, "")}</Message>` : ""}</Response>`, { headers: { "content-type": "text/xml" } });
      if (!sigOk) return new Response("Forbidden", { status: 403 });
      const digits = (x: any) => String(x || "").replace(/\D/g, "").slice(-10), from = digits(params.From), text = String(params.Body || "").trim().slice(0, 1500);
      const f = from.length === 10 ? S.families.find((x: any) => digits(x.phone) === from && x.status !== "declined") : null;
      if (!f || !text) return twiml(f ? "" : "Kicks Unlimited: we couldn't match this number to a family account. Please call (608) 834-9992.");
      S.messages.push({ id: uid("m"), familyId: f.id, from: "family", by: f.parent + " (text)", text, ts: Date.now(), read: false, sms: true });
      await saveState(S); return twiml();
    }
    if (path === "err") { const lim = "err:" + (req.headers.get("x-nf-client-connection-ip") || ""); if (!(await limited(lim))) { await failHit(lim); await logError(body, ""); } return J({ ok: true }); }
    if (path === "beat") { const db = await kv(); await db.set("kiosk/beat", { ts: Date.now(), date: today() }); return J({ ok: true }); }
    let sess = await getSession(req);
    if (sess && !actor(S, sess)) sess = null;
    // logged in with a starter/temporary password: nothing else works until they pick their own
    if (sess && sess.mustPw && !MUST_PW_OK.includes(path)) throw bad("Pick your own password first (it pops up right after you log in). Log out and back in if you closed it.", 403);
    // view-only logins (e.g. grandparents) can look but not pay, change or upload
    if (viewOnly(actor(S, sess), sess) && ["sync", "pay", "split-pay", "buy-pack", "redeem", "autopay-setup", "autopay-off", "cal-key", "media", "pay-credit"].includes(path)) throw bad("This is a view-only login.", 403);

    switch (path) {
      case "state": {
        const o = await out(S, sess);
        if (url.searchParams.get("v") && url.searchParams.get("v") === o.ver) return J({ same: true });
        return J(o);
      }

      case "sync": {
        const me = actor(S, sess);
        if (!me) throw bad("Please log in again.", 401);
        if (sess.g) { const gg = (me.rec.guardians || []).find((x: any) => x.email === sess.g); if (gg && gg.view) return J({ rejected: (body.changes || []).map((x: any) => ({ c: x.c, id: x.id, why: "view-only" })), ...(await out(S, sess)) }); }
        const before: any = snapshot(S); before.fams = Object.fromEntries(S.families.map((f: any) => [f.id, { w: !!(f.waiver && f.waiver.date), t: !!(f.notify && f.notify.text) }])); before.kids = Object.fromEntries(S.students.map((k: any) => [k.id, !!k.photo])); const inBefore = waitIn(S), evBefore = new Set(S.events.map((e: any) => e.id)), msgBefore = new Set(S.messages.map((m: any) => m.id));
        const rejected = applyChanges(S, me, body.changes);
        // change history for owners and the front desk
        if (me && ["admin", "desk"].includes(me.role)) { const rj = new Set(rejected.map((r: any) => r.c + ":" + r.id)); const QUIET = ["chat", "checks", "bdsign", "reacts", "otw", "chLog", "audit", "asp"]; S.audit = S.audit || []; for (const x of (body.changes || []).slice(0, 500)) { if (!x || QUIET.includes(x.c) || rj.has(x.c + ":" + x.id)) continue; S.audit.unshift({ id: uid("au"), ts: Date.now(), by: me.rec.name, role: me.role, c: String(x.c).slice(0, 30), op: String(x.op).slice(0, 6), rid: String(x.id || x.sub || "").slice(0, 60), f: x.op === "patch" && x.set ? Object.keys(x.set).slice(0, 8).join(",") : "" }); } if (S.audit.length > 3000) S.audit.length = 3000; }
        // closures: push every family that turned notifications on
        for (const e of S.events.filter((x: any) => !evBefore.has(x.id) && x.noClasses && x.date >= today() && x.date <= new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10))) for (const f of S.families.filter((x: any) => x.status === "approved" && Array.isArray(x.push) && x.push.length)) await pushTo(f, "closed", { title: f.lang === "es" ? `Kicks cerrado: ${e.date}` : `Kicks closed: ${e.date}`, body: (f.lang === "es" && e.titleEs) || e.title, url: "/#/family/calendar" }).catch(() => false);
        // studio replies also go out by text to families who chose texts (they can text back)
        if (smsOn() && (S.billing || {}).msgText !== false) for (const m of S.messages.filter((x: any) => !msgBefore.has(x.id) && x.from === "studio")) { const f = S.families.find((x: any) => x.id === m.familyId); if (f && f.phone && f.notify && f.notify.text) queue(S, f.phone, "Text message", `Kicks Unlimited: ${String(m.text).slice(0, 600)}${f.lang === "es" ? " (Responda a este número o use el portal)" : " (Reply here or in the family portal)"}`, "text"); }
        eventBilling(S); orderBilling(S); packCredit(S);
        // consent log: waivers, photo permission, texts
        { const cs = (S.consents = S.consents || []), who = me ? me.rec.name || me.rec.parent : "";
          for (const f of S.families) { const b = before.fams && before.fams[f.id]; if (!b) continue; if (!!(f.waiver && f.waiver.date) !== b.w && f.waiver) cs.unshift({ id: uid("cs"), ts: Date.now(), who: f.parent, fid: f.id, what: "waiver", v: true, by: who }); if (!!(f.notify && f.notify.text) !== b.t) cs.unshift({ id: uid("cs"), ts: Date.now(), who: f.parent, fid: f.id, what: "texts", v: !!(f.notify && f.notify.text), by: who }); }
          for (const k of S.students) { const b = before.kids && before.kids[k.id]; if (b !== undefined && b !== !!k.photo) cs.unshift({ id: uid("cs"), ts: Date.now(), who: k.name, fid: k.familyId, what: "photos", v: !!k.photo, by: who }); }
          if (cs.length > 3000) cs.length = 3000; }        // waitlist: tell families whose kid just moved into a spot
        if ((S.billing || {}).waitText !== false) for (const [eid, ids] of Object.entries(waitIn(S)) as any) for (const sid of ids) if (inBefore[eid] && !inBefore[eid].includes(sid)) { const e = S.events.find((x: any) => x.id === eid), k = S.students.find((x: any) => x.id === sid), f = k && S.families.find((x: any) => x.id === k.familyId); if (e && k && f) { const fn = String(k.name).split(" ")[0]; tell(S, f, [`${fn} is in! — ${e.title}`, `¡${fn} tiene lugar! — ${e.titleEs || e.title}`], [`Good news: a spot opened up and ${fn} is now signed up for ${e.title} on ${e.date}.`, `Buenas noticias: se abrió un lugar y ${fn} ya está inscrito en ${e.titleEs || e.title} el ${e.date}.`]); } }
        for (const i of (S.incidents || []).filter((x: any) => !before.incidents.has(x.id))) {
          const st = S.students.find((x: any) => x.id === i.studentId);
          if (S.mail && S.mail.addr) queue(S, S.mail.addr, `Incident report: ${st ? st.name : i.name || "student"} (${i.date})`, `Where: ${i.where}\nWhat happened: ${i.what}\nInjury: ${i.injury || "—"}\nFirst aid: ${i.aid || "—"}\nParent told: ${i.told || "Not yet"}\n\nReview it in Studio admin → Incidents.`);
        }
        // sub-finder: text the people who are free that day and asked for sub texts
        for (const sb of (S.subs || []).filter((x: any) => !before.subs.has(x.id) && x.status === "open")) {
          const sh = S.shifts.find((x: any) => x.id === sb.shiftId), who = S.staff.find((m: any) => m.id === sb.by);
          for (const id of sb.asked || []) { const m = S.staff.find((x: any) => x.id === id); if (m && m.textSubs && m.phone && smsOn()) await sendSMS(m.phone, `Kicks: ${who ? who.name : "Someone"} needs a sub ${sb.date}${sh ? " " + sh.s + "–" + sh.e : ""}. You're free that day — open the app to cover it.`).catch(() => {}); }
        }
        await notifyChanges(S, before, me ? me.id : "");
        await deliver(S);
        await saveState(S);
        return J({ ...(await out(S, sess)), rejected });
      }

      case "login": {
        const kind = body.kind === "admin" ? "admin" : body.kind === "staff" ? "staff" : "family";
        const who = kind === "family" ? String(body.email || "").toLowerCase().trim() : normName(body.name);
        const rl = kind + ":" + who;
        if (await limited(rl)) throw bad("Too many tries. Wait 10 minutes, or tap “Forgot password?”.", 429);
        let rec: any = null;
        let guard: any = null;
        if (kind === "family") { rec = S.families.find((f: any) => String(f.email).toLowerCase() === who); if (!rec) { rec = S.families.find((f: any) => (f.guardians || []).some((g: any) => g.email === who)); guard = rec && rec.guardians.find((g: any) => g.email === who); } }
        else rec = staffByName(S, body.name);
        const pwRec = guard || rec;
        const codeOk = kind === "family" || (!!(S.rankCodes || {})[rec && rec.role] && String(body.code) === String((S.rankCodes || {})[rec.role]));
        const ok = rec && pwCheck(pwRec, body.pw) && (kind === "family" ? rec.status !== "declined" : codeOk);
        if (!ok) { await failHit(rl); throw bad(kind === "family" ? "That email and password don't match. Try again or tap “Forgot password?”." : "Your name, password or rank code doesn't match.", 401); }
        if (kind === "family" && rec && (S.site || {}).pilot && !rec.pilot) throw bad("The Kicks family app opens soon — we're testing it with a few families first. Call (608) 834-9992 with any questions.", 403);
        if (kind === "admin" && rec.role !== "admin") throw bad("Only owners and managers can open studio admin.", 403);
        await failClear(rl);
        let dirty = false;
        if (kind === "family" && rec.verified === false) { rec.verified = true; dirty = true; }
        if (pwLegacy(pwRec)) { pwSet(pwRec, body.pw); dirty = true; } // move older accounts to salted hashes
        if (dirty) await saveState(S);
        const must = mustChangePw(pwRec);
        const token = await newSession(kind, rec.id, { ...(guard ? { g: guard.email } : {}), ...(must ? { mustPw: true } : {}) });
        return J({ token, pwDefault: must, ...(await out(S, { kind, id: rec.id })) });
      }

      case "logout":
        await endSession(sess);
        return J({ ok: true });

      case "signup": {
        const email = String(body.email || "").trim();
        if (!body.parent || !email || !body.phone) throw bad("Please fill in your name, email and phone.");
        if (!validEmail(email)) throw bad("That email doesn't look right.");
        if (S.families.some((f: any) => String(f.email).toLowerCase() === email.toLowerCase())) throw bad("There's already an account with that email. Try logging in.");
        if (!/^[0-9a-f]{64}$/.test(String(body.pw))) throw bad("Pick a password.");
        const kids = Array.isArray(body.kids) ? body.kids.slice(0, 8) : [];
        if (!kids.length || kids.some((k: any) => !k.name)) throw bad("Add each student's name.");
        if (!body.sig) throw bad("Please sign the waiver.");
        if (await limited("signup:" + (req.headers.get("x-nf-client-connection-ip") || ""))) throw bad("That's a lot of sign-ups — please call (608) 834-9992.", 429);
        await failHit("signup:" + (req.headers.get("x-nf-client-connection-ip") || ""));
        const fam = { id: uid("f"), parent: String(body.parent).slice(0, 80), email, phone: String(body.phone).slice(0, 30), pw: pwHash(body.pw), status: "pending", created: Date.now(), pickup: [String(body.parent).slice(0, 80)], emergency: "", verified: true, lang: body.lang === "es" ? "es" : "en", notify: { email: true, text: !!body.texts }, autopay: false, waiver: { name: String(body.sig).slice(0, 80), date: today() } };
        const wp = String(body.planId || ""); if ((S.memberships || []).some((m: any) => m.id === wp && m.pub)) (fam as any).wantPlan = wp;
        S.families.push(fam);
        for (const k of kids) S.students.push({ id: uid("s"), name: String(k.name).slice(0, 80), dob: k.dob || "", prog: ["ln", "kids", "adult"].includes(k.prog) ? k.prog : "kids", belt: 0, stripes: [], spar: 0, asp: !!k.asp, camp: !!k.camp, photo: !!k.photo, familyId: fam.id, att: [], notes: "", status: "pending" });
        if (S.mail && S.mail.addr) queue(S, S.mail.addr, `New family sign-up: ${fam.parent}`, `${fam.parent} (${fam.email}, ${fam.phone}) signed up with ${kids.map((k: any) => k.name).join(", ")}. Approve them in Studio admin → Families.`);
        await deliver(S);
        await saveState(S);
        const token = await newSession("family", fam.id);
        return J({ token, ...(await out(S, { kind: "family", id: fam.id })) });
      }

      case "forgot": {
        const fam = body.kind === "family";
        if (await limited("forgot:" + String(body.who).toLowerCase())) throw bad("Too many tries. Wait 10 minutes.", 429);
        await failHit("forgot:" + String(body.who).toLowerCase());
        const wq = String(body.who || "").toLowerCase().trim();
        const rec: any = fam ? (S.families.find((f: any) => String(f.email).toLowerCase() === wq) || S.families.flatMap((f: any) => f.guardians || []).find((g: any) => g.email === wq)) : staffByName(S, body.who);
        if (!rec) throw bad(fam ? "We couldn't find an account with that email. Call or text the front desk." : "We couldn't find that name. Use your first and last name.");
        const email = fam ? rec.email : rec.emailOk ? rec.email : "";
        if (!email) {
          S.resetReqs.push({ id: uid("r"), staff: rec.id, ts: Date.now() });
          await saveState(S);
          return J({ step: 3, msg: "You don't have a verified email yet, so we sent a reset request to the owners. They'll give you a temporary password — then add your email in My profile." });
        }
        const c = code6();
        rec.reset = { code: sha(c), exp: Date.now() + 15 * 60 * 1000 };
        if (mailOn()) {
          queue(S, email, "Your Kicks Unlimited reset code", `Your password reset code is ${c}. It expires in 15 minutes. If you didn't ask for this, you can ignore it.`);
          await deliver(S); await saveState(S);
          return J({ step: 2, to: mask(email) });
        }
        // no email service yet: the code waits in the studio's outbox so the front desk can pass it on
        queue(S, email, "Your Kicks Unlimited reset code", `Your password reset code is ${c}. It expires in 15 minutes.`);
        await saveState(S);
        return J({ step: 2, to: STUDIO_HELP });
      }

      case "reset": {
        const fam = body.kind === "family";
        const wq = String(body.who || "").toLowerCase().trim();
        const ip = "reset-ip:" + (req.headers.get("x-nf-client-connection-ip") || "");
        if ((await limited("reset:" + wq)) || (await limited(ip))) throw bad("Too many tries. Wait 10 minutes, then ask for a new code.", 429);
        const rec: any = fam ? (S.families.find((f: any) => String(f.email).toLowerCase() === wq) || S.families.flatMap((f: any) => f.guardians || []).find((g: any) => g.email === wq)) : staffByName(S, body.who);
        if (!rec || !rec.reset || rec.reset.exp < Date.now() || rec.reset.code !== sha(String(body.code || "").trim())) {
          await failHit("reset:" + wq); await failHit(ip);
          // 5 wrong guesses burn the code, so a 6-digit code can't be guessed by brute force
          if (rec && rec.reset) { rec.reset.tries = (rec.reset.tries || 0) + 1; if (rec.reset.tries >= 5) delete rec.reset; await saveState(S); }
          throw bad("That code isn't right or it expired.");
        }
        if (!/^[0-9a-f]{64}$/.test(String(body.pw))) throw bad("Pick a new password.");
        if (isStarterInput(body.pw)) throw bad("Pick a password that isn't the starter one.");
        pwSet(rec, body.pw); delete rec.reset;
        await failClear("reset:" + wq);
        await saveState(S);
        return J({ ok: true });
      }

      case "password": {
        const me = actor(S, sess);
        if (!me) throw bad("Please log in again.", 401);
        const pr = sess.g ? (me.rec.guardians || []).find((g: any) => g.email === sess.g) : me.rec;
        // right after a starter/temporary-password login they just proved the old one, so it isn't asked again
        if (!pr || (!sess.mustPw && !pwCheck(pr, body.old))) {
          if (await limited("pwchg:" + me.id)) throw bad("Too many tries. Wait 10 minutes.", 429);
          await failHit("pwchg:" + me.id); throw bad("Your current password isn't right.");
        }
        if (!/^[0-9a-f]{64}$/.test(String(body.pw))) throw bad("Pick a new password.");
        if (isStarterInput(body.pw) || (sess.mustPw && pwCheck(pr, body.pw))) throw bad("Pick a password that isn't the starter or temporary one.");
        pwSet(pr, body.pw);
        await saveState(S);
        if (sess.mustPw) { const db = await kv(), { key, ...rest } = sess; delete rest.mustPw; await db.set(key, { ...rest, exp: Date.now() + 1000 * 60 * 60 * 24 * 45 }); }
        return J({ ok: true });
      }

      case "email-code": {
        const me = actor(S, sess);
        if (!me || me.role === "family") throw bad("Please log in again.", 401);
        if (!validEmail(body.email)) throw bad("That email doesn't look right.");
        const c = code6();
        Object.assign(me.rec, { pendEmail: String(body.email).trim(), ecode: sha(c), eexp: Date.now() + 15 * 60 * 1000 });
        queue(S, me.rec.pendEmail, "Verify your Kicks staff email", `Your verification code is ${c}. It expires in 15 minutes.`);
        await deliver(S); await saveState(S);
        return J(await out(S, sess));
      }

      case "email-verify": {
        const me = actor(S, sess);
        if (!me || me.role === "family") throw bad("Please log in again.", 401);
        if (!me.rec.ecode || me.rec.eexp < Date.now() || me.rec.ecode !== sha(String(body.code || "").trim())) throw bad("That code isn't right or it expired.");
        me.rec.email = me.rec.pendEmail; me.rec.emailOk = true;
        delete me.rec.pendEmail; delete me.rec.ecode; delete me.rec.eexp;
        await saveState(S);
        return J(await out(S, sess));
      }

      case "push-sub": {
        const me = actor(S, sess);
        if (!me) throw bad("Please log in again.", 401);
        const sub = body.sub || {};
        if (typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string") throw bad("That device couldn't be set up for notifications.");
        const rec = me.role === "family" ? me.rec : S.staff.find((m: any) => m.id === me.id);
        rec.push = (rec.push || []).filter((x: any) => x.endpoint !== sub.endpoint);
        if (!body.off) rec.push.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
        rec.push = rec.push.slice(-6);
        await saveState(S);
        return J({ ok: true, devices: rec.push.length });
      }

      case "push-test": {
        const me = actor(S, sess);
        if (!me || !["admin", "ema", "coach", "lit"].includes(me.role)) throw bad("Staff only.", 403);
        if (!pushOn()) throw bad("Notifications aren't set up on the server yet.");
        const rec = S.staff.find((m: any) => m.id === me.id);
        if (!rec.push || !rec.push.length) throw bad("Turn on notifications on this device first.");
        await pushTo({ ...rec, pushPrefs: {} }, "test", { title: "Kicks Unlimited 🥋", body: "Notifications are working!", url: "/#/staff/me" });
        await saveState(S);
        return J({ ok: true });
      }

      case "media": {
        const me = actor(S, sess);
        if (!me) throw bad("Please log in again.", 401);
        const mm = String(body.data || "").match(/^data:(image\/(jpeg|png|webp)|video\/(mp4|quicktime|webm)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
        if (!mm) throw bad("That file couldn't be read.");
        const isVid = mm[1].startsWith("video/"), isPdf = mm[1] === "application/pdf";
        if (me.role === "family" && !isVid && !mm[1].startsWith("image/")) throw bad("Families can send pictures and short videos.", 403);
        if (isPdf && me.role !== "admin") throw bad("Only owners can upload documents.", 403);
        if (me.role === "family" && (await limited("upl:" + me.id))) throw bad("That's a lot of uploads today — try again tomorrow.", 429);
        if (me.role === "family") await failHit("upl:" + me.id);
        mm[3] = mm[mm.length - 1];
        if (mm[3].length > (isVid || isPdf ? 5_600_000 : me.role === "admin" ? 2_500_000 : 1_200_000)) throw bad("That file is too big.");
        const id = uid("m").replace(/[^\w-]/g, "");
        const db = await kv();
        await db.set("media/" + id, { type: mm[1], b64: mm[3] });
        return J({ url: "/api/media/" + id });
      }

      case "inquiry": { // First Look from the website (email optional)
        const child = T(body.child, 60), phone = T(body.phone, 30);
        if (!child || !phone || !T(body.age, 10)) throw bad("Please add the student's name, age and your phone.");
        if (await limited("fl:" + phone)) throw bad("Thanks — we already have your request.", 429);
        await failHit("fl:" + phone);
        const q: any = { id: uid("q"), heard: T(body.heard, 40), src: T(body.src, 40), child, age: T(body.age, 10), phone, parent: T(body.parent, 80), email: validEmail(body.email) ? T(body.email, 120) : "", interest: T(body.interest, 60), pref: T(body.pref, 60), notes: T(body.notes, 500), lang: body.lang === "es" ? "es" : "en", status: "new", ts: Date.now() };
        if (typeof body.ref === "string" && S.families.some((f: any) => f.id === body.ref)) q.ref = body.ref;
        const sl = String(body.slot || ""); if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(sl) && sl.slice(0, 10) > today() && !S.inquiries.some((x: any) => x.slot === sl && x.status !== "closed")) { q.slot = sl; q.pref = "Booked: " + sl; }
        S.inquiries.unshift(q);
        if (S.mail && S.mail.addr) queue(S, S.mail.addr, `New First Look: ${q.child} (${q.age})`, `${q.parent || "A parent"} · ${q.phone}${q.email ? " · " + q.email : ""}\n${q.pref || ""}${q.notes ? "\n" + q.notes : ""}\n\nOpen Studio admin → First Looks.`);
        await deliver(S); await saveState(S);
        return J({ ok: true });
      }

      case "guest-waiver": { // parents of non-students sign from the website
        const kids = (Array.isArray(body.kids) ? body.kids : []).slice(0, 8).map((k: any) => ({ name: T(k.name, 60), age: T(k.age, 10) })).filter((k: any) => k.name);
        if (!T(body.parent, 80) || !T(body.phone, 30) || !kids.length || !T(body.sig, 80) || !T(body.emergency, 120)) throw bad("Please fill in every required field and sign.");
        const purpose = ["party", "pno", "camp", "visit", "other"].includes(body.purpose) ? body.purpose : "other";
        const ev = S.events.find((e: any) => e.id === body.eventId);
        if ((purpose === "pno" || purpose === "camp") && !ev) throw bad("Pick a date.");
        if (ev && +ev.spots) { const taken = S.signups.filter((x: any) => x.eventId === ev.id).length + S.guestWaivers.filter((x: any) => x.eventId === ev.id).reduce((n: number, x: any) => n + (x.kids || []).length, 0); if (taken + kids.length > +ev.spots) throw bad(ev.spots - taken > 0 ? `Only ${ev.spots - taken} spot(s) left for that date.` : "That date is full — call us to get on the waitlist."); }
        const g = { id: uid("gw"), ts: Date.now(), purpose, eventId: ev ? ev.id : "", partyId: S.parties.some((p: any) => p.id === body.partyId) ? body.partyId : "", partyName: T(body.partyName, 60), parent: T(body.parent, 80), phone: T(body.phone, 30), email: validEmail(body.email) ? T(body.email, 120) : "", emergency: T(body.emergency, 120), med: T(body.med, 300), photo: !!body.photo, sig: T(body.sig, 80), lang: body.lang === "es" ? "es" : "en", kids };
        S.guestWaivers.unshift(g);
        await saveState(S);
        return J({ ok: true });
      }

      case "pay": { // Stripe Checkout for one or more open bills
        const me = actor(S, sess);
        if (!me || me.role !== "family") throw bad("Please log in again.", 401);
        if (!STRIPE()) throw bad("Card payments aren't set up yet — pay at the front desk or text us.");
        const ids = Array.isArray(body.invoiceIds) ? body.invoiceIds.map(String) : [];
        const inv = S.invoices.filter((i: any) => ids.includes(i.id) && i.familyId === me.id && i.status === "open");
        if (!inv.length) throw bad("Those bills are already paid.");
        const origin = new URL(req.url).origin, es = body.lang === "es" || me.rec.lang === "es";
        const f = new URLSearchParams({ mode: "payment", success_url: `${origin}/#/family/billing?paid=1`, cancel_url: `${origin}/#/family/billing`, "metadata[invoices]": inv.map((i: any) => i.id).join(","), "metadata[family]": me.id, locale: es ? "es" : "en", customer_email: me.rec.email || "" });
        inv.forEach((i: any, n: number) => { f.set(`line_items[${n}][quantity]`, "1"); f.set(`line_items[${n}][price_data][currency]`, "usd"); f.set(`line_items[${n}][price_data][unit_amount]`, String(i.amount)); f.set(`line_items[${n}][price_data][product_data][name]`, `#${i.num} ${(es && i.descEs) || i.desc}`.slice(0, 120)); });
        const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: "Bearer " + STRIPE(), "content-type": "application/x-www-form-urlencoded" }, body: f });
        const j: any = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) throw bad("Couldn't open checkout. Try again, or pay at the front desk.");
        return J({ url: j.url });
      }

      case "stripe-webhook": { // Stripe tells us a payment went through
        const secret = process.env.STRIPE_WEBHOOK_SECRET || "", sig = req.headers.get("stripe-signature") || "";
        const parts = Object.fromEntries(sig.split(",").map((x) => x.split("=") as [string, string]));
        const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
        const v1 = sig.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
        if (!secret || !parts.t || !v1.some((x) => x.length === expected.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(expected))) || Math.abs(Date.now() / 1000 - +parts.t) > 600) return J({ error: "bad signature" }, 400);
        const ev = JSON.parse(raw);
        if (ev.type === "checkout.session.completed" && ev.data && ev.data.object && ev.data.object.mode === "setup") {
          const o = ev.data.object, f = S.families.find((x: any) => x.id === (o.metadata || {}).family);
          if (f && o.setup_intent) { const si = await stripe("setup_intents/" + o.setup_intent, {}, "GET"); const pm = si.ok ? si.j.payment_method : ""; if (pm) { const p = await stripe("payment_methods/" + pm, {}, "GET"); f.stripePm = pm; f.autopay = { on: true, brand: p.ok && p.j.card ? p.j.card.brand : "", last4: p.ok && p.j.card ? p.j.card.last4 : "", since: Date.now() }; await saveState(S); } }
          return J({ received: true });
        }
        if (ev.type === "checkout.session.completed" && ev.data && ev.data.object && ev.data.object.payment_status === "paid") {
          const o = ev.data.object, md = o.metadata || {}, ids = String(md.invoices || "").split(",");
          if (md.kind === "guest") { const od = S.orders.find((x: any) => x.id === md.order); if (od && od.status === "unpaid") { od.status = "new"; od.paid = { at: Date.now(), amount: o.amount_total, stripe: o.id }; S.invoices.push({ id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, familyId: "", desc: `Online shop: ${od.guest.name} — ${od.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}`, amount: o.amount_total, due: today(), status: "paid", paidAt: Date.now(), method: "Card (Stripe)", stripe: o.id, created: Date.now(), rem: [], orderId: od.id }); queue(S, od.guest.email, "Your Kicks Unlimited order", `Hi ${String(od.guest.name).split(" ")[0]},\n\nThanks! We got your order: ${od.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}. We'll email you when it's ready to pick up at 601 S. Bird Street.`); } await deliver(S); await saveState(S); return J({ received: true }); }
          if (md.kind === "gift") { if (!(S.giftCards || []).some((g: any) => g.stripe === o.id)) { const code = "GIFT-" + crypto.randomBytes(4).toString("hex").toUpperCase(); (S.giftCards = S.giftCards || []).push({ id: uid("gc"), code, amount: o.amount_total, balance: o.amount_total, to: md.to || "", note: `Bought online by ${md.name}${md.msg ? " — " + md.msg : ""}`, ts: Date.now(), stripe: o.id }); S.invoices.push({ id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, familyId: "", desc: `Gift card ${code} (online)`, amount: o.amount_total, due: today(), status: "paid", paidAt: Date.now(), method: "Card (Stripe)", stripe: o.id, created: Date.now(), rem: [] }); queue(S, md.email, "Your Kicks Unlimited gift card", `Hi ${String(md.name).split(" ")[0]},\n\nThanks for your purchase! Gift card code: ${code}\nAmount: $${(o.amount_total / 100).toFixed(2)}${md.to ? `\nFor: ${md.to}` : ""}${md.msg ? `\nMessage: ${md.msg}` : ""}\n\nUse it at the front desk or in the family app.`); } await deliver(S); await saveState(S); return J({ received: true }); }
          const paid = S.invoices.filter((i: any) => ids.includes(i.id) && i.status === "open");
          for (const i of paid) Object.assign(i, { status: "paid", paidAt: Date.now(), method: "Card (Stripe)", stripe: o.id });
          packCredit(S);
          const f = S.families.find((x: any) => x.id === (o.metadata || {}).family);
          if (f && paid.length) { const tot = paid.reduce((a: number, i: any) => a + i.amount, 0), m = "$" + (tot / 100).toFixed(2), fn = String(f.parent || "").split(" ")[0]; tell(S, f, [`Receipt: ${m} paid — Kicks Unlimited`, `Recibo: ${m} pagado — Kicks Unlimited`], [`Hi ${fn},\n\nThanks! We received ${m} by card for:\n${paid.map((i: any) => `#${i.num} ${i.desc}`).join("\n")}`, `Hola, ${fn}:\n\n¡Gracias! Recibimos ${m} con tarjeta por:\n${paid.map((i: any) => `#${i.num} ${i.descEs || i.desc}`).join("\n")}`]); }
          await deliver(S); await saveState(S);
        }
        return J({ received: true });
      }

      case "split-pay": { const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401); const i = S.invoices.find((x: any) => x.id === body.invoiceId && x.familyId === me.id && x.status === "open"); const amt = Math.round(+body.amount * 100); if (!i || !(amt >= 500) || amt >= i.amount) throw bad("Pick an amount of at least $5 and less than the bill."); S.invoices.push({ ...i, id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, amount: i.amount - amt, desc: i.desc + " (rest)", descEs: (i.descEs || i.desc) + " (resto)", rem: [], created: Date.now(), partOf: i.id }); i.amount = amt; i.desc += " (part)"; await saveState(S); return J({ invoiceId: i.id, ...(await out(S, sess)) }); }
      case "admin/payouts": { const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403); if (!STRIPE()) throw bad("Stripe isn't set up yet."); const r = await stripe("payouts?limit=10", {}, "GET"); if (!r.ok) throw bad("Couldn't reach Stripe."); return J({ payouts: (r.j.data || []).map((p: any) => ({ id: p.id, amount: p.amount, arrival: p.arrival_date, status: p.status })) }); }
      case "pay-credit": { const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401); if (sess.g && ((me.rec.guardians || []).find((x: any) => x.email === sess.g) || {}).view) throw bad("View-only login.", 403); const i = S.invoices.find((x: any) => x.id === body.invoiceId && x.familyId === me.id && x.status === "open"); if (!i) throw bad("That bill is already paid."); const bal = creditBal(S, me.id); if (bal < i.amount) throw bad("Not enough credit for that bill."); (S.credits = S.credits || []).push({ id: uid("cr"), familyId: me.id, amount: -i.amount, note: `Paid #${i.num}`, ts: Date.now() }); Object.assign(i, { status: "paid", paidAt: Date.now(), method: "Family credit" }); await saveState(S); return J(await out(S, sess)); }
      case "buy-pack": { const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401); const packs = ((S.billing || {}).packs || []).filter((p: any) => +p.n > 0 && +p.price > 0); const pk = packs.find((p: any) => String(p.n) === String(body.n)); const k = S.students.find((x: any) => x.id === body.studentId && x.familyId === me.id); if (!pk || !k) throw bad("Pick a student and a pack."); S.invoices.push({ id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, familyId: me.id, desc: `${+pk.n === 1 ? "Drop-in class" : pk.n + "-class pack"} — ${String(k.name).split(" ")[0]}`, descEs: `${+pk.n === 1 ? "Clase suelta" : "Paquete de " + pk.n + " clases"} — ${String(k.name).split(" ")[0]}`, amount: Math.round(+pk.price * 100), due: today(), status: "open", created: Date.now(), rem: [], pack: { n: +pk.n, studentId: k.id } }); await saveState(S); return J(await out(S, sess)); }
      case "admin/newsletter-subs": { const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403); const origin = new URL(req.url).origin; let n = 0; for (const x of S.newsSubs || []) { if (!validEmail(x.email)) continue; queue(S, x.email, T(body.subject, 150), `${String(body.body || "").slice(0, 20000)}\n\n—\nUnsubscribe: ${origin}/api/unsub?e=${encodeURIComponent(x.email)}&t=${subTok(x.email)}`); n++; } await deliver(S); await saveState(S); return J({ n }); }
      case "staff-cal-key": { const me = actor(S, sess); if (!me || me.role === "family") throw bad("Please log in again.", 401); me.rec.calKey = crypto.randomBytes(18).toString("base64url"); await saveState(S); return J(await out(S, sess)); }
      case "help-alert": { const me = actor(S, sess); if (!me || me.role === "family") throw bad("Please log in again.", 401); let n = 0; for (const m of S.staff.filter((x: any) => x.id !== me.id && (x.role === "admin" || (S.hours || []).some((h: any) => h.staff === x.id && !h.out)))) if (await pushTo(m, "ops", { title: "🚨 Help needed on the floor", body: `${me.rec.name} needs a hand${body.where ? " — " + T(body.where, 60) : ""}`, url: "/#/staff/today" })) n++; (S.chat = S.chat || []).push({ id: uid("c"), ch: "general", by: me.id, text: `🚨 ${me.rec.name} needs help on the floor${body.where ? " — " + T(body.where, 60) : ""}`, ts: Date.now() }); await saveState(S); return J({ n, ...(await out(S, sess)) }); }
      case "admin/hits": { const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403); const db = await kv(), days: any = {}; for (let i = 0; i < 30; i++) { const d = new Date(Date.now() - i * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); days[d] = (await db.get("hits/" + d)) || {}; } return J({ days }); }
      case "ai": { // AI helper (hidden in the app until an owner adds ANTHROPIC_API_KEY)
        const me = actor(S, sess); if (!me) throw bad("Please log in again.", 401);
        try { return J({ text: await aiAnswer(S, me, body) }); } catch (e: any) { throw bad(e.message || "The AI helper isn't answering right now."); }
      }
      case "cal-key": {
        const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401);
        me.rec.calKey = crypto.randomBytes(18).toString("base64url"); await saveState(S); return J(await out(S, sess));
      }
      case "autopay-setup": { // Stripe Checkout in setup mode saves a card for autopay
        const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401);
        if (!STRIPE()) throw bad("Card payments aren't set up yet.");
        const f = me.rec, origin = new URL(req.url).origin;
        if (!f.stripeCus) { const c = await stripe("customers", { email: f.email || "", name: f.parent || "", "metadata[family]": f.id }); if (!c.ok) throw bad("Couldn't reach the card processor. Try again."); f.stripeCus = c.j.id; await saveState(S); }
        const r = await stripe("checkout/sessions", { mode: "setup", customer: f.stripeCus, "payment_method_types[0]": "card", currency: "usd", success_url: `${origin}/#/family/billing?autopay=1`, cancel_url: `${origin}/#/family/billing`, "metadata[family]": f.id, "metadata[kind]": "autopay", locale: body.lang === "es" ? "es" : "en" });
        if (!r.ok || !r.j.url) throw bad("Couldn't open the card form. Try again.");
        return J({ url: r.j.url });
      }
      case "autopay-off": {
        const me = actor(S, sess); if (!me || me.role !== "family") throw bad("Please log in again.", 401);
        me.rec.autopay = { on: false }; await saveState(S); return J(await out(S, sess));
      }
      case "admin/backup": { // owners can download a saved nightly copy
        const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403);
        const db = await kv(), keys = (await db.list("backup/")).sort().reverse();
        if (!body.date) return J({ dates: keys.map((k: string) => k.slice(7)) });
        const b = await db.get("backup/" + String(body.date).replace(/[^\d-]/g, "")); if (!b) throw bad("No backup for that day.");
        return J({ data: b });
      }
      case "admin/errors": { const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403); const db = await kv(); return J({ log: ((await db.get("errlog")) || []).slice(0, 50) }); }
      case "admin/autopay-now": { const me = actor(S, sess); if (!me || me.role !== "admin") throw bad("Owners only.", 403); const n = await autopayRun(S); await deliver(S); await saveState(S); return J({ n, ...(await out(S, sess)) }); }
      case "web-chat": { // website chat bubble → owners' inbox
        if (((S.site || {}).features || {}).webchat !== true) throw bad("Chat is off right now — please call or text us.", 403);
        const name = T(body.name, 80), contact = T(body.contact, 120), text = T(body.text, 1500);
        if (!name || !text || (!validEmail(contact) && contact.replace(/\D/g, "").length < 10)) throw bad("Add your name, a phone or email, and your question.");
        if (await limited("wc:" + contact)) throw bad("Thanks — we already have your message.", 429);
        await failHit("wc:" + contact);
        const m = { id: uid("wc"), name, contact, text, lang: body.lang === "es" ? "es" : "en", ts: Date.now(), done: false };
        (S.webchat ||= []).push(m);
        if (S.mail && S.mail.addr) queue(S, S.mail.addr, `Website message from ${name}`, `${name} · ${contact}\n\n${text}\n\nReply in Studio admin → Website chats.`);
        await deliver(S); await saveState(S);
        return J({ ok: true });
      }

      case "redeem": { // family types a discount code or gift card in Billing
        const me = actor(S, sess);
        if (!me || me.role !== "family") throw bad("Please log in again.", 401);
        const code = T(body.code, 40).toUpperCase();
        if (!code) throw bad("Type the code.");
        if (await limited("rd:" + me.id)) throw bad("Too many tries. Wait 10 minutes.", 429);
        let msg = "";
        try { msg = redeem(S, me.id, code, me.rec.lang === "es"); } catch (e) { await failHit("rd:" + me.id); throw e; }
        await saveState(S);
        return J({ ok: true, msg });
      }

      case "admin/archive": {
        const me = actor(S, sess);
        if (!me || me.role !== "admin") throw bad("Owners only.", 403);
        return J(await readArchive());
      }

      case "admin/reset-staff":
      case "admin/new-staff":
      case "admin/reset":
      case "admin/import": {
        const me = actor(S, sess);
        if (!me || me.role !== "admin") throw bad("Owners only.", 403);
        if (path === "admin/reset-staff") {
          const m = S.staff.find((x: any) => x.id === body.id);
          if (!m) throw bad("Staff member not found.");
          const temp = setTempPw(m); delete m.reset;
          S.resetReqs = S.resetReqs.filter((r: any) => r.staff !== m.id);
          if (m.emailOk && m.email) queue(S, m.email, "Your Kicks staff password was reset", "An owner reset your Kicks password. Ask them for your one-time temporary password — you'll pick your own right after you log in.");
          await deliver(S); await saveState(S);
          return J({ ...(await out(S, sess)), temp });
        }
        if (path === "admin/new-staff") {
          const name = String(body.name || "").trim().slice(0, 80);
          if (!name) throw bad("Add a name.");
          if (staffByName(S, name)) throw bad("Someone with that name is already on the team.");
          const role = ["admin", "ema", "coach", "lit"].includes(body.role) ? body.role : "ema";
          const nm: any = { id: uid("st"), name, role, title: String(body.title || "").slice(0, 80) || { admin: "Owner / Manager", ema: "EMA Instructor", coach: "Coach", lit: "Leader in Training" }[role as "admin"], email: "", emailOk: false, rt: {}, parentLog: [], redTop: false };
          const temp = setTempPw(nm); S.staff.push(nm);
          await saveState(S);
          return J({ ...(await out(S, sess)), temp });
        }
        if (path === "admin/reset") {
          const keepMe = S.staff.find((m: any) => m.id === me.id);
          const fresh = await resetState();
          const still = fresh.staff.find((m: any) => m.id === me.id);
          if (still && keepMe) Object.assign(still, { pw: keepMe.pw, email: keepMe.email, emailOk: keepMe.emailOk });
          await saveState(fresh);
          return J(await out(fresh, sess));
        }
        // import a downloaded backup; keep everyone's current passwords
        const d = body.state;
        if (!d || !Array.isArray(d.staff) || !Array.isArray(d.students)) throw bad("That file isn't a Kicks backup.");
        const secrets = new Map<string, any>();
        for (const m of S.staff) secrets.set("s:" + m.id, { pw: m.pw, reset: m.reset });
        for (const f of S.families) secrets.set("f:" + f.id, { pw: f.pw });
        const next: any = {};
        for (const k of [...ARR, "focus", ...OBJ2, ...OBJ, ...SCALAR, "v"]) if (k in d) next[k] = d[k];
        next.staff = (next.staff || []).map((m: any) => ({ ...m, ...(secrets.get("s:" + m.id) || { pw: DEFAULT_PW }) }));
        next.families = (next.families || []).map((f: any) => ({ ...f, ...(secrets.get("f:" + f.id) || {}) }));
        if (!next.staff.some((m: any) => m.id === me.id && m.role === "admin")) throw bad("That backup would lock you out — it doesn't include your owner account.");
        next.outbox = S.outbox;
        await saveState(next);
        return J(await out(next, sess));
      }
    }
    return J({ error: "Not found" }, 404);
  } catch (e: any) {
    if (e instanceof StateConflict) throw e;
    if (e instanceof Err) return J({ error: e.message }, e.code);
    console.error(e);
    return J({ error: "Something went wrong on our end. Try again in a minute." }, 500);
  }
}
