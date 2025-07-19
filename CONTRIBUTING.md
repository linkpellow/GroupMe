# Contributing to CroKodial CRM

## 🚨 Critical: Dependency Management

### The Golden Rule
**ALWAYS regenerate the lockfile on Linux after updating dependencies!**

This project deploys to Heroku (Linux), but is often developed on macOS/Windows. npm lockfiles are platform-specific, and missing Linux dependencies will cause deployment failures.

### How to Update Dependencies

1. **Install/update your dependency**:
   ```bash
   npm install package-name
   # or
   npm update package-name
   ```

2. **Regenerate lockfile for Linux**:
   ```bash
   npm run lockfile:linux
   ```
   This uses Docker to ensure Linux-specific dependencies are included.

3. **Commit both files**:
   ```bash
   git add package.json package-lock.json
   git commit -m "deps: Add/update package-name"
   ```

### Pre-commit Hook

We have a Husky pre-commit hook that will warn you if you're committing lockfile changes without regenerating for Linux. Always follow its advice!

### CI/CD Checks

Our GitHub Actions workflow will:
- ✅ Verify lockfile integrity on Linux
- ✅ Check for Linux platform dependencies
- ✅ Run tests and build
- ❌ Fail if lockfile is missing Linux dependencies

## Development Setup

1. **Use the correct Node version**:
   ```bash
   nvm use  # Uses version from .nvmrc (18.x)
   ```

2. **Install dependencies**:
   ```bash
   npm ci  # Clean install from lockfile
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

## Testing

- **Client tests**: `npm run test:client`
- **Server tests**: `npm run test:server`
- **All tests**: `npm test`

## Deployment

Deployments to production happen automatically when merging to `main`. The deployment will fail if:
- Lockfile is missing Linux dependencies
- Tests fail
- Build fails

To manually deploy:
```bash
git push heroku-prod main
```

## Troubleshooting

### "Cannot find module @rollup/rollup-linux-x64-gnu"

This means the lockfile is missing Linux dependencies. Fix:
```bash
npm run lockfile:linux
git add package-lock.json
git commit -m "fix: Regenerate lockfile with Linux deps"
git push
```

### Node version mismatch

Ensure you're using Node 18.x:
```bash
nvm use 18
# or
nvm install 18.20.8
nvm use 18.20.8
```

### Docker not running

The lockfile:linux script requires Docker. Install Docker Desktop from https://docker.com

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Add tests for new features
- Update documentation as needed

## Questions?

Contact the team lead or open an issue for clarification. 