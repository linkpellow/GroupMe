## Cross-Platform Lockfile Management

### Important: Lockfile Compatibility

This project deploys to Linux environments (Heroku) but is often developed on macOS/Windows. This can cause deployment failures due to missing platform-specific dependencies in the lockfile.

#### Automatic Solution (GitHub Actions)

A GitHub Actions workflow automatically ensures the lockfile includes all platform dependencies when:
- Any `package.json` file is modified in a PR
- Manually triggered via the Actions tab

#### Manual Solution (Docker)

If you need to regenerate the lockfile locally after adding/updating dependencies:

```bash
./scripts/fix-lockfile-for-linux.sh
```

This script uses Docker to regenerate the lockfile in a Linux environment, ensuring all platform-specific dependencies are included.

#### Prevention

1. **Always run the lockfile fix script after major dependency updates**
2. **Never skip the lockfile in commits** - both `package.json` and `package-lock.json` must be committed together
3. **If Heroku deployment fails with module errors**, the lockfile likely needs regeneration 