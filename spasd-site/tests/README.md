# Site tests

`site.test.cjs` checks the whole site against a local Netlify dev server (163 checks): every page and view on phone and desktop, every in-page link and file, all forms, the form-to-admin-inbox pipeline, the public API, admin login and logout, attack tests for each security fix, security headers, the feed and calendar, and WCAG A/AA accessibility in light and dark mode.

```bash
cd spasd-site && npm install
export SESSION_SECRET=any-local-secret ADMIN_EMAIL=test@example.com
export ADMIN_PASSWORD_HASH=$(node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log('scrypt\$'+s+'\$'+c.scryptSync('TestPass-12345',s,32).toString('hex'))")
netlify dev --port 8888 &
BASE=http://localhost:8888 ADMIN_PW=TestPass-12345 AXE=path/to/axe-core/axe.min.js node tests/site.test.cjs
```

Notes:
- Use throwaway local values, never your real admin password.
- Delete `.netlify/` between runs. The dev server can't proxy a very large inbox response, and repeated runs fill the inbox with test messages.
- `netlify dev` ignores `Cache-Control` rules, so the test checks `netlify.toml` for those instead.
