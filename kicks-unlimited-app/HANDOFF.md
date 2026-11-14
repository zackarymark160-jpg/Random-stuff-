# Kicks app — handoff manual

## What it is
One Netlify site: public website, family portal (`#/family`), staff hub (`#/staff`), studio admin (`#/admin`), check-in kiosk (`#/kiosk`) and lobby TV (`#/tv`). Data lives in Netlify Blobs, not in the site files.

## Where things live
- **Netlify** — site files (`public/`) and server functions (`netlify/functions`). Environment variables hold every key.
- **Stripe** — card payments, autopay, payouts. Card numbers never touch the app.
- **Email / texts** — the services set in Settings (see SETUP.md).

## Logins
- **Never write passwords or rank codes in this file, the app, or a chat.** The old ones (shared starter password + the five rank codes) were printed inside the public app files, so they're retired.
- Rank codes live in Netlify → Environment variables → `KICKS_RANK_CODES` (e.g. `admin=…,ema=…,coach=…,lit=…,desk=…`), and owners can change them any time in Studio admin → Staff & codes.
- Staff who never picked their own password log in with the private starter password in `KICKS_STARTER_PW`, then the app makes them pick their own before anything else works.
- New staff and password resets get a **one-time password** shown to the owner on screen. Hand it over in person or by text.

## Routine
- **Daily:** Approvals page.
- **Weekly:** open bills, Team corner (supplies, staff questions), Team care (wellness check-ins).
- **Monthly:** read the owner digest (1st), check Stripe payouts vs card payments, download a backup (Settings → Backups).

## Rollback plan
1. Netlify → Deploys → pick the last good deploy → **Publish deploy**. Live in about a minute.
2. Data isn't touched by a rollback. Settings → Backups downloads a full copy any time.
3. To pause only the family app: Launch kit → "Only pilot families can log in".
4. Post a note on the website banner so families know.

## Privacy rules built in
- Medical info: owners and coaches only.
- Photos: only kids with photo permission appear on the website/TV; parents can hide any single photo.
- Check-in: by name or QR card — never face scanning.
- View-only logins (e.g. grandparents) can't pay, edit or message.

## Updating the app
Edit files in `src/`, run `node build.mjs`, then deploy the `site/` folder (drag-and-drop or Git).
