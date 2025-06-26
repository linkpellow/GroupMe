## 🚀 Deployment & Textdrip Hardening Plan — 27 Jun 2025

### Background
• Heroku build is green but still runs two obsolete dev hooks (`postinstall` & `prepare`) slowing every deploy and polluting logs.  
• TEXTDRIP_API_TOKEN is currently a **global env var**; the product design requires each rep to connect their **own** Textdrip account.

### Objectives
1. CLEAN-BUILD: strip dev-only hooks, shrink slug, keep CI logs quiet.  
2. TEXTDRIP v1: move token storage to user scope with secure CRUD API & minimal React UI.

---
### Key Challenges & Analysis
1. Build hooks are hard-coded in root `package.json`; deleting lines is trivial but we must regenerate lock-file once and ensure scripts never creep back.  
2. Textdrip token is consumed in `dialer-app/server/src/services/textdripService.ts` via `process.env.TEXTDRIP_API_TOKEN`; we need DB lookup per user and graceful fallback for legacy env token.
3. Must avoid breaking existing SMS features while rolling out per-user tokens — introduce token override param and feature-flag via ENV `TEXTDRIP_PER_USER=true`.

---
### High-level Task Breakdown
| ID | Task | Success Criteria |
|----|------|------------------|
| BUILD-1a | Remove `postinstall` + `prepare` scripts from ALL `package.json` files (root and workspaces); ensure deleted ones are not executed on Heroku | Heroku build log shows no `fixNativeBinaries` or `husky` steps |
| BUILD-1b | Regenerate single root `package-lock.json`; commit & push | Build passes; slug ≤ 370 MB |
| TD-1 | Create Mongoose model `TextdripToken` (`userId`, `token`, timestamps) | Unit test passes, collection auto-indexes |
| TD-2 | Add TextdripTokenService with `getToken(userId)` + `setToken(userId, token)` | Jest test mocks DB and returns expected |
| TD-3 | Refactor `textdripService.ts` to call `TextdripTokenService.getToken(userId)`; fallback to env var if absent | Existing Textdrip unit tests still pass |
| TD-4 | Add routes:  
  • `GET  /api/textdrip/token` → { connected: bool }  
  • `POST /api/textdrip/token` → { success:true }  
  • `DELETE /api/textdrip/token` | Swagger docs updated; 200 responses in Postman |
| TD-5 | Front-end Integrations page (route `/settings/integrations/textdrip`) with connect / disconnect UI | Admin can connect token and send test SMS successfully |
| TD-6 | Feature flag rollout — set `TEXTDRIP_PER_USER=true` on staging/production | Global env token no longer required; server boots |

---
### Project Status Board
- [x] BUILD-1a Remove scripts from package.jsons
- [ ] BUILD-1b Regenerate lockfile & deploy
- [ ] TD-1 Create model
- [ ] TD-2 Service layer
- [ ] TD-3 Refactor server usage
- [ ] TD-4 API routes
- [ ] TD-5 Front-end UI
- [ ] TD-6 Enable flag & smoke test
- [x] CLEAN-ROLLUP remove mac rollup (optional deps pruned, lockfile regenerated)
- [ ] BUILD-LOCK regenerate & deploy (pending push & Heroku build)

### Executor Notes / Guidance
1. Complete tasks **one at a time** — commit & push after each BUILD step, run `heroku logs` to verify.  
2. For TD-tasks, use TDD — add Jest tests under `dialer-app/server/__tests__/textdripToken.test.ts`.  
3. Hashing token is optional for MVP because Textdrip tokens are revocable; store plaintext but mark TODO for encryption.  
4. Keep PR granularity small to ease rollback.

### Executor's Feedback or Assistance Requests
• CLEAN-ROLLUP done. Removed linux native binary optional dep and regenerated lockfile. Expect ~40-50 MB slug reduction. Next: push to Heroku (BUILD-LOCK) and verify slug +  EBADPLATFORM gone.

---
### Lessons (append)
• Heroku still downloads Mac binary if it exists in lock-file; always regenerate lock after changing optional deps.

