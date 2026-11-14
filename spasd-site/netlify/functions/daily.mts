// Runs every morning: auto-delete old messages, daily digest, and the Sunday weekly summary.
import type { Config } from "@netlify/functions";
import { S, env, getSettings, getCol, allSubmissions, sendEmail, esc, audit } from "../lib/core.mts";

export default async () => {
  const st = await getSettings();
  const subs = await allSubmissions();

  // Auto-delete (retention)
  const cutoff = Date.now() - (Number(st.retentionDays) || 365) * 864e5;
  let removed = 0;
  for (const s of subs) if (Date.parse(s.created) < cutoff) { await S.inbox().delete(s.key); removed++; }
  if (removed) await audit({ id: "system" }, "Auto-deleted old messages", String(removed));

  const to = st.digestEmail || env("ADMIN_EMAIL");
  if (!to || !env("RESEND_API_KEY")) return;
  const day = Date.now() - 864e5;
  const fresh = subs.filter(s => Date.parse(s.created) > day && !s.spam);
  const qs = await getCol("questions");
  const overdue = qs.filter(q => q.status !== "answered" && q.sent && Date.now() - Date.parse(q.sent) > 7 * 864e5);

  if (fresh.length || overdue.length) {
    const byForm: Record<string, number> = {};
    fresh.forEach(s => (byForm[s.form] = (byForm[s.form] || 0) + 1));
    await sendEmail(to, `Student Voice: ${fresh.length} new, ${overdue.length} waiting on the district`,
      `<p><b>New in the last day:</b> ${fresh.length ? Object.entries(byForm).map(([f, n]) => `${n} ${esc(f)}`).join(", ") : "nothing"}.</p>` +
      (fresh.some(s => s.flag) ? `<p style="color:#9b2c2c"><b>${fresh.filter(s => s.flag).length} safety-flagged message(s).</b></p>` : "") +
      (overdue.length ? `<p><b>Waiting over 7 days:</b></p><ul>${overdue.map(q => `<li>${esc(q.title)} (sent ${esc(q.sent)} to ${esc(q.to || "?")})</li>`).join("")}</ul>` : ""));
  }

  // Sunday weekly summary (Chicago time)
  const wd = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short" });
  if (wd === "Sun" && st.weeklyEmail !== false) {
    const week = subs.filter(s => Date.parse(s.created) > Date.now() - 7 * 864e5 && !s.spam);
    const topics: Record<string, number> = {};
    week.forEach(s => (topics[s.tag] = (topics[s.tag] || 0) + 1));
    const tasks = (await getCol("tasks")).filter(t => t.status !== "done");
    await sendEmail(to, "Student Voice: your week",
      `<p><b>${week.length}</b> messages this week. Top topics: ${Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${esc(t)} (${n})`).join(", ") || "none"}.</p>` +
      `<p><b>${overdue.length}</b> questions waiting on the district. <b>${tasks.length}</b> open team tasks.</p>`);
  }
};

// 7:00 AM Central Standard Time = 13:00 UTC (8 AM during daylight time).
export const config: Config = { schedule: "0 13 * * *" };
