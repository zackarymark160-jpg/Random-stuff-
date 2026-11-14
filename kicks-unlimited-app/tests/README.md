# Lockdown tests

These run the real site and backend on your computer and drive them with a browser, using Playwright. They use made-up passwords and codes, never your real ones.

```
npm install && npm i -D playwright && npx playwright install chromium
KF_LOCAL=/tmp/kicks-db KICKS_RANK_CODES="admin=3152,ema=4213,coach=2534,lit=5321,desk=1453" \
  KICKS_STARTER_PW="Starter-Test-2026" SESSION_SECRET=test STRIPE_WEBHOOK_SECRET=whsec_localtest \
  node --experimental-strip-types tests/server.mjs "$PWD" 8888 &
cd tests && node t1.cjs && node t2.cjs && DB=/tmp/kicks-db node t3.cjs
```

- **t1:** owner login and forced password change.
- **t2:** staff accounts, one-time passwords, sub finder and lockouts.
- **t3:** families, reset codes, view-only logins, the newsletter list and payments during a busy moment.

Start with an empty `KF_LOCAL` folder and run the three in order. `multi.mjs` is the save-collision stress test: run 4 copies of `server.mjs` on the same `KF_LOCAL`.
