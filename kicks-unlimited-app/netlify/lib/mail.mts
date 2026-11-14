// Sends email through SMTP (e.g. a Gmail app password) or Resend, and texts through Twilio.
// Nothing is sent until the matching environment variables are set in Netlify.
export function mailOn(): boolean {
  return !!((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}
export function smsOn(): boolean {
  return !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM);
}
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export function wrap(title: string, text: string): string {
  const body = esc(text).replace(/\n/g, "<br>");
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:540px;margin:auto;color:#1E1E22">
<div style="background:#26262B;color:#fff;padding:14px 18px;border-radius:12px 12px 0 0;font-weight:900;font-style:italic;font-size:19px;border-bottom:5px solid #C2182B">KICKS<span style="color:#E8394C">UNLIMITED</span></div>
<div style="border:1px solid #E2DDD3;border-top:0;padding:18px;border-radius:0 0 12px 12px">
<h2 style="margin:0 0 10px;font-size:19px">${esc(title)}</h2><div style="font-size:15px;line-height:1.55">${body}</div>
<p style="color:#5E5C66;font-size:12px;margin-top:22px">Kicks Unlimited Family Martial Arts Center · 601 S. Bird St., Sun Prairie, WI · (608) 834-9992</p></div></div>`;
}
export async function sendMail(to: string, subject: string, text: string, fromName = "Kicks Unlimited"): Promise<{ ok: boolean; reason?: string }> {
  if (!mailOn()) return { ok: false, reason: "not_configured" };
  // one plain address per email: anything with quotes, brackets, commas or semicolons is refused
  if (!/^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(String(to || ""))) return { ok: false, reason: "bad_address" };
  const from = process.env.MAIL_FROM || `${fromName} <${process.env.SMTP_USER || "onboarding@resend.dev"}>`;
  const html = wrap(subject, text);
  try {
    if (process.env.RESEND_API_KEY && !process.env.SMTP_USER) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      return r.ok ? { ok: true } : { ok: false, reason: "resend_" + r.status };
    }
    const nm: any = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 465);
    const tr = (nm.default || nm).createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await tr.sendMail({ from, to, subject, html, text });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: String(e && e.message ? e.message : e).slice(0, 160) };
  }
}
function e164(p: string): string {
  const d = String(p || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return d;
}
export async function sendSMS(to: string, body: string): Promise<{ ok: boolean; reason?: string }> {
  if (!smsOn()) return { ok: false, reason: "not_configured" };
  const sid = process.env.TWILIO_SID as string, tok = process.env.TWILIO_TOKEN as string;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(sid + ":" + tok).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: e164(to), From: process.env.TWILIO_FROM as string, Body: body.slice(0, 1500) }),
    });
    return r.ok ? { ok: true } : { ok: false, reason: "twilio_" + r.status };
  } catch (e: any) {
    return { ok: false, reason: String(e && e.message ? e.message : e).slice(0, 160) };
  }
}
