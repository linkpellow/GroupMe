## 🚀 Deployment & Textdrip Hardening Plan — 27 Jun 2025

### Background
• Heroku build is green but still runs two obsolete dev hooks (`postinstall` & `prepare`) slowing every deploy and polluting logs.  
• TEXTDRIP_API_TOKEN is currently a **global env var**; the product design requires each rep to connect their **own** Textdrip account.
• **NEW**: Local development environment has multiple blocking issues preventing proper testing.

### Objectives
1. CLEAN-BUILD: strip dev-only hooks, shrink slug, keep CI logs quiet.  
2. TEXTDRIP v1: move token storage to user scope with secure CRUD API & minimal React UI.
3. **NEW**: Fix local development environment for testing and development workflow.

---
### Key Challenges and Analysis (update 27 Jun 2025 - Current Issues)

**CRITICAL BLOCKING ISSUES IN LOCAL DEV:**
1. **Sentry Dependencies Missing**: `@sentry/integrations` and `@sentry-internal/tracing` cause server startup failures
2. **Rollup Native Binary Issues**: Despite environment variables and .npmrc settings, Vite still tries to load `@rollup/rollup-darwin-arm64` 
3. **Port Mismatch**: Server configured for port 3005 in .env.local but was defaulting to 3001, client expects 3005
4. **Multiple Zombie Processes**: ts-node-dev processes accumulating and conflicting

**ROOT CAUSES IDENTIFIED:**
- Sentry package version mismatches after dependency cleanup
- npm's optional dependency bug persists despite multiple workarounds  
- Legacy port configurations not aligned between client/server
- Development processes not properly cleaned up between restarts

**PROGRESS MADE:**
✅ Fixed server port configuration (now uses 3005)
✅ Updated Vite proxy configuration to match
✅ Added .npmrc with optional=false
✅ Installed missing Sentry dependencies (@sentry/utils, @sentry-internal/tracing)
✅ Updated Vite config with WASM-only environment variables
✅ Regenerated package-lock.json with --no-optional flag

**REMAINING ISSUES:**
❌ @sentry/integrations still missing (new dependency needed)
❌ Rollup native binaries still in lockfile despite all attempts
❌ Need to verify MongoDB Atlas connection is working locally

### High-level Task Breakdown (LOCAL DEV FIXES - PRIORITY 1)
| ID | Task | Success Criteria |
|----|------|------------------|
| DEV-1 | Install missing @sentry/integrations dependency | Server starts without Sentry errors |
| DEV-2 | Force WASM-only Rollup by manually editing package-lock.json | Client starts without native binary errors |
| DEV-3 | Verify MongoDB connection and server startup | `curl localhost:3005/api/health` returns 200 |
| DEV-4 | Test full dev environment (client + server) | Login page loads, can authenticate, API calls work |
| DEV-5 | Document working dev setup commands | README with exact steps to start local environment |

### High-level Task Breakdown (ORIGINAL DEPLOY TASKS - PRIORITY 2)
| ID | Task | Success Criteria |
|----|------|------------------|
| FIX-1 | Purge dev hooks (`postinstall`, `prepare`, `heroku-postbuild`) from root `package.json`; switch build to `npm run build` only | Heroku log shows no husky nor fixNativeBinaries |
| FIX-2 | Lock Rollup to 4.44.1, remove ALL native addon packages, add `.npmrc` with `optional=false` | `npm ls @rollup/rollup-*` shows no darwin/linux pkgs |
| FIX-3 | Update build scripts: `cross-env ROLLUP_NO_NATIVE=true ROLLUP_WASM=true` for client build | Vite build passes locally & CI |
| FIX-4 | Delete `package-lock.json` & `node_modules`, run `npm install --legacy-peer-deps --no-optional` to regenerate clean lockfile | Lockfile contains wasm-node only |
| FIX-5 | Replace all `--workspace` calls with `--prefix` in root scripts | Heroku build no longer errors on "No workspaces found" |
| FIX-6 | Add `.slugignore` (already exists) – expand patterns to cut slug to <300 MB | Heroku slug ≤ 300 MB |
| VERIFY | `npm run build` && `npm start` locally; then push to Heroku and confirm green build + live site | `curl /api/health` returns 200 on dyno |

