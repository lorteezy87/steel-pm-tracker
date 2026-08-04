# Steel PM Multi-Project Tracker

Lightweight multi-project tracker for structural steel fabrication & erection PMs.

## Multi-device access

1. Deploy this app (Vercel recommended — TanStack Start + Nitro `vercel` preset).
2. Open the **same production URL** on every shop laptop / phone.
3. Data syncs through `/api/pm/workspace` (shared Postgres when `DATABASE_URL` is set).
4. In-app: **Team Access** page → copy link, export/import JSON backup.

## Local

```bash
npm install
npm run dev   # 0.0.0.0:8080
```