### Immediate Launch Checklist (added 30 Jun 2025)
| ID | Task | Owner | Success Criteria |
|----|------|-------|------------------|
| DEP-1 | Smoke-test current Heroku app (v246) – ensure login, dashboard, API routes work | Executor | Manual QA passes, no 5xx in logs | 
| DEP-2 | Point `crokodial.com` to Heroku app via Cloudflare CNAME | User | `curl https://crokodial.com` returns 200 | 
| DEP-3 | Enable Heroku automated SSL & force https | Executor | `https://crokodial.com` green lock | 
| DEP-4 | Create simple uptime monitoring (Heroku cron ping or UptimeRobot) | Executor | Monitor shows 2h uptime without alerts |

### Backlog Build Optimisations
| ID | Task | Note |
|----|------|------|
| BUILD-1b | Shrink slug < 370 MB – remove Rollup native optionals, archive heavy assets | nice-to-have | 

### New Issue Analysis (Mongo + Build errors)
Heroku dyno crashes at runtime:
```
Failed to start production server: MongoServerError: Authentication failed.
```
Build logs still show:
• running `postinstall` + `prepare` (means scripts crept back)
• `EBADPLATFORM` for `@rollup/rollup-darwin-arm64`

Root causes:
1. **Wrong MongoDB credentials** in `MONGODB_URI` – Atlas user/pw mismatch or URI using SRV params but Heroku blocks DNS? (use `mongodb+srv://` or normal). Need new DB user with password, whitelist Heroku CIDRs, update config var.
2. **Optional native Rollup binaries** – Both darwin & linux packages present; the darwin one fails on Heroku.
3. **Residual dev hooks** – `postinstall` and `prepare` re-added (maybe via merge). Must delete again.

### Action Plan
| ID | Task | Success Criteria |
|----|------|------------------|
| DEP-MONGO | Create new Atlas DB user `heroku_app`, allow 0.0.0.0/0 temporarily, update `MONGODB_URI` in Heroku | App connects, `/api/health` returns 200 |
| CLEAN-ROLLUP | Remove `@rollup/rollup-darwin-arm64` from deps/optionalDeps; keep only `@rollup/rollup-linux-x64-gnu` as *optional* | `npm i` on Heroku no EBADPLATFORM |
| CLEAN-SCRIPTS | Purge `postinstall` & `prepare` again from all package.jsons | Heroku build shows none |
| BUILD-LOCK | Regenerate lockfile, commit, push | Build green, slug ok |

### Project Status Board (additions)
- [ ] DEP-MONGO fix Mongo URI
- [ ] CLEAN-ROLLUP remove mac rollup
- [ ] CLEAN-SCRIPTS purge hooks again
- [ ] BUILD-LOCK regenerate & deploy

### Executor Notes / Guidance
1. Complete tasks **one at a time** — commit & push after each BUILD step, run `heroku logs` to verify.  
2. For TD-tasks, use TDD — add Jest tests under `dialer-app/server/__tests__/textdripToken.test.ts`.  
3. Hashing token is optional for MVP because Textdrip tokens are revocable; store plaintext but mark TODO for encryption.  
4. Keep PR granularity small to ease rollback.

### Executor's Feedback or Assistance Requests
• CLEAN-ROLLUP done. Removed linux native binary optional dep and regenerated lockfile. Expect ~40-50 MB slug reduction. Next: push to Heroku (BUILD-LOCK) and verify slug +  EBADPLATFORM gone.

---
### Lessons (append)
• Heroku still downloads Mac binary if it exists in lock-file; always regenerate lock after changing optional deps.

### Immediate Launch Checklist (added 30 Jun 2025)
| ID | Task | Owner | Success Criteria |
|----|------|-------|------------------|
| DEP-1 | Smoke-test current Heroku app (v246) – ensure login, dashboard, API routes work | Executor | Manual QA passes, no 5xx in logs | 
| DEP-2 | Point `crokodial.com` to Heroku app via Cloudflare CNAME | User | `curl https://crokodial.com` returns 200 | 
| DEP-3 | Enable Heroku automated SSL & force https | Executor | `https://crokodial.com` green lock | 
| DEP-4 | Create simple uptime monitoring (Heroku cron ping or UptimeRobot) | Executor | Monitor shows 2h uptime without alerts |

### Backlog Build Optimisations
| ID | Task | Note |
|----|------|------|
| BUILD-1b | Shrink slug < 370 MB – remove Rollup native optionals, archive heavy assets | nice-to-have | 