### Project Status Board - LOCAL DEV (PRIORITY 1)
- [x] DEV-PORT: Configure server for port 3005
- [x] DEV-SENTRY-1: Install @sentry/utils and @sentry-internal/tracing  
- [ ] DEV-SENTRY-2: Install @sentry/integrations
- [x] DEV-NPMRC: Add .npmrc with optional=false
- [x] DEV-LOCKFILE: Regenerate lockfile with --no-optional
- [ ] DEV-ROLLUP: Manually remove native binaries from lockfile
- [ ] DEV-TEST: Verify both client and server start successfully
- [ ] DEV-E2E: Test login and basic API functionality

### Project Status Board - DEPLOY (PRIORITY 2)  
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
- [x] DEP-MONGO Update Heroku MONGODB_URI (Lp_heroku user)

### Executor's Next Steps (IMMEDIATE ACTIONS NEEDED)
1. **Install @sentry/integrations**: `cd dialer-app && npm install @sentry/integrations`
2. **Manually edit package-lock.json**: Remove all `@rollup/rollup-darwin-*` and `@rollup/rollup-linux-*` entries
3. **Test server startup**: Verify server starts on port 3005 without errors
4. **Test client startup**: Verify Vite starts without Rollup native binary errors  
5. **End-to-end test**: Verify login page loads and API calls work

### Critical Decision Point
**Should we proceed with local dev fixes first (recommended) or focus on production deploy?**

**Recommendation**: Fix local development environment first because:
- Cannot properly test Heroku fixes without working local environment
- Easier to debug issues locally than on Heroku
- Faster iteration cycle for testing solutions
- Essential for ongoing development work

Once local environment is stable, we can confidently apply the same fixes to production deployment.

### Executor's Feedback or Assistance Requests
**CURRENT STATUS**: Local development environment has multiple blocking issues preventing testing. Server fails on missing Sentry dependencies, client fails on Rollup native binary issues. Port configuration has been aligned (both using 3005) but services cannot start to test.

**NEXT REQUIRED ACTION**: Need to install @sentry/integrations and manually edit package-lock.json to remove native Rollup binaries before we can proceed with testing.

**BLOCKER**: The standard npm approaches to removing optional dependencies are not working. May need manual lockfile editing or alternative Rollup configuration approach.

---
### Lessons (append)
• Heroku still downloads Mac binary if it exists in lock-file; always regenerate lock after changing optional deps.
• **NEW**: Sentry dependencies are tightly coupled - when cleaning deps, must ensure all Sentry packages are compatible
• **NEW**: Rollup native binary issues persist across multiple npm workarounds - may require manual lockfile editing
• **NEW**: Port mismatches between client/server configs cause connection failures in dev environment

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
- [x] DEP-MONGO Update Heroku MONGODB_URI
- [ ] CLEAN-ROLLUP (mac) remove @rollup/rollup-darwin-arm64 from all deps & lock
- [ ] CLEAN-SCRIPTS ensure no postinstall/prepare scripts (they re-appeared)
- [ ] BUILD-LOCK regenerate lockfile & deploy once above done

### Executor Notes / Guidance
1. Complete tasks **one at a time** — commit & push after each BUILD step, run `heroku logs` to verify.  
2. For TD-tasks, use TDD — add Jest tests under `dialer-app/server/__tests__/textdripToken.test.ts`.  
3. Hashing token is optional for MVP because Textdrip tokens are revocable; store plaintext but mark TODO for encryption.  
4. Keep PR granularity small to ease rollback.

### Executor's Feedback or Assistance Requests
• Removed *linux* native Rollup binary; mac binary still referenced in lockfile so local dev errors persist. Need new CLEAN-ROLLUP (mac). Also Heroku still runs `postinstall`/`prepare`; need CLEAN-SCRIPTS repeat.

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

