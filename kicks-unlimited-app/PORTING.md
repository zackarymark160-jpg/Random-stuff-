# Carrying the security fixes into your next version

Whatever tool or person builds the next version must keep every item below. If you upload a new version, Claude can re-apply them all in one pass.

## The fast way (backend)
`security-backend.patch` holds every server change (`netlify/` and `package.json`). If your new version's backend hasn't changed much:

```
cd kicks-unlimited-app
patch -p1 < security-backend.patch
npm install
```

If parts of it fail to apply, use the checklist.

## Checklist: the app must still…

**In the browser files (`app.js` / `portal.js`, or your `src/`)**
- [ ] contain no real password or rank code. Search the built files for the old password and the old codes before every deploy.
- [ ] show the owner the `temp` value returned by `admin/new-staff` and `admin/reset-staff` (the "One-time password" popup), not a fixed password.
- [ ] show the "Pick your own password" popup whenever login returns `pwDefault: true`.

**On the server**
- [ ] read rank codes from `KICKS_RANK_CODES` and the starter password from `KICKS_STARTER_PW`, with no defaults in `seed.mts`.
- [ ] store passwords with `pwSet()` (salted scrypt) and check them with `pwCheck()`. Never compare `rec.pw === body.pw`.
- [ ] give starter/one-time-password logins a `mustPw` session that can only call `state`, `password` and `logout`.
- [ ] rate-limit `reset` and delete the code after 5 wrong guesses.
- [ ] apply the login lockout per name + device (6 tries) and per name overall (40).
- [ ] save with `saveState()`, which checks the etag, inside `withState()`. Never write `"state"` directly.
- [ ] send an idempotency key with autopay charges.
- [ ] keep newsletter subscribers in `newsSubs`, not `subs`.
- [ ] block view-only logins from pay, codes, autopay, uploads and sync.
- [ ] mark reset-code emails with `secret` so `redactCodes()` blanks them.

## Test before rollout
1. Log in as the owner with the starter password. The app should force a new password.
2. Add a staff member. A one-time password should appear. Log in with it and you should be forced to change it.
3. Type a wrong password 6 times on one phone. That phone gets locked; another device can still log in.
4. Use Forgot password, then enter a wrong code 5 times. The code should stop working.
