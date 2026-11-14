// Phone notifications (Web Push). Turned on by setting VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in Netlify.
import { canCh, canTipSee } from "./state.mts";

export const pushOn = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublic = () => process.env.VAPID_PUBLIC_KEY || "";

let wp: any = null;
async function lib() {
  if (wp) return wp;
  const m: any = await import("web-push");
  wp = m.default || m;
  wp.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@kickssp.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return wp;
}

/** Send to one staff member's devices. Drops subscriptions the browser says are gone. */
export async function pushTo(m: any, kind: string, payload: { title: string; body: string; url: string }) {
  if (!pushOn() || !m || !Array.isArray(m.push) || !m.push.length) return false;
  if (m.pushPrefs && m.pushPrefs[kind] === false) return false;
  if (m.quiet && m.quiet.on && kind !== "closed") { // family quiet hours (closures still come through)
    const p: any = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const now = `${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`, a = m.quiet.from || "21:00", b = m.quiet.to || "07:00";
    if (a > b ? now >= a || now < b : now >= a && now < b) return false;
  }
  try {
    const w = await lib();
    const keep: any[] = [];
    await Promise.all(m.push.map(async (s: any) => {
      try { await w.sendNotification(s, JSON.stringify(payload), { TTL: 3600 }); keep.push(s); }
      catch (e: any) { if (![404, 410].includes(e && e.statusCode)) keep.push(s); }
    }));
    const changed = keep.length !== m.push.length; m.push = keep; return changed;
  } catch { return false; }
}

const short = (n: string) => { const x = String(n || "").match(/^(Mr|Ms|Mrs)\.\s+\S+\s+(\S+)/); return x ? `${x[1]}. ${x[2]}` : String(n || ""); };
const CH_NAME: any = { all: "Whole staff", ema: "EMA", emalit: "EMA + L.I.T.", lit: "L.I.T.", camp: "Camp" };

/** Compare before/after and ping the right people. Returns true if subscriptions were cleaned up. */
export async function notifyChanges(S: any, before: any, actorId: string) {
  if (!pushOn()) return false;
  const jobs: Promise<boolean>[] = [];
  const staff = S.staff || [];
  const by = (id: string) => staff.find((m: any) => m.id === id);
  const fresh = (k: string) => (S[k] || []).filter((x: any) => !before[k].has(x.id));
  for (const m of fresh("chat")) {
    const from = by(m.by); if (!from) continue;
    const text = (m.text || (m.img ? "📷 Photo" : "")).slice(0, 140);
    const dm = String(m.ch).startsWith("dm~");
    for (const r of staff) {
      if (r.id === m.by || !canCh(r.role, r.id, m.ch, r)) continue;
      const keys = [short(r.name), r.name, ...(r.aliases || [])].filter(Boolean);
      const ment = keys.some((k: string) => String(m.text || "").includes("@" + k));
      jobs.push(pushTo(r, ment ? "mention" : "chat", { title: ment ? `${short(from.name)} mentioned you` : dm ? short(from.name) : `${short(from.name)} · #${CH_NAME[m.ch] || m.ch}`, body: text, url: `/#/staff/chat/${encodeURIComponent(m.ch)}` }));
    }
  }
  for (const s of fresh("subs")) {
    if (s.status !== "open") continue; const who = by(s.by), sh = (S.shifts || []).find((x: any) => x.id === s.shiftId);
    for (const r of staff) if (r.id !== s.by) jobs.push(pushTo(r, "subs", { title: "Sub needed", body: `${who ? short(who.name) : "Someone"} needs a sub ${s.date}${sh ? " · " + sh.s + "–" + sh.e : ""}`, url: "/#/staff/shifts" }));
  }
  for (const t of fresh("trades")) { const r = by(t.with), a = by(t.by); jobs.push(pushTo(r, "subs", { title: "Shift trade request", body: `${a ? short(a.name) : "Someone"} wants to trade shifts with you`, url: "/#/staff/shifts" })); }
  for (const t of fresh("tips")) { const a = by(t.by); for (const r of staff) if (r.id !== t.by && canTipSee(r.role, r.id, t)) jobs.push(pushTo(r, "tips", { title: t.for === r.id ? `💡 A tip for you from ${a ? short(a.name) : "an instructor"}` : `💡 New tip from ${a ? short(a.name) : "an instructor"}`, body: String(t.text).slice(0, 140), url: "/#/staff/tips" })); }
  const owners = staff.filter((m: any) => m.role === "admin" && m.id !== actorId);
  for (const i of fresh("incidents")) { const st = (S.students || []).find((x: any) => x.id === i.studentId); for (const r of owners) jobs.push(pushTo(r, "ops", { title: "🩹 New incident report", body: `${st ? st.name : i.name || "A student"} · ${i.where}: ${String(i.what).slice(0, 100)}`, url: "/#/admin/incident" })); }
  for (const t of fresh("timeoff")) { const a = by(t.staff); for (const r of owners) jobs.push(pushTo(r, "ops", { title: "Time-off request", body: `${a ? a.name : "Staff"}: ${t.from}${t.to !== t.from ? " to " + t.to : ""}`, url: "/#/admin/schedule" })); }
  const res = await Promise.all(jobs);
  return res.some(Boolean);
}

export const snapshot = (S: any) => Object.fromEntries(["chat", "subs", "trades", "tips", "incidents", "timeoff"].map((k) => [k, new Set((S[k] || []).map((x: any) => x.id))]));