### DEP-MONGO — HOW TO CREATE AND SET THE NEW MONGODB_URI (copy to send user)
1. Log in to MongoDB Atlas → your Cluster.
2. Security → Database Access → "Add Database User"
   • Username: **heroku_app**
   • Password: **<StrongPassword>** (copy it!)
   • Role: Built-in Role → **Read and write to any database** (or limit to crokodial DB).
3. Security → Network Access → IP Access List → "Add IP Address" → **0.0.0.0/0** (Allow Anywhere) while we test.
4. Atlas left nav → Database → Connect → "Drivers" → Copy the **Standard SRV** connection string. It looks like:
   ```
   mongodb+srv://heroku_app:<PASSWORD>@cluster0.xxxxx.mongodb.net/crokodial?retryWrites=true&w=majority
   ```
   Replace `<PASSWORD>` with the password you just set.
5. In a terminal (from repo root):
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://heroku_app:<PASSWORD>@cluster0.xxxxx.mongodb.net/crokodial?retryWrites=true&w=majority" --app crokodial
   ```
6. Heroku restarts automatically. Wait ~30 seconds then check:
   ```bash
   curl https://crokodial-2a1145cec713.herokuapp.com/api/health
   ```
   Expect `{ "status": "ok" … }` (HTTP 200).

### Post-Launch Change Workflow (added 1 Jul 2025)
Goal: keep production live while allowing ongoing feature work and hot-fixes.

1. Git branching strategy
   • `main` (or `production`) – always deployable; Heroku auto-deploys from this branch.
   • `dev` – daily work; merged to `main` via PR when stable.
   • Hot-fix branches off `main` for urgent bug fixes; merge & deploy quickly.

2. Environments
   • **Heroku production app**: `crokodial-2a1145cec713` – bound to crokodial.com.
   • **Heroku staging app** (to create): identical config but on free/eco dyno; auto-deploys from `dev` branch for QA.

3. CI pipeline
   • Use Heroku Git auto-deploy + pipelines: staging promotion → production.
   • Optionally add GitHub Actions for tests/lint before push.

4. Secrets management
   • Config vars duplicated to staging (with non-live creds where possible).

5. Rollback
   • Heroku keeps last 5 slugs; `heroku releases:rollback v###`.

Tasks
| ID | Task | Success Criteria |
|----|------|------------------|
| LAUNCH-1 | Create Heroku Pipeline, add existing prod app, create staging app | Pipeline shows both apps; staging builds from `dev` |
| LAUNCH-2 | Update repo: default branch `dev`; protect `main` | GitHub protected branch rules active |
| LAUNCH-3 | Enable auto-deploy on both apps | New commit to `dev` → staging build; merge to main → prod release |
| LAUNCH-4 | Document hot-fix procedure in README | Team can follow checklist |

### Project Status Board (additions)
- [ ] LAUNCH-1 create Heroku pipeline & staging app
- [ ] LAUNCH-2 set branch protections / default `dev`
- [ ] LAUNCH-3 enable auto-deploy flow
- [ ] LAUNCH-4 write contribution guide

• Attempted CLEAN-ROLLUP mac: added .npmrc optional=false, regenerated lockfile, and changed build script to ROLLUP_WASM. Heroku build still fails requiring linux native, so rollup loader ignores env var; need alternative: remove @rollup/rollup-* packages from lockfile entirely or add stub. Seeking better approach.

---
### Status Report – 7 Jul 2025
**Main production goal:** Heroku build must be deterministic, free of dev-only hooks, and Rollup must compile using either the Linux native binary _or_ the WASM shim, with no platform-specific addons that break the build. Once green we can point DNS and call the launch complete.

Current blockers / obstacles
+0. **Version mismatch** – `package-lock.json` references `@rollup/wasm-node@^4.45.1` but the registry only publishes up to **4.44.1** → `ETARGET` aborts install on Heroku.
  
1. **Dev hooks keep resurrecting** – `postinstall`, `prepare`, `heroku-postbuild` are still present in _root_ `package.json`, causing:  
   • missing `scripts/fixNativeBinaries.mjs`  
   • pointless Husky install (no git repo on dyno)  
   • double-build via `heroku-postbuild` (runs `npm --workspace …` which fails).
