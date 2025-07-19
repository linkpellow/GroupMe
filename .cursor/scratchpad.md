# Background and Motivation

We are stabilizing the `dialer-app/client` React/TypeScript app with reliable test infrastructure, addressing dependency and context errors, and ensuring secure, successful Heroku deploys. The project recently encountered:
- Test failures due to missing React Context providers and ESM/CJS compatibility issues.
- Critical/high `npm audit` vulnerabilities, especially in transitive dependencies (e.g., lodash via react-quill).
- Heroku deploy failures due to lockfile/package.json mismatches and Node.js engine semver warnings.
- **CRITICAL**: Persistent Heroku build failures with missing Linux platform dependencies despite lockfile regeneration

# Key Challenges and Analysis

## Current Critical Issue: Heroku Build Still Failing

### Root Cause Analysis
1. **NPM_CONFIG_IGNORE_PLATFORM=true** - Heroku sets this environment variable which causes npm to skip platform-specific optional dependencies
2. **Nested Dependency Issue** - The error occurs in `vite/node_modules/rollup`, suggesting the issue is with Vite's bundled Rollup, not our direct dependency
3. **Cache Invalidation** - Heroku reported "Cached directories were not restored due to a change in version", meaning it's doing a clean install
4. **Lockfile Not Respected** - Despite having Linux dependencies in our lockfile, npm is ignoring them due to the platform flag

### Evidence
```
remote: NPM_CONFIG_IGNORE_PLATFORM=true
remote: Error: Cannot find module @rollup/rollup-linux-x64-gnu
remote: /tmp/build_5e47e602/dialer-app/client/node_modules/vite/node_modules/rollup/dist/native.js
```

## Previous Issues (Resolved)
- **React Context in Tests:** Fixed by creating test-utils.tsx with all providers
- **ESM/CJS Jest Issues:** Fixed with proper Jest configuration
- **Security Vulnerabilities:** Critical ones fixed (react-quill, vite updates)
- **Lockfile Sync:** Regenerated using Docker with Linux platform

# High-level Task Breakdown - REVISED

## Phase 1: Immediate Heroku Fix
1. **Override NPM Platform Behavior**
   - Add `.npmrc` file to force platform-specific dependencies
   - Configure Heroku build environment correctly
   - *Success*: npm installs Linux dependencies on Heroku

2. **Alternative: Use Heroku Buildpack Config**
   - Set Heroku config vars to override npm behavior
   - Test with `heroku config:set NPM_CONFIG_IGNORE_PLATFORM=false`
   - *Success*: Build completes without module errors

3. **Fallback: Pre-build Client Locally**
   - Build client dist locally and commit it
   - Modify build process to skip client build on Heroku
   - *Success*: Heroku uses pre-built assets

## Phase 2: Long-term Solution
4. **Upgrade Build Infrastructure**
   - Consider using official Heroku Node.js buildpack features
   - Evaluate moving to container-based deployment
   - Document the solution for team
   - *Success*: Reliable, repeatable deployments

5. **Add CI/CD Pipeline**
   - GitHub Actions to build and test before deploy
   - Automated deployment to Heroku
   - *Success*: Catches platform issues before production

# Project Status Board

- [x] Fix React Context provider usage in tests
- [x] Audit and align major package versions for ESM/CJS compatibility
- [x] Fix/update vulnerable dependencies
- [x] Reconcile and commit lockfile and package.json
- [x] Fix Node.js version in package.json
- [x] Fix cross-platform lockfile compatibility
- [ ] **Override Heroku NPM platform behavior**
- [ ] Deploy to Heroku Production
- [ ] Verify deployment

# Current Status / Progress Tracking

1. Tests are passing with proper React Context providers
2. ESM/CJS compatibility issues resolved
3. Critical vulnerabilities fixed (react-quill updated, vite updated)
4. Node.js engine version fixed to "18.x"
5. **NEW: Cross-platform lockfile issue identified** - Heroku's NPM_CONFIG_IGNORE_PLATFORM=true is preventing Linux dependencies from installing
6. Created scripts and documentation for lockfile management
7. **BLOCKED**: Deployment failing due to Heroku npm configuration

# Executor's Feedback or Assistance Requests

### Critical Issue Identified ⚠️

The lockfile regeneration was successful but Heroku's build environment is configured to ignore platform-specific dependencies. This is why our Linux-specific rollup dependencies aren't being installed despite being in the lockfile.

### Recommended Professional Approach:

