// Round 3 server pieces: AI help, calendar feed, autopay, daily owner jobs, backups, error log.
import crypto from "node:crypto";
import { kv } from "./store.mts";
import { today, uid, queue, tell, clone } from "./state.mts";
import { CLASSES, kidClassesOn } from "./classes.mts";
import { pushOn, pushTo } from "./push.mts";

const DAY = 864e5;
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);
const money = (c: number) => "$" + ((c || 0) / 100).toFixed(2);
const first = (n: any) => String(n || "").split(" ")[0];
const feat = (S: any, k: string) => (((S.site || {}).features || {})[k]) === true;
const owners = (S: any) => (S.staff || []).filter((m: any) => m.role === "admin");
const ownerMail = (S: any) => (S.mail && S.mail.addr) || "";

/* ---------- AI (only when ANTHROPIC_API_KEY is set) ---------- */
export const aiOn = () => !!process.env.ANTHROPIC_API_KEY;
const DAYN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export async function aiAnswer(S: any, me: any, body: any) {
  if (!aiOn()) throw new Error("AI isn't set up yet.");
  const db = await kv(), key = `ai/${today()}/${me ? me.id : "anon"}`, n = (await db.get(key)) || 0;
  if (n >= (me && me.role !== "family" ? 60 : 25)) throw new Error("That's enough questions for today — message the studio instead.");
  await db.set(key, n + 1);
  const es = body.lang === "es", kind = String(body.kind || "");
  let system = "", user = "";
  if (kind === "help") {
    const ev = (S.events || []).filter((e: any) => e.aud !== "staff" && e.date >= today() && e.date <= addDays(today(), 45)).map((e: any) => `${e.date}${e.time ? " " + e.time : ""}: ${e.title}${e.noClasses ? " (no classes)" : ""}${e.desc ? " — " + e.desc : ""}`).join("\n");
    const sched = CLASSES.map((c: any) => `${DAYN[c.d]} ${c.s}-${c.e} ${c.n}`).join("\n");
    const faq = (S.faq || []).map((f: any) => `Q: ${f.q}\nA: ${f.a}`).join("\n");
    system = `You answer short questions from parents for Kicks Unlimited Family Martial Arts Center, 601 S. Bird Street, Sun Prairie, WI 53590, phone (608) 834-9992. Use ONLY the facts below. If the answer isn't there, say you're not sure and suggest messaging the studio in the portal or calling. Never make up prices, dates or policies. Two or three sentences, plain words.${es ? " Answer in Spanish." : ""}\n\nCLASS SCHEDULE:\n${sched}\n\nUPCOMING DATES:\n${ev || "none posted"}\n\nFAQ:\n${faq || "none"}`;
    user = String(body.q || "").slice(0, 500);
  } else if (kind === "plan") {
    if (!me || !["admin", "ema"].includes(me.role)) throw new Error("Instructors only.");
    const drills = (S.drills || []).map((d: any) => `- ${d.name} [${d.type}, ${d.min} min]${d.how ? ": " + String(d.how).replace(/\n/g, " ").slice(0, 160) : ""}`).join("\n");
    system = `You help martial arts instructors at Kicks Unlimited draft a class plan. Build it from the studio's own drill library below (use their names). Format: a list of blocks with minutes, e.g. "Warm-up (5 min): …". Keep the total to the class length. No safety-critical advice beyond normal class supervision.${es ? " Write in Spanish." : ""}\n\nDRILL LIBRARY:\n${drills || "(empty)"}`;
    user = `Class: ${String(body.cls || "").slice(0, 80)}. Length: ${parseInt(body.min) || 45} minutes. Weekly focus: ${String(body.focus || "").slice(0, 120)}. Notes: ${String(body.q || "").slice(0, 300)}`;
  } else if (kind === "translate") {
    if (!me) throw new Error("Please log in again.");
    const to = ({ es: "Spanish", en: "English", hmn: "Hmong (White Hmong, RPA spelling)" } as any)[body.to] || "English";
    system = `Translate the message into ${to}. Keep names, dates and times as they are. Reply with the translation only.`;
    user = String(body.text || "").slice(0, 2000);
  } else throw new Error("Unknown request.");
  if (!user.trim()) throw new Error("Type something first.");
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: kind === "plan" ? 900 : 500, system, messages: [{ role: "user", content: user }] }) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("The AI helper isn't answering right now.");
  return String(((j.content || [])[0] || {}).text || "").trim();
}