2. **Rollup native addon resolution**  
   • Lockfile still contains `@rollup/rollup-darwin-*` despite overrides; Heroku sees them → `EBADPLATFORM`.  
   • When `optional=false` removes them, Rollup then requires `@rollup/rollup-linux-x64-gnu` but **npm does not install optional deps on Heroku** unless present in _dependencies_.  
   • Attempted overrides (`false`) + explicit optional dep + `ROLLUP_NO_NATIVE=true ROLLUP_WASM=true`; build now fails on _wasm-node@4.45.1 not found_ because that version isn't published.
3. **Workspace flag** – build script still uses `npm --workspace dialer-app/server` which errors (No workspaces found) since server isn't defined in workspaces array.
4. **Slug size** – currently 380 MB (soft-limit warning). Lower priority once build is stable.

Attempts so far
• Removed mac native Rollup packages locally; added .npmrc optional=false; regenerated lockfile.  
• Added Linux native Rollup as `optionalDependencies` and overrides map for mac pkgs.  
• Added .slugignore to drop bulky static assets.  
• Changed client build flags to `ROLLUP_NO_NATIVE / ROLLUP_WASM`.  
Outcome: build still alternates between (a) `EBADPLATFORM` on mac binary, (b) `MODULE_NOT_FOUND` on linux binary, or (c) `ETARGET` for non-existent wasm-node 4.45.1.

Key insight
• Rollup >= 4.45 moves the native / wasm resolution logic to respect `ROLLUP_WASM` **and** stops bundling platform specific addons. The published `4.45.1` packages exist for **core Rollup**, but **wasm-node** only published up to 4.44.1. Therefore the cleanest path is:  
  1. **Pin `rollup` to 4.45.1** (core)  
  2. Remove _all_ native addon packages from lockfile  
  3. Rely solely on WASM shim (`@rollup/wasm-node@4.44.1`) which _is_ published and works cross-platform.  
  4. Ensure `ROLLUP_NO_NATIVE=true ROLLUP_WASM=true`

## Project Status Board
- [x] Audit and document all current console errors on crokodial.com (COMPLETED)
- [x] Replicate errors on local dev server (COMPLETED)
- [x] Fix console errors (local) (COMPLETED)
- [x] Fix console errors (production) (COMPLETED)
  - [x] Investigate Production Build Process (COMPLETED)
  - [x] Check Heroku Build Configuration (COMPLETED)
  - [x] Fix Production Asset Serving (COMPLETED)
  - [x] Verify Production Site Functionality (COMPLETED)
- [x] Verify local editing and hot reload works (COMPLETED)
- [x] Test deployment pipeline (local → production) (COMPLETED)
- [x] Document lessons and fixes (COMPLETED)

### Final Results
- **Production Site:** ✅ All static assets loading correctly (200 OK)
- **Local Development:** ✅ Fully functional with MongoDB Atlas
- **Deployment Pipeline:** ✅ Working correctly with client build integration
- **Console Errors:** ✅ Resolved - no more 500 errors for CSS/JS assets

### Lessons Learned
- **Issue:** Heroku deployment was only building server, not client assets
- **Root Cause:** Server `postbuild` script only echoed message, didn't build client
- **Solution:** Updated `dialer-app/server/package.json` postbuild script to include client build
- **Fix:** `"cd ../client && npm run build && echo 'Build completed successfully'"`
- **Result:** Production site now serves all static assets correctly

## Executor's Feedback or Assistance Requests
- **Mission accomplished:** All production console errors resolved
- **Local development:** Fully functional and ready for continued development
- **Deployment:** Working correctly with automated client build process
- **Status:** ✅ crokodial.com is now fully operational

## 🚀 CRITICAL: Production Site Down - Emergency Fix Plan — 27 Jun 2025

### Current Status: PRODUCTION CRASHED
- **crokodial.com** is showing "Application Error" page
- Heroku dyno crashes with: `Error: Cannot find module '/app/dist/index.js'`
- Local development environment has multiple issues:
  - Frontend can't connect to backend (ECONNREFUSED errors)
  - Backend has missing Sentry dependency (`@sentry/utils`)
  - MongoDB connection issues locally