1. **Immediate Fix** - Add `.npmrc` file to override Heroku's platform behavior
2. **Test Locally** - Simulate Heroku environment with `NPM_CONFIG_IGNORE_PLATFORM=true npm ci`
3. **Deploy Fix** - Push changes and monitor build
4. **Document** - Update deployment docs with this edge case

### Alternative Solutions Ready:
- Pre-build strategy if npm config doesn't work
- Container deployment for full control
- Custom buildpack configuration

# Lessons

- Always wrap tested components with required context providers in tests.
- ESM/CJS issues are often caused by wrong file extensions or incompatible dependency versions; always check docs for Jest and plugins.
- Fixing vulnerabilities in transitive dependencies may require updating or replacing upstream packages (e.g., replace `react-quill` if not maintained).
- Heroku uses `npm ci` and will fail if lockfile and package.json are not in sync.
- Node.js engine version in package.json for Heroku should use a fixed major version (e.g., "18.x"), not a semver range.
- The production app is `crokodial` (not `crokodial-api`), accessed via `heroku-prod` remote
- When testing complex components with many dependencies, start with simple smoke tests to verify basic rendering before testing specific functionality
- Some moderate vulnerabilities in dev dependencies can be acceptable if fixing them requires major breaking changes
- Always run `npm ci` before deployment to verify lockfile synchronization
- **Heroku NPM Platform Config**: Heroku sets `NPM_CONFIG_IGNORE_PLATFORM=true` by default, which prevents installation of platform-specific optional dependencies
- **Lockfile isn't enough**: Even with correct platform dependencies in lockfile, npm configuration can override and skip them
- **Always check build environment**: Platform differences between dev and production require checking environment variables and build configs
- **Nested dependencies matter**: Issues in `node_modules/vite/node_modules/rollup` indicate the problem is with transitive dependencies, not direct ones

---

# Planner Mode: How a Lead Professional Developer Would Solve (and Prevent) the Vite/Rollup/Heroku Lockfile Native Module Issue

## 1. Immediate Fix for the Current Blocker