/* ---------- live calendar feed for a family (.ics) ---------- */
const icsEsc = (s: string) => String(s || "").replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
const icsDT = (d: string, t: string) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
export function icsFor(S: any, f: any) {
  const kids = (S.students || []).filter((s: any) => s.familyId === f.id && s.status !== "pending"), t = today(), L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kicks Unlimited//Family calendar//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Kicks Unlimited", "X-WR-TIMEZONE:America/Chicago", "REFRESH-INTERVAL;VALUE=DURATION:PT6H"];
  const closed = new Set((S.events || []).filter((e: any) => e.noClasses).map((e: any) => e.date));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  for (let i = 0; i < 56; i++) {
    const d = addDays(t, i); if (closed.has(d)) continue; const wd = new Date(d + "T12:00:00Z").getUTCDay();
    const seen = new Set<string>();
    for (const k of kids) for (const c of kidClassesOn(k, wd)) { const key = c.s + c.n; if (seen.has(key)) continue; seen.add(key); const who = kids.filter((x: any) => kidClassesOn(x, wd).some((y: any) => y.s === c.s && y.n === c.n)).map((x: any) => first(x.name)).join(" & ");
      L.push("BEGIN:VEVENT", `UID:${d}-${c.s}-${crypto.createHash("md5").update(c.n + f.id).digest("hex").slice(0, 8)}@kickssp`, `DTSTAMP:${stamp}`, `DTSTART;TZID=America/Chicago:${icsDT(d, c.s)}`, `DTEND;TZID=America/Chicago:${icsDT(d, c.e)}`, `SUMMARY:${icsEsc(`${c.n} (${who})`)}`, "LOCATION:Kicks Unlimited\\, 601 S. Bird Street\\, Sun Prairie WI", "END:VEVENT"); }
  }
  for (const e of (S.events || []).filter((x: any) => x.aud !== "staff" && x.date >= addDays(t, -7) && x.date <= addDays(t, 180))) {
    L.push("BEGIN:VEVENT", `UID:ev-${e.id}@kickssp`, `DTSTAMP:${stamp}`, ...(e.time ? [`DTSTART;TZID=America/Chicago:${icsDT(e.date, e.time)}`, `DURATION:PT1H`] : [`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`]), `SUMMARY:${icsEsc((f.lang === "es" && e.titleEs) || e.title)}${e.noClasses ? icsEsc(" — no classes") : ""}`, ...(e.desc ? [`DESCRIPTION:${icsEsc((f.lang === "es" && e.descEs) || e.desc)}`] : []), "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map((l) => (l.length > 74 ? l.match(/.{1,74}/g)!.join("\r\n ") : l)).join("\r\n") + "\r\n";
}

/* ---------- Stripe autopay: saved card, charged on the due date, retried every 3 days (3 tries) ---------- */
const STRIPE = () => process.env.STRIPE_SECRET_KEY || "";
export async function stripe(path: string, params: Record<string, string>, method = "POST", idem = "") {
  const r = await fetch("https://api.stripe.com/v1/" + path, { method, headers: { authorization: "Bearer " + STRIPE(), "content-type": "application/x-www-form-urlencoded", ...(idem ? { "idempotency-key": idem } : {}) }, body: method === "GET" ? undefined : new URLSearchParams(params) });
  const j: any = await r.json().catch(() => ({})); return { ok: r.ok, j };
}
export async function autopayRun(S: any) {
  if (!STRIPE()) return 0; let n = 0; const t = today();
  for (const f of (S.families || []).filter((x: any) => x.autopay && x.autopay.on && x.stripeCus && x.stripePm)) {
    const due = (S.invoices || []).filter((i: any) => i.familyId === f.id && i.status === "open" && i.due <= t && !i.noAuto && (!i.apNext || i.apNext <= t) && (i.apTries || 0) < 3);
    for (const i of due) {
      const r = await stripe("payment_intents", { amount: String(i.amount), currency: "usd", customer: f.stripeCus, payment_method: f.stripePm, off_session: "true", confirm: "true", description: `#${i.num} ${i.desc}`.slice(0, 200), "metadata[invoices]": i.id, "metadata[family]": f.id }, "POST", `autopay-${i.id}-${i.apTries || 0}`); // same key on a re-run = Stripe returns the first charge instead of charging twice
      i.apTries = (i.apTries || 0) + 1;
      if (r.ok && r.j.status === "succeeded") { Object.assign(i, { status: "paid", paidAt: Date.now(), method: "Autopay (card)", stripe: r.j.id }); f.autopay.fails = 0; n++;
        tell(S, f, [`Receipt: ${money(i.amount)} paid by autopay`, `Recibo: ${money(i.amount)} pagado automáticamente`], [`Hi ${first(f.parent)},\n\nAutopay paid bill #${i.num} (${i.desc}) for ${money(i.amount)}. Thank you!`, `Hola, ${first(f.parent)}:\n\nEl pago automático cubrió la factura #${i.num} (${i.descEs || i.desc}) por ${money(i.amount)}. ¡Gracias!`]);
      } else {
        i.apNext = addDays(t, 3); f.autopay.fails = (f.autopay.fails || 0) + 1; const last = i.apTries >= 3;
        tell(S, f, [`Autopay didn't go through — bill #${i.num}`, `El pago automático no pasó — factura #${i.num}`], [`Hi ${first(f.parent)},\n\nWe tried to charge your saved card ${money(i.amount)} for #${i.num} (${i.desc}) but it didn't go through.${last ? " We won't try again — please pay in the family portal under Billing or update your card." : " We'll try again in 3 days, or you can pay now in the family portal under Billing."}`, `Hola, ${first(f.parent)}:\n\nIntentamos cobrar ${money(i.amount)} a su tarjeta por la factura #${i.num} (${i.descEs || i.desc}) pero no pasó.${last ? " No lo intentaremos otra vez: pague en el portal familiar o actualice su tarjeta." : " Lo intentaremos de nuevo en 3 días, o puede pagar ahora en el portal."}`], [`Autopay for bill #${i.num} (${money(i.amount)}) didn't go through. ${last ? "Please pay in the family portal." : "We'll retry in 3 days."}`, `El pago automático de la factura #${i.num} (${money(i.amount)}) no pasó. ${last ? "Pague en el portal familiar." : "Reintentaremos en 3 días."}`]);
        if (last && ownerMail(S)) queue(S, ownerMail(S), `Autopay failed 3 times: ${f.parent}`, `Bill #${i.num} (${i.desc}, ${money(i.amount)}) for ${f.parent} failed 3 autopay tries. Reach out to the family.`);
      }
    }
  }
  return n;
}

/* ---------- daily owner jobs ---------- */
export function lateFees(S: any) {
  const B = S.billing || {}, fee = Math.round(+B.lateFee || 0), after = Math.max(1, parseInt(B.lateDays) || 7);
  if (!feat(S, "lateFees") || !(fee > 0)) return 0; let n = 0; const t = today();
  for (const i of (S.invoices || []).filter((x: any) => x.status === "open" && !x.lateOf && !x.lateFeeId && x.due <= addDays(t, -after))) {
    const f = (S.families || []).find((x: any) => x.id === i.familyId); if (!f) continue;
    const li = { id: uid("i"), num: S.invNo = (S.invNo || 1000) + 1, familyId: f.id, desc: `Late fee for #${i.num}`, descEs: `Cargo por atraso de #${i.num}`, amount: fee, due: t, status: "open", created: Date.now(), rem: [], lateOf: i.id };
    S.invoices.push(li); i.lateFeeId = li.id; n++;
  }
  return n;
}
export function flFollow(S: any) {
  if (!feat(S, "flFollow")) return 0; let n = 0; const t = today();
  for (const q of (S.inquiries || []).filter((x: any) => x.email && x.status !== "closed" && x.stage !== "joined" && x.stage !== "lost")) {
    const when = q.slot ? q.slot.slice(0, 10) : new Date(q.ts || 0).toISOString().slice(0, 10); if (when >= t) continue;
    q.fu = q.fu || []; const days = Math.round((Date.parse(t) - Date.parse(when)) / DAY), es = q.lang === "es", fn = first(q.parent) || "there";
    const step = days >= 7 && !q.fu.includes(7) ? 7 : days >= 1 && !q.fu.includes(1) ? 1 : 0; if (!step || (step === 1 && days > 6)) { if (step === 1) q.fu.push(1); continue; }
    q.fu.push(step);
    if (step === 1) queue(S, q.email, es ? "¡Gracias por visitar Kicks!" : "Thanks for visiting Kicks!", es ? `Hola, ${fn}:\n\nGracias por traer a ${q.child} a Kicks Unlimited. ¿Tienen alguna pregunta? Responda a este correo o llame al (608) 834-9992 y le ayudamos a escoger una clase.` : `Hi ${fn},\n\nThanks for bringing ${q.child} to Kicks Unlimited! Any questions? Reply to this email or call (608) 834-9992 and we'll help you pick a class.`);
    else queue(S, q.email, es ? `¿Listos para empezar, ${q.child}?` : `Ready to start, ${q.child}?`, es ? `Hola, ${fn}:\n\nSolo queríamos saber si ${q.child} quiere seguir entrenando en Kicks. Puede inscribirse en línea en kickssp.com o llamarnos al (608) 834-9992.` : `Hi ${fn},\n\nJust checking in — would ${q.child} like to keep training at Kicks? You can enroll online at kickssp.com or call us at (608) 834-9992.`);
    n++;
  }
  return n;
}
export function reviewAsk(S: any) {
  const url = (S.site || {}).reviewUrl; if (!feat(S, "reviewAsk") || !url) return 0; let n = 0; const t = today(), y = addDays(t, -1);
  for (const p of (S.promos || []).filter((x: any) => x.date === y && !x.revAsked)) {
    p.revAsked = true; const s = (S.students || []).find((x: any) => x.id === p.studentId), f = s && (S.families || []).find((x: any) => x.id === s.familyId && x.status === "approved"); if (!f) continue;
    if (f.revAsked && f.revAsked >= addDays(t, -120)) continue; f.revAsked = t;
    tell(S, f, [`Congrats to ${first(s.name)}! 🥋`, `¡Felicidades a ${first(s.name)}! 🥋`], [`Hi ${first(f.parent)},\n\nCongratulations on ${first(s.name)}'s new belt! If your family is enjoying Kicks, a quick Google review helps other families find us:\n${url}\n\nThank you!`, `Hola, ${first(f.parent)}:\n\n¡Felicidades por el nuevo cinturón de ${first(s.name)}! Si su familia está contenta en Kicks, una reseña rápida en Google ayuda a otras familias a encontrarnos:\n${url}\n\n¡Gracias!`]);
    n++;
  }
  return n;
}
export function certExpiry(S: any) {
  const t = today(), soon = addDays(t, 30); let n = 0; const lines: string[] = [];
  for (const m of S.staff || []) for (const c of m.certs || []) { if (!c.exp || c.exp > soon || c.warned === c.exp) continue; c.warned = c.exp; lines.push(`${m.name}: ${c.name} ${c.exp < t ? "EXPIRED" : "expires"} ${c.exp}`); if (m.emailOk && m.email) queue(S, m.email, `Your ${c.name} ${c.exp < t ? "has expired" : "expires soon"}`, `Hi ${first(m.name)},\n\nYour ${c.name} ${c.exp < t ? "expired" : "expires"} on ${c.exp}. Please renew it and send the new card to the owners.`); n++; }
  if (lines.length && ownerMail(S)) queue(S, ownerMail(S), "Staff certifications expiring", lines.join("\n"));
  return n;
}
export function lowStock(S: any) {
  const low = (S.inventory || []).filter((i: any) => +i.min > 0 && (+i.qty || 0) <= +i.min && !i.lowWarned); if (!low.length) return 0;
  low.forEach((i: any) => (i.lowWarned = true));
  if (ownerMail(S)) queue(S, ownerMail(S), `Low stock: ${low.length} item${low.length > 1 ? "s" : ""}`, low.map((i: any) => `${i.name}${i.size ? " (" + i.size + ")" : ""}: ${i.qty || 0} left (reorder at ${i.min})`).join("\n") + "\n\nStudio admin → Money → Shop to order more.");
  (S.inventory || []).forEach((i: any) => { if (i.lowWarned && (+i.qty || 0) > +i.min) delete i.lowWarned; });
  return low.length;
}
export async function errDigest(S: any) {
  const db = await kv(), log = (await db.get("errlog")) || [], since = (S.errSeen || 0); const fresh = log.filter((e: any) => e.ts > since);
  if (!fresh.length) return 0; S.errSeen = Date.now();
  if (ownerMail(S)) queue(S, ownerMail(S), `App errors: ${fresh.length} in the last day`, fresh.slice(0, 20).map((e: any) => `${new Date(e.ts).toISOString().slice(0, 16)} · ${e.where} · ${e.msg}`).join("\n") + "\n\nIf these keep coming, send this email to whoever looks after the website.");
  return fresh.length;
}
export async function logError(body: any, who: string) {
  const db = await kv(), log = (await db.get("errlog")) || [];
  const e = { ts: Date.now(), msg: String(body.msg || "").slice(0, 300), where: String(body.where || "").slice(0, 120), ua: String(body.ua || "").slice(0, 120), who };
  if (log.slice(0, 30).filter((x: any) => x.msg === e.msg).length >= 5) return;
  log.unshift(e); await db.set("errlog", log.slice(0, 200));
}
/* ---------- nightly backup: the whole data file, kept 30 days ---------- */
export async function backup(S: any) {
  const db = await kv(), t = today(); await db.set("backup/" + t, clone(S));
  const keys = (await db.list("backup/")).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 30))) await db.del(k);
  return t;
}