### Root Cause Analysis
1. **Build Output Mismatch**: 
   - TypeScript builds to `dist/server/src/index.js` 
   - But start script expects `dist/index.js`
   - This was partially fixed but not deployed correctly

2. **Local Development Environment Broken**:
   - Missing `@sentry/utils` dependency
   - MongoDB connection issues
   - Frontend-backend communication broken

3. **Deployment Pipeline Issues**:
   - Build process not generating correct output structure
   - Start script path mismatch between local and production

### CRITICAL FIX PRIORITY (Emergency Mode)

#### Phase 1: IMMEDIATE PRODUCTION FIX (30 minutes)
| ID | Task | Success Criteria |
|----|------|------------------|
| EMERG-1 | Fix start script path in server package.json | `"start": "node dist/server/src/index.js"` |
| EMERG-2 | Test build locally: `npm run build` in server directory | `dist/server/src/index.js` exists |
| EMERG-3 | Commit and push to Heroku | Heroku build succeeds, dyno starts |
| EMERG-4 | Verify production site loads | `curl https://crokodial.com` returns 200 |

#### Phase 2: LOCAL DEVELOPMENT FIX (1 hour)
| ID | Task | Success Criteria |
|----|------|------------------|
| DEV-1 | Install missing Sentry dependency | `npm install @sentry/utils` |
| DEV-2 | Fix MongoDB connection (use Atlas cloud DB) | Backend starts without connection errors |
| DEV-3 | Test full local development workflow | Frontend connects to backend, no ECONNREFUSED |
| DEV-4 | Verify all API endpoints work locally | Login, dashboard, leads API all functional |

#### Phase 3: PRODUCTION VERIFICATION (30 minutes)
| ID | Task | Success Criteria |
|----|------|------------------|
| PROD-1 | Manual QA on production site | Login, dashboard, core features work |
| PROD-2 | Check browser console for errors | No 500 errors for static assets |
| PROD-3 | Test API endpoints on production | All endpoints return 200 responses |
| PROD-4 | Monitor Heroku logs for stability | No crashes, clean startup |

### Project Status Board
- [ ] EMERG-1 Fix start script path
- [ ] EMERG-2 Test build locally  
- [ ] EMERG-3 Deploy to Heroku
- [ ] EMERG-4 Verify production site
- [ ] DEV-1 Install Sentry dependency
- [ ] DEV-2 Fix MongoDB connection
- [ ] DEV-3 Test local development
- [ ] DEV-4 Verify API endpoints
- [ ] PROD-1 Manual QA
- [ ] PROD-2 Check browser console
- [ ] PROD-3 Test API endpoints
- [ ] PROD-4 Monitor logs

### Executor's Next Step
**START WITH EMERG-1**: Fix the start script path in `dialer-app/server/package.json` to point to the correct build output location.

### Background and Motivation
The production site crokodial.com is currently down due to a critical deployment issue. The server build process generates files in `dist/server/src/index.js` but the start script expects `dist/index.js`. This mismatch causes the Heroku dyno to crash immediately on startup.

Additionally, the local development environment has multiple dependency and connection issues that need to be resolved to ensure ongoing development can continue smoothly.

The priority is to get production back online immediately, then fix the local development environment.

### Key Challenges and Analysis
1. **Build Output Structure**: The TypeScript configuration outputs files to `dist/server/src/` but the deployment expects them in `dist/`. This is a configuration mismatch that needs to be resolved.

2. **Dependency Management**: Missing `@sentry/utils` dependency is causing local development to fail. This needs to be added to the package.json.

3. **Database Connectivity**: Local MongoDB connection issues need to be resolved by using the cloud Atlas database instead of local MongoDB.

4. **Frontend-Backend Communication**: The frontend is trying to connect to the backend but getting ECONNREFUSED errors, indicating the backend isn't running or isn't accessible.

### Lessons
- Always verify build output structure matches start script expectations
- Test deployment locally before pushing to production
- Keep local and production environments in sync
- Monitor Heroku logs immediately after deployment to catch startup issues

