# Deployment Guide

## Heroku App Mapping

| Environment | Heroku App | Git Remote |
|-------------|------------|------------|
| Production  | `crokodial` (serves crokodial.com) | `heroku-prod` |
| Staging     | `crokodial-api-staging` | `heroku-staging` |

## One-line Deployment Commands

```
# Deploy current branch to staging
make deploy-staging

# Deploy current branch to production (will ask for confirmation)
make deploy-prod
```

The commands simply push the current Git branch to the `main` branch on the respective Heroku remote.

## Verification Checklist (always run after deploy)
1. `heroku releases -n 1 --app <app>` shows a new release built from the expected commit hash.
2. `curl -s https://crokodial.com/index.html | grep -o "assets/index-[a-f0-9]*\.js"` returns the latest bundle hash.
3. Hard-refresh crokodial.com; confirm UI changes are visible.
4. For backend-only changes, hit an affected API endpoint and verify the response.

## Troubleshooting
• If the site doesn’t change, make sure Cloudflare/browser cache is cleared (Cmd+Shift+R).  
• Use `heroku logs --tail --app <app>` to inspect runtime errors. 