/* ---------- every 5 minutes: shift reminders, medicine times, kiosk heartbeat ---------- */
export async function fiveMinute(S: any, min: number, day: number) {
  const db = await kv(), t = today(); let changed = false;
  { // pushTo checks push setup itself; texts work without it
    for (const sh of (S.shifts || []).filter((x: any) => +x.d === day)) {
      const [h, m] = String(sh.s).split(":").map(Number), lead = h * 60 + m - min; if (lead <= 50 || lead > 60) continue;
      const who = (S.staff || []).find((x: any) => x.id === sh.staff); if (!who || (S.timeoff || []).some((o: any) => o.staff === who.id && o.status === "ok" && o.from <= t && o.to >= t)) continue;
      const k = `shrem/${t}/${sh.id}`; if (await db.get(k)) continue; await db.set(k, 1);
      if (await pushTo(who, "shift", { title: "Shift in 1 hour", body: `${sh.job || "Your shift"} ${sh.s}–${sh.e} at Kicks`, url: "/#/staff/today" })) changed = true;
      if (who.shiftText && who.phone && (S.billing || {}).text) { queue(S, who.phone, "Text message", `Kicks: your shift (${sh.job || "shift"}) starts at ${sh.s}.`, "text"); changed = true; }
    }
    for (const s of (S.students || []).filter((x: any) => x.asp && x.med && x.med.giveTime)) {
      const [h, m] = s.med.giveTime.split(":").map(Number), lead = h * 60 + m - min; if (lead < 0 || lead > 5) continue;
      if ((S.meds || []).some((x: any) => x.studentId === s.id && x.date === t)) continue;
      const k = `medrem/${t}/${s.id}`; if (await db.get(k)) continue; await db.set(k, 1);
      for (const c of (S.staff || []).filter((x: any) => x.role === "coach" || x.role === "admin")) if (await pushTo(c, "ops", { title: `💊 Medicine for ${first(s.name)}`, body: `${s.med.giveName || "Medicine"} at ${s.med.giveTime}. Log it in After School when given.`, url: "/#/staff/asp" })) changed = true;
    }
  }
  // kiosk heartbeat: during class hours, tell owners once a day if the tablet has been silent for 20+ minutes
  const classNow = CLASSES.some((c: any) => c.d === day && (() => { const [a, b] = c.s.split(":").map(Number), [x, y] = c.e.split(":").map(Number); return min >= a * 60 + b && min <= x * 60 + y; })());
  const beat = await db.get("kiosk/beat");
  if (classNow && beat && beat.date === t && Date.now() - beat.ts > 20 * 60000 && !(await db.get("kiosk/warned/" + t))) {
    await db.set("kiosk/warned/" + t, 1);
    for (const o of owners(S)) if (await pushTo(o, "ops", { title: "Check-in tablet is offline", body: "The kiosk hasn't checked in for 20 minutes. Check the wifi or charger.", url: "/#/admin/overview" })) changed = true;
  }
  return changed;
}