### REPLACEMENT – Proper Production Redeploy Plan (27 Jun 2025 12:00 PM)
The previous "Rescue" wording suggested a temporary hack. The user prefers a clean, maintainable fix. This section supersedes the "Production-First Rescue Plan".

#### Goals
1. **Production site up & stable** – crokodial.com must serve both static assets and API without errors.  
2. **Deterministic Heroku build** – no manual edits to lockfile, no dev-only hooks, no platform-specific Rollup binaries.  
3. **Keep local dev parity** – the same `npm run build && npm start` commands should work locally and on Heroku.

#### Technical Strategy
• **Single source of truth**: let Heroku compile both server & client during slug build – no committed build artefacts.  
• **Rollup ≥ 4.45**: upgrade `rollup` & `@rollup/wasm-node` to latest **4.44.1** (wasm) while removing all native addon packages. Rollup ≥ 4.45 respects `ROLLUP_WASM=true` and no longer bundles platform addons.  
• **No optional dependencies**: enforce via `.npmrc` (`optional=false`).  
• **Clean scripts**: root `package.json` should _only_ build once – no `postinstall`, `prepare`, or `heroku-postbuild`.  
• **Correct start path**: server start script must point to `node dialer-app/server/dist/server/src/index.js` (TypeScript build output path used in Heroku slug build).

#### Task Breakdown (Production Redeploy)
| Step | Task | Owner | Success Criteria |
|------|------|-------|------------------|
| P-1 | **Clean root `package.json`** – remove `postinstall`, `prepare`, `heroku-postbuild`; add `<build>:server` & `<build>:client` scripts; update `start` script | Exec | `git diff` shows no dev hooks; CI passes |
| P-2 | **Upgrade Rollup** – in `dialer-app/client/package.json` set `"rollup": "^4.45.0"`, `"@rollup/wasm-node": "^4.44.1"`; delete any `@rollup/rollup-*` deps | Exec | `npm ls | grep rollup` shows only core & wasm-node |
| P-3 | **Regenerate lockfile** – `rm -rf node_modules package-lock.json && npm i --legacy-peer-deps --no-optional` | Exec | lockfile builds without errors |
| P-4 | **Add missing Sentry deps** (`@sentry/utils`, `@sentry/integrations`, `@sentry-internal/tracing`) to **dialer-app/server/package.json** | Exec | Server boots locally; no MODULE_NOT_FOUND |
| P-5 | **Local verification** – `npm run build` then `npm start`; run `curl localhost:3005/api/health` = 200; run `npm run start:client` = Vite boots | Exec | Both services running locally |
| P-6 | **Heroku deploy** – push branch, observe build; slug build must finish with Rollup WASM only; dyno starts | Exec | `heroku logs --tail` shows "Server listening on $PORT" |
| P-7 | **Smoke test prod** – open crokodial.com, login, run a few API actions | Exec / User | No 500s, static assets load, testers confirm |

#### Rollback/Contingency
If Rollup native binary error resurfaces:
1. Verify `.npmrc optional=false` is present.  
2. Ensure `package-lock.json` contains **no** `@rollup/rollup-darwin-*` or `linux-*`.  
3. As last resort, pin Rollup to `4.44.1` & rely solely on `@rollup/wasm-node`.

#### Updated Production Status Board
- [ ] P-1 Clean scripts
- [ ] P-2 Upgrade Rollup & wasm-node
- [ ] P-3 Regenerate lockfile
- [ ] P-4 Add Sentry deps to server package.json
- [ ] P-5 Local verification
- [ ] P-6 Deploy to Heroku
- [ ] P-7 Smoke-test crokodial.com

_Local dev fixes (Mongo, Vite proxy, etc.) remain in secondary board._

#### Executor – please begin with **P-1** and report back after local `npm run build` completes without errors.

## 🎯 **COMPREHENSIVE PRODUCTION DEPLOYMENT ANALYSIS - BIRDS EYE VIEW**

### **CURRENT STATE ASSESSMENT (27 Jun 2025 2:30 PM)**

