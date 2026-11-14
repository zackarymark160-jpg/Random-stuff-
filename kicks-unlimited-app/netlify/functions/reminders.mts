// Every morning: payment-due reminders + send anything waiting in the outbox.
import { withState, loadState, saveState, runReminders, autoTuition, deliver, eventReminders, monthlyReport, archiveOld, familyAuto } from "../lib/state.mts";
import { autopayRun, lateFees, flFollow, reviewAsk, certExpiry, lowStock, errDigest, backup, recurringExpenses, contractReminders, packCredit, ownerDigest, trialReminders, welcomeSeries, infoCheck } from "../lib/extra.mts";
export const config = { schedule: "0 14 * * *" }; // ~8–9 AM in Sun Prairie
const run = async () => {
  const S = await loadState();
  const b = await backup(S).catch(() => "failed");
  const t = autoTuition(S);
  const n = runReminders(S);
  const e = eventReminders(S);
  const r = monthlyReport(S);
  const fa = familyAuto(S);
  const a = await archiveOld(S);
  const ap = await autopayRun(S).catch((e) => { console.log("autopay", e); return 0; });
  const rx = recurringExpenses(S), cr = contractReminders(S); packCredit(S); const dg = ownerDigest(S), tr = trialReminders(S), ws = welcomeSeries(S), ic = infoCheck(S);
  const lf = lateFees(S), fl = flFollow(S), rv = reviewAsk(S), ce = certExpiry(S), ls = lowStock(S), er = await errDigest(S).catch(() => 0);
  await deliver(S);
  await saveState(S);
  console.log(`tuition invoices: ${t}, reminders queued: ${n}, event reminders: ${e}, monthly report: ${r}, archived: ${a}, family emails: ${fa}, backup: ${b}, autopay: ${ap}, late fees: ${lf}, follow-ups: ${fl}, review asks: ${rv}, certs: ${ce}, low stock: ${ls}, errors: ${er}, recurring: ${rx}, renewals: ${cr}, digest: ${dg}, trial reminders: ${tr}, welcome: ${ws}, info checks: ${ic}`);
};
// if someone else saved while this ran, run again on fresh data
export default () => withState(run);