/* ================= round 4 ================= */
export const creditBal = (S: any, fid: string) => (S.credits || []).filter((c: any) => c.familyId === fid).reduce((a: number, c: any) => a + (+c.amount || 0), 0);
export const subTok = (e: string) => crypto.createHmac("sha256", process.env.SESSION_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "kicks-unsub").update(String(e).toLowerCase()).digest("hex").slice(0, 20);
/* a staff member's shifts for the next 8 weeks */
export function staffIcs(S: any, m: any) {
  const t = today(), stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kicks Unlimited//Staff shifts//EN", "X-WR-CALNAME:Kicks shifts", "X-WR-TIMEZONE:America/Chicago", "REFRESH-INTERVAL;VALUE=DURATION:PT6H"];
  const closed = new Set((S.events || []).filter((e: any) => e.noClasses).map((e: any) => e.date));
  for (let i = 0; i < 56; i++) { const d = addDays(t, i), wd = new Date(d + "T12:00:00Z").getUTCDay(); if (closed.has(d)) continue; if ((S.timeoff || []).some((o: any) => o.staff === m.id && o.status === "ok" && o.from <= d && o.to >= d)) continue;
    for (const sh of (S.shifts || []).filter((x: any) => x.staff === m.id && +x.d === wd)) L.push("BEGIN:VEVENT", `UID:${d}-${sh.id}@kickssp`, `DTSTAMP:${stamp}`, `DTSTART;TZID=America/Chicago:${icsDT(d, sh.s)}`, `DTEND;TZID=America/Chicago:${icsDT(d, sh.e)}`, `SUMMARY:${icsEsc("Kicks: " + (sh.job || "Shift"))}`, "END:VEVENT"); }
  for (const e of (S.events || []).filter((x: any) => x.date >= t && x.date <= addDays(t, 120) && (x.aud === "staff" || x.kind === "staff"))) L.push("BEGIN:VEVENT", `UID:sev-${e.id}@kickssp`, `DTSTAMP:${stamp}`, ...(e.time ? [`DTSTART;TZID=America/Chicago:${icsDT(e.date, e.time)}`, "DURATION:PT1H"] : [`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`]), `SUMMARY:${icsEsc(e.title)}`, "END:VEVENT");
  L.push("END:VCALENDAR"); return L.join("\r\n") + "\r\n";
}
/* class packs & drop-ins: when the bill is paid, the classes go on the student */
export function packCredit(S: any) {
  for (const i of (S.invoices || []).filter((x: any) => x.pack && x.status === "paid" && !x.packDone)) { const s = (S.students || []).find((k: any) => k.id === i.pack.studentId); if (s) s.packLeft = (+s.packLeft || 0) + (+i.pack.n || 0); i.packDone = true; }
}
/* daily: recurring expenses, contract renewals */
export function recurringExpenses(S: any) {
  const cfg = (S.ocfg || []).find((x: any) => x.id === "cfg") || {}, t = today(), day = +t.slice(8), ym = t.slice(0, 7); let n = 0;
  for (const r of cfg.recurring || []) { if (+r.day !== day && !(+r.day > 28 && day === 28)) continue; const key = `rec:${r.id}:${ym}`; if ((S.expenses || []).some((e: any) => e.rec === key)) continue; (S.expenses = S.expenses || []).push({ id: uid("ex"), date: t, amount: Math.round(+r.amount || 0), cat: r.cat || "Other", note: r.name || "", rec: key, ts: Date.now() }); n++; }
  return n;
}
export function contractReminders(S: any) {
  const t = today(), soon = addDays(t, 30); let n = 0; const lines: string[] = [];
  for (const f of (S.families || []).filter((x: any) => x.status === "approved" && x.contractEnd && x.contractEnd <= soon && x.contractEnd >= t && x.contractWarned !== x.contractEnd)) { f.contractWarned = f.contractEnd; lines.push(`${f.parent}: ${f.contractEnd}`); tell(S, f, ["Your Kicks membership agreement is up for renewal", "Su acuerdo de membresía en Kicks está por renovarse"], [`Hi ${first(f.parent)},\n\nYour membership agreement ends ${f.contractEnd}. We'd love to keep training with you — the front desk will help you renew, or just reply to this email.`, `Hola, ${first(f.parent)}:\n\nSu acuerdo de membresía termina el ${f.contractEnd}. Nos encantaría seguir entrenando con ustedes: la recepción le ayuda a renovar, o responda a este correo.`]); n++; }
  if (lines.length && ownerMail(S)) queue(S, ownerMail(S), "Memberships up for renewal (30 days)", lines.join("\n"));
  return n;
}
/* five-minute job: release scheduled studio messages (text them if the family chose texts) */
export function scheduledMessages(S: any) {
  let n = 0; for (const m of (S.messages || []).filter((x: any) => x.sendAt && x.sendAt <= Date.now() && !x.released)) { m.released = true; m.ts = m.sendAt; const f = (S.families || []).find((x: any) => x.id === m.familyId); if (f && f.phone && f.notify && f.notify.text && (S.billing || {}).msgText !== false) queue(S, f.phone, "Text message", `Kicks Unlimited: ${String(m.text).slice(0, 600)}`, "text"); n++; }
  return n;
}
/* Hmong: machine-translate outgoing family email/text right before sending (only with an AI key) */
export async function hmnTranslate(text: string) {
  if (!aiOn() || !text) return text;
  try { const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 1200, system: "Translate this message from a martial arts studio to a family into White Hmong (RPA spelling). Keep names, dates, times, prices, codes and links exactly as they are. Reply with the translation only.", messages: [{ role: "user", content: text.slice(0, 4000) }] }) }); const j: any = await r.json(); const out = String(((j.content || [])[0] || {}).text || "").trim(); return out ? out + "\n\n(Txhais los ntawm tshuab — Machine translated. English below.)\n\n" + text : text; } catch (e) { return text; }
}

