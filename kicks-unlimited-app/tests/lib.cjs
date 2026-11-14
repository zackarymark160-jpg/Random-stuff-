const { chromium } = require("playwright");
const R = []; const ok = (c, m, extra = "") => { R.push([c ? "PASS" : "FAIL", m, extra]); console.log((c ? "PASS " : "FAIL ") + m + (extra ? "  — " + extra : "")); };
const B = "http://localhost:8888/";
async function ctx(b, ip) { const c = await b.newContext({ extraHTTPHeaders: { "x-test-ip": ip } }); const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); return p; }
async function login(p, route, name, pw, code) {
  await p.goto(B + route); await p.waitForSelector("#sn");
  await p.fill("#sn", name); await p.fill("#spw", pw); await p.fill("#src", code);
  const resp = p.waitForResponse(r => r.url().includes("/api/login"));
  await p.press('#src','Enter'); const r = await resp; await p.waitForTimeout(900);
  return { status: r.status(), body: await r.json().catch(() => ({})) };
}
const text = (p) => p.evaluate(() => document.body.innerText);
const api = (p, path, body = {}) => p.evaluate(async ([a, b]) => { try { return { ok: true, r: await apiCall(a, b) }; } catch (e) { return { ok: false, msg: e.message }; } }, [path, body]);
module.exports = { chromium, R, ok, B, ctx, login, text, api };
