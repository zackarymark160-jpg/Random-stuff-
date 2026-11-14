// Netlify runs this for every form submission on the site. It files each one in the admin inbox.
import { saveSubmission, sendEmail, env, getSettings, esc } from "../lib/core.mts";

export default async (req: Request) => {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const p = body.payload || body;
  const data = p.data || {};
  const form = p.form_name || data["form-name"] || "form";
  const rec = await saveSubmission(form, data, { netlifyId: p.id, created: p.created_at || new Date().toISOString() });
  // Safety-flagged messages email the owner right away (when email is set up).
  if (rec.flag && !rec.spam) {
    const st = await getSettings();
    await sendEmail(st.digestEmail || env("ADMIN_EMAIL") || "", "Safety flag: new message on Student Voice",
      `<p>A message on the <b>${esc(form)}</b> form matched safety words. Open the admin inbox to read it.</p><p>${esc(st.crisis)}</p>`);
  }
  return new Response("ok");
};