/* ================= round 5 ================= */
/* 101 · monthly owner digest (1st of the month) */
export function ownerDigest(S: any) {
  const t = today(); if (t.slice(8) !== "01" || !ownerMail(S) || (S.digestSent === t)) return 0; S.digestSent = t;
  const d = new Date(t + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 1); const ym = d.toISOString().slice(0, 7);
  const paid = (S.invoices || []).filter((i: any) => i.status === "paid" && new Date(i.paidAt || i.created || 0).toISOString().slice(0, 7) === ym), exp = (S.expenses || []).filter((e: any) => String(e.date).startsWith(ym));
  const act = (S.students || []).filter((s: any) => s.status === "active"), visits = act.reduce((n: number, s: any) => n + (s.att || []).filter((x: string) => x.startsWith(ym)).length, 0);
  const lines = [`Kicks Unlimited — ${ym}`, "", `Paid in: ${money(paid.reduce((a: number, i: any) => a + i.amount, 0))} (${paid.length} bills)`, `Expenses logged: ${money(exp.reduce((a: number, e: any) => a + e.amount, 0))}`, `Open bills now: ${money((S.invoices || []).filter((i: any) => i.status === "open").reduce((a: number, i: any) => a + i.amount, 0))}`, `Active students: ${act.length}`, `Class visits: ${visits}`, `Belts earned: ${(S.promos || []).filter((p: any) => String(p.date).startsWith(ym)).length}`, `First Looks: ${(S.inquiries || []).filter((q: any) => new Date(q.ts || 0).toISOString().slice(0, 7) === ym).length}`, `New families: ${(S.families || []).filter((f: any) => f.created && new Date(f.created).toISOString().slice(0, 7) === ym).length}`, `Incidents: ${(S.incidents || []).filter((i: any) => String(i.date).startsWith(ym)).length}`, "", "Studio admin → Reports for details."];
  queue(S, ownerMail(S), `Kicks monthly digest: ${ym}`, lines.join("\n")); return 1;
}
/* 146 · First Look reminder the day before */
export function trialReminders(S: any) {
  const tm = addDays(today(), 1); let n = 0;
  for (const q of (S.inquiries || []).filter((x: any) => x.slot && x.slot.slice(0, 10) === tm && !x.remSent && x.status !== "closed")) {
    q.remSent = true; const es = q.lang === "es", time = q.slot.slice(11, 16), msg = es ? `Kicks Unlimited: le esperamos mañana a las ${time} para el First Look de ${q.child}. 601 S. Bird Street. ¿Cambios? Llame al (608) 834-9992.` : `Kicks Unlimited: see you tomorrow at ${time} for ${q.child}'s First Look! 601 S. Bird Street. Need to change it? Call (608) 834-9992.`;
    if (q.email) queue(S, q.email, es ? "Recordatorio: First Look mañana" : "Reminder: First Look tomorrow", msg); if (q.phone && (S.billing || {}).text) queue(S, q.phone, "Text message", msg, "text"); n++;
  }
  return n;
}
/* 148 · first week at Kicks emails (days 1, 3, 7 after approval) */
export function welcomeSeries(S: any) {
  if (!feat(S, "welcomeSeries")) return 0; let n = 0; const now = Date.now();
  const M: any = { 1: [["Welcome to Kicks! Your family app", "¡Bienvenidos a Kicks! Su app familiar"], ["Welcome to Kicks Unlimited! In the family app you can see your kids' schedule, pay bills, message the studio and follow Belt Quest. Questions? Reply to this email.", "¡Bienvenidos a Kicks Unlimited! En la app familiar puede ver el horario, pagar, escribir al estudio y seguir la Misión del cinturón. ¿Preguntas? Responda a este correo."]], 3: [["Tips for your first classes", "Consejos para las primeras clases"], ["Come 5–10 minutes early, bring a water bottle, and check Belt Quest after class to see stripes as they're earned. The calendar shows closures and events.", "Lleguen 5–10 minutos antes, traigan agua y revisen la Misión del cinturón después de clase. El calendario muestra cierres y eventos."]], 7: [["How's the first week going?", "¿Cómo va la primera semana?"], ["We hope your family is loving Kicks! If anything could be better, message us in the app — we read every note.", "¡Esperamos que su familia esté disfrutando Kicks! Si algo puede mejorar, escríbanos en la app."]] };
  for (const f of (S.families || []).filter((x: any) => x.status === "approved" && x.approvedAt)) { const day = Math.floor((now - f.approvedAt) / 864e5); f.welcome = f.welcome || []; for (const k of [1, 3, 7]) if (day >= k && day <= k + 2 && !f.welcome.includes(k)) { f.welcome.push(k); tell(S, f, M[k][0], [`Hi ${first(f.parent)},\n\n${M[k][1][0]}`, `Hola, ${first(f.parent)}:\n\n${M[k][1][1]}`]); n++; } }
  return n;
}
/* 28/29 · yearly "is your info still right?" reminder */
export function infoCheck(S: any) {
  if (!feat(S, "infoCheck")) return 0; let n = 0; const yr = Date.now() - 365 * 864e5;
  for (const f of (S.families || []).filter((x: any) => x.status === "approved" && (x.infoChecked || x.created || 0) < yr && (!x.infoAsked || x.infoAsked < Date.now() - 30 * 864e5))) { f.infoAsked = Date.now(); tell(S, f, ["Please check your family's info", "Revise la información de su familia"], [`Hi ${first(f.parent)},\n\nIt's been a year — please open the family app → Account and check your emergency contacts, pickup people and your kids' health notes. Tap "Everything is up to date" when you're done.`, `Hola, ${first(f.parent)}:\n\nYa pasó un año: abra la app familiar → Cuenta y revise los contactos de emergencia, las personas que recogen y la información de salud. Toque "Todo está al día" al terminar.`]); n++; }
  return n;
}