#### **✅ WHAT'S WORKING LOCALLY**
- Server runs successfully on port 3005 with MongoDB Atlas connection
- Client runs successfully on port 5173 with Vite dev server
- Authentication system working (login successful in logs)
- API endpoints responding (leads, dispositions, auth)
- WebSocket connections established
- All core functionality operational

#### **❌ CRITICAL PRODUCTION BLOCKERS**

**1. SENTRY DEPENDENCY CHAIN BREAK (BLOCKING)**
- **Root Cause**: Version mismatch between root and server Sentry packages
- **Impact**: Server cannot start in production due to missing `@sentry/integrations`
- **Chain**: Root has `@sentry/node@^9.24.0` → Server has `@sentry/node@^7.120.3` → Version conflict breaks peer dependencies

**2. ROLLUP NATIVE BINARY CONFLICT (BLOCKING)**
- **Root Cause**: npm optional dependency bug with `@rollup/rollup-darwin-arm64`
- **Impact**: Client build fails on Heroku (Linux) due to Mac-specific binaries
- **Chain**: Rollup tries to load native binaries → fails on different platform → build crashes

**3. BUILD OUTPUT MISMATCH (BLOCKING)**
- **Root Cause**: Server TypeScript not compiled to JavaScript for production
- **Impact**: `npm start` fails because `dist/index.js` doesn't exist
- **Chain**: Development uses `ts-node-dev` → Production needs compiled JS → Missing build step

**4. HEROKU DEPLOYMENT CONFIGURATION (BLOCKING)**
- **Root Cause**: Missing or incorrect Heroku build/start scripts
- **Impact**: Heroku cannot start the application
- **Chain**: No proper build process → No start script → Dyno crashes

### **FLAWLESS IMPLEMENTATION PATH**

#### **PHASE 1: DEPENDENCY RESOLUTION (CRITICAL)**
1. **Unify Sentry Versions**
   - Remove Sentry from root package.json
   - Keep only server-level Sentry dependencies
   - Ensure all peer dependencies are installed in server workspace

2. **Fix Rollup Native Binary Issue**
   - Pin Rollup to version that doesn't require native binaries
   - Add `.npmrc` with `optional=false` to prevent optional deps
   - Force WASM-only mode for Vite

#### **PHASE 2: BUILD SYSTEM FIXES (CRITICAL)**
3. **Add Server Build Process**
   - Add TypeScript compilation step to server package.json
   - Ensure `dist/` directory is generated before deployment
   - Update start script to use compiled JavaScript

4. **Add Client Build Process**
   - Ensure client builds to static files for production
   - Configure Vite for production build
   - Add build verification steps

#### **PHASE 3: HEROKU DEPLOYMENT (CRITICAL)**
5. **Configure Heroku Build Process**
   - Add `heroku-postbuild` script to build both client and server
   - Ensure proper start script points to compiled server
   - Configure environment variables for production

6. **Test Production Deployment**
   - Deploy to Heroku
   - Verify all endpoints respond
   - Confirm authentication works
   - Test full user workflow

### **INTERRELATED VARIABLES ANALYSIS**

#### **DEPENDENCY RESOLUTION CHAIN**
```
Root package.json Sentry v9 → Server package.json Sentry v7 → Peer deps missing → Server crash
```

#### **BUILD OUTPUT CHAIN**
```
TypeScript source → No compilation step → Missing dist/ → npm start fails → Heroku crash
```

#### **PLATFORM COMPATIBILITY CHAIN**
```
Mac Rollup binaries → Heroku Linux environment → Native binary missing → Build fails
```

#### **ENVIRONMENT CONFIGURATION CHAIN**
```
Local .env.local → Heroku config vars → Missing production settings → Runtime errors
```

### **SUCCESS CRITERIA**
1. **Heroku build completes without errors**
2. **Server starts and responds to health check**
3. **Client serves static assets correctly**
4. **Authentication system works in production**
5. **All API endpoints respond properly**
6. **crokodial.com loads and allows login**

### **RISK MITIGATION**
- Test each phase locally before deploying
- Use Heroku logs to verify each step
- Have rollback plan ready
- Monitor application health after deployment

This analysis provides a clear, step-by-step path to production deployment with all interrelated issues identified and solutions mapped out.