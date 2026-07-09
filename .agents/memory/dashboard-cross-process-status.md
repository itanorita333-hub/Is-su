---
name: Dashboard/bot cross-process status bug
description: Why dashboard.js status/profile-pic checks via global.botSocket don't work, and the fix pattern.
---

`start.sh` runs the bot (`SKIP_DASHBOARD=1 node index.js`) and the dashboard (`node -e "require('./dashboard')"`) as two separate OS processes for crash resilience (dashboard survives bot crashes/restarts).

This means `global.botSocket` set inside `index.js` is invisible to `dashboard.js` — it lives in a different process's memory. Any dashboard code that reads `global.botSocket` (connection status, live profile picture fetch, group metadata lookups) silently always sees `null`/`undefined`, even while the bot is genuinely connected. This caused the sidebar profile picture to always be blank/wrong, unrelated to actual WhatsApp account identity.

**Why:** Node.js `global` is per-process; it is not shared across `&`-spawned background processes even within the same repl/codebase.

**How to apply:** Any state the bot process needs to expose to the dashboard process must go through a file (e.g. `data/qrState.json`, `data/botInfo.json`), not `global`. The bot should write live account/profile info to `data/botInfo.json` on connect and periodically (e.g. every 5 min) while connected; dashboard should derive `connected` from `qrState.json`'s `status === 'connected'` (written directly by the bot's `connection.update` 'open'/'close' handlers) rather than trying to check the socket object. Don't gate `connected` on `creds.registered` — some restored/legacy sessions never persist that flag even while genuinely connected.
