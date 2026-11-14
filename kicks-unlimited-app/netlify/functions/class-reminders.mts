// Every 5 minutes: ping families who turned on class reminders, ~10 minutes before their kids' classes.
import { withState, loadState, saveState, today, deliver, queue } from "../lib/state.mts";
import { smsOn } from "../lib/mail.mts";
import { pushOn, pushTo } from "../lib/push.mts";
import { kidClassesOn } from "../lib/classes.mts";
import { kv } from "../lib/store.mts";
import { fiveMinute, scheduledMessages } from "../lib/extra.mts";
export const config = { schedule: "*/5 * * * *" };
const nowChicago = () => { const p: any = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(new Date()).map((x) => [x.type, x.value])); return { min: (+p.hour % 24) * 60 + +p.minute, day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) }; };
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const run = async () => {
  const S = await loadState();
  const t = today(), { min, day } = nowChicago(), db = await kv();
  let changed = false, sent = 0;
  if (scheduledMessages(S)) { changed = true; await deliver(S); }
  if ((S.events || []).some((e: any) => e.date === t && e.noClasses) || (S.banner && S.banner.on && S.banner.type === "closed")) { if (changed) await saveState(S); return; }
  if (await fiveMinute(S, min, day)) changed = true;
  // class reminders by text for families who picked that (one per kid per class)
  if (smsOn()) { let q = 0; for (const f of (S.families || []).filter((x: any) => x.status === "approved" && x.phone && x.notify && x.notify.clsText)) for (const k of (S.students || []).filter((s: any) => s.familyId === f.id && s.status !== "pending")) for (const c of kidClassesOn(k, day)) { const lead = toMin(c.s) - min; if (lead <= 50 || lead > 60) continue; const key = `clstxt/${t}/${k.id}/${c.s}`; if (await db.get(key)) continue; await db.set(key, 1); const m: any = queue(S, f.phone, "Text message", f.lang === "es" ? `Kicks Unlimited: ${String(k.name).split(" ")[0]} tiene ${c.n} a las ${c.s}. ¡Nos vemos!` : `Kicks Unlimited: ${String(k.name).split(" ")[0]} has ${c.n} at ${c.s}. See you soon!`, "text"); if (f.lang === "hmn") m.tr = "hmn"; q++; } if (q) { changed = true; await deliver(S); } }
  if (!pushOn() || (S.billing || {}).clsPush === false) { if (changed) await saveState(S); return; }
  for (const f of (S.families || []).filter((x: any) => x.status === "approved" && Array.isArray(x.push) && x.push.length && x.pushPrefs && x.pushPrefs.cls)) {
    for (const k of (S.students || []).filter((s: any) => s.familyId === f.id && s.status !== "pending")) {
      for (const c of kidClassesOn(k, day)) {
        const lead = toMin(c.s) - min; if (lead <= 5 || lead > 15) continue;
        const key = `clsrem/${t}/${f.id}/${k.id}/${c.s}`; if (await db.get(key)) continue; await db.set(key, 1);
        const es = f.lang === "es", fn = String(k.name).split(" ")[0];
        if (await pushTo(f, "cls", { title: es ? `Clase en ${lead} min` : `Class in ${lead} min`, body: es ? `${fn}: ${c.n} a las ${c.s}. ¡Nos vemos en Kicks! 🥋` : `${fn}: ${c.n} at ${c.s}. See you at Kicks! 🥋`, url: "/#/family/home" })) changed = true;
        sent++;
      }
    }
  }
  if (changed) await saveState(S);
  console.log(`class reminders sent: ${sent}`);
};
// if someone else saved while this ran, run again on fresh data
export default () => withState(run);