- **Diagnose:** Realize this is a cross-platform npm/lockfile bug (native/optional dependencies not present in lockfile for Heroku's Linux build).
- **Action:** Rebuild the lockfile on Linux (using Docker or CI) and commit it, so Heroku can find all required native modules.
  - **Example Command:**
    ```sh
    docker run --rm -v "$PWD":/app -w /app node:18 bash -c "npm install"
    ```
  - **Next:** Commit and push the updated `package-lock.json`, then redeploy.

## 2. Future-Proofing the Workflow (Making Deploys Seamless)

### A. Automate Consistency

- **CI/CD Lockfile Linting:** Add a CI job (GitHub Actions or similar) that:
  - Runs `npm ci` on a Linux runner to ensure lockfile integrity before merges/deploys.
  - Fails the build if native modules are missing or installs fail, catching issues before they reach Heroku.
- **Optional:** Automate lockfile regeneration on Linux in CI and auto-PR the result if drift is detected.

### B. Documentation & Team Onboarding

- **README/CONTRIBUTING.md:**  
  - Document that after dependency changes, the lockfile must be rebuilt on Linux.  
  - Provide the Docker command and rationale for all devs.
- **Onboarding Checklist:**  
  - Ensure new devs and contributors know how to update dependencies in a cross-platform-safe way.

### C. Dev Tooling

- **Pre-commit Hooks (Husky):**  
  - Block commits if `package-lock.json` is out of sync with `package.json` or contains platform-specific drift.
- **Scripts:**  
  - Add `npm run lockfile:linux` to run the Docker lockfile rebuild.

### D. Dependency Hygiene

- **Regularly Audit Dependencies:**  
  - Use Dependabot/Renovate for automated PRs on dependency updates.
  - Schedule regular security and compatibility audits.
- **Pin Node and npm versions:**  
  - Use `"engines"` in `package.json` and `.nvmrc` for local/dev consistency.

### E. Environment Parity

- **Encourage or enforce local dev with the same Node/NPM major versions as production (Heroku).**
- **Document how to use nvm or Volta for version management.**

### F. Test + Build in CI

- **CI runs `npm ci`, `npm run build`, and `npm test` every PR.**
- **Catch breaking changes before they hit production.**

## 3. Summary Table

| Practice                        | What It Prevents                                 |
|----------------------------------|--------------------------------------------------|
| Linux lockfile generation        | Native module issues on Heroku/Linux             |
| CI lockfile/build/test           | Broken builds, missing modules, test failures    |
| Automated dependency updates     | Security holes, stale modules                    |
| Documented onboarding            | Team confusion, repeat mistakes                  |
| Pre-commit hooks                 | Committing broken lockfiles                      |
| Pinning node/npm                 | Environment drift, subtle prod bugs              |

## 4. Lessons and Professional Mindset

- Proactively address cross-platform differences with automation, not just docs.
- Treat lockfiles as platform-specific artifacts when native modules are involved.
- Use CI/CD as a safety net—not just for testing, but for enforcing deterministic builds.
- Automate everything repeatable (lockfile, audit, build, test, deploy).
- Communicate rationale and process changes clearly to the whole team.

## 5. Concrete Action Items

- [ ] Add a `lockfile:linux` script using Docker to the repo.
- [ ] Update documentation with dependency update best practices.
- [ ] Implement a GitHub Actions workflow for lockfile/build/test on Linux.
- [ ] Educate team about lockfile platform issues and Docker usage.
- [ ] Enforce engine versions and set up pre-commit hooks for lockfile drift.

---

# Current Status Assessment (Planner Mode)

## Q1: Will I be able to see our changes on crokodial.com now?

**Answer: NO ❌**

While we've added `.npmrc` to force platform dependencies, we haven't actually regenerated the lockfile on Linux yet. The deployment will still fail because:
1. The lockfile was generated on macOS (even with Docker earlier)
2. Heroku's build is still missing the Linux-specific modules
3. We need to regenerate lockfile WITH the new `.npmrc` settings

## Q2: Is the plan complete and future proof?

**Answer: PARTIALLY ⚠️**

### What's Complete ✅
- `.npmrc` configuration to force platform dependencies
- Docker script for Linux lockfile generation
- Basic GitHub Actions workflow
- Node version pinning with `.nvmrc`
- npm script `lockfile:linux` for easy access

### What's Missing for True Future-Proofing ❌
1. **Lockfile not yet regenerated with new .npmrc**
2. **No enforcement mechanism** - developers can still commit bad lockfiles
3. **CI/CD not checking lockfile integrity** before merge
4. **Team documentation incomplete** - no CONTRIBUTING.md updates
5. **No pre-commit hooks** to catch issues early
6. **No automated dependency updates** (Dependabot/Renovate)

## Q3: Will updates/changes be seamless going forward?

**Answer: NOT YET ⚠️**

They will only be seamless once we:
1. **Enforce lockfile generation on Linux** (automation or strict process)
2. **Add CI checks** that fail if lockfile is platform-incompatible
3. **Document the process** clearly for all team members
4. **Automate as much as possible** to remove human error

## Immediate Actions Required (Priority Order)

### 1. Fix Current Deployment (TODAY)
```bash
# Regenerate lockfile with new .npmrc settings
npm run lockfile:linux
git add package-lock.json
git commit -m "fix: Regenerate lockfile on Linux with platform dependencies"
git push origin feature/lead-fields
git push heroku-prod feature/lead-fields:main
```

### 2. Add Pre-commit Hook (TODAY)
- Install Husky
- Add hook to check lockfile changes
- Warn developers to use `npm run lockfile:linux`

### 3. Enhance CI/CD (THIS WEEK)
- Update GitHub Actions to verify lockfile on Linux
- Add build test on Linux runner
- Auto-fail if platform dependencies missing

### 4. Documentation (THIS WEEK)
- Update README.md with clear dependency update process
- Create CONTRIBUTING.md with lockfile requirements
- Add troubleshooting guide

### 5. Full Automation (NEXT SPRINT)
- Dependabot for automated updates
- CI auto-fixes lockfile drift
- Slack/email notifications for build issues

## Risk Assessment

**Current Risk Level: HIGH 🔴**
- Any developer updating dependencies will break deployment
- No safety nets in place
- Knowledge not distributed across team

**After Immediate Actions: MEDIUM 🟡**
- Deployment will work
- Basic documentation exists
- Manual process required

**After Full Implementation: LOW 🟢**
- Automated checks catch issues
- Team educated on process
- Multiple safety nets in place

## Professional Recommendation

**DO NOT consider this "done" until:**
1. Current deployment is fixed and verified
2. At minimum, pre-commit hooks are in place
3. Team documentation is updated
4. CI/CD checks are implemented

The difference between "it works now" and "it's production-ready" is the automation and safety nets that prevent future failures. 