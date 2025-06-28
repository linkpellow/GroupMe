import dotenvSafe from 'dotenv-safe';
import path from 'path';
import fs from 'fs';

// This file is loaded first to ensure all environment variables
// are available before any other module tries to access them.

// ------------------- Helper: resolve .env.local path -------------------
/**
 * Attempt to locate the .env.local file regardless of whether the code is
 * running from `src/` (ts-node-dev) or from the transpiled `dist/` output.
 * We try a short list of deterministic paths and return the first one that
 * exists on disk.
 */
function locateEnvLocal(): string | undefined {
  // 1) When executed via ts-node-dev, __dirname => dialer-app/server/src/config
  //    -> ../../.env.local  => dialer-app/server/.env.local (desired)
  const candidateFromSrc = path.resolve(__dirname, '../../.env.local');

  // 2) When executed from the compiled JS, __dirname => dialer-app/server/dist/server/src/config
  //    -> ../../../.env.local => dialer-app/server/.env.local (desired)
  const candidateFromDist = path.resolve(__dirname, '../../../.env.local');

  // 3) Fallback: look relative to the process cwd (repo root) – works for
  //    "node dist/..." if cwd is the project root.
  const candidateFromCwd = path.resolve(process.cwd(), 'dialer-app/server/.env.local');

  const candidates = [candidateFromSrc, candidateFromDist, candidateFromCwd];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined; // Not found – caller will handle
}

const envPath = locateEnvLocal();
const examplePath = path.resolve(__dirname, '../../.env.example');

// Use dotenv-safe to load and validate environment variables
if (envPath && fs.existsSync(examplePath)) {
  dotenvSafe.config({ path: envPath, example: examplePath });
} else if (envPath) {
  dotenvSafe.config({ path: envPath });
} else if (fs.existsSync(examplePath)) {
  dotenvSafe.config({ example: examplePath });
} else {
  dotenvSafe.config();
}

// ----------------------------------------------------------------------
// If an existing environment variable has a weak JWT_SECRET (e.g. inherited
// from the shell), but the .env.local contains a strong one, prefer the strong
// secret to avoid fallback behaviour.
//-----------------------------------------------------------------------
if (envPath && fs.existsSync(envPath)) {
  try {
    const parsedLocal = dotenvSafe.parse(fs.readFileSync(envPath));
    const localSecret = parsedLocal.JWT_SECRET;
    if (localSecret && localSecret.length >= 32) {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        // Only override if the in-memory secret is missing or weak.
        process.env.JWT_SECRET = localSecret;
        console.warn('[ENV LOADER] Overrode weak JWT_SECRET with secure value from .env.local');
      } else if (process.env.JWT_SECRET !== localSecret) {
        // A different strong secret was injected via the shell or another env file.
        // This causes token signature mismatches across restarts. Abort with a clear message.
        console.error('\n\x1b[31m[FATAL ERROR] JWT_SECRET mismatch detected.\x1b[0m');
        console.error(
          'The JWT_SECRET provided via the environment does not match the value in .env.local.'
        );
        console.error('To avoid authentication issues, use the same secret everywhere.');
        console.error(`→ .env.local JWT_SECRET length: ${localSecret.length} chars`);
        console.error(`→ process.env JWT_SECRET length: ${process.env.JWT_SECRET.length} chars`);
        console.error(
          '\nResolve by removing inline JWT_SECRET assignments and relying solely on .env.local'
        );
        process.exit(1);
      }
    }
  } catch {
    // ignore parse errors – dotenvSafe already handled absence
  }
}

// ------------------- SECURITY HARDENING: JWT SECRET CHECK -------------------
// This is a critical security check. The server must not start with a weak
// or default JWT_SECRET. The '.env.local' file should define a secret of at
// least 32 characters.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('\n\n\x1b[31m[FATAL ERROR] INSECURE JWT_SECRET DETECTED.\x1b[0m');
  console.error(
    '\x1b[33mThe JWT_SECRET environment variable is missing, or is less than 32 characters long.\x1b[0m'
  );
  console.error('For security, the server will not start.');
  console.error(
    'Please ensure the ".env.local" file in the "dialer-app/server" directory contains a line like this:'
  );
  console.error(
    '\n  \x1b[32mJWT_SECRET=your_super_secret_random_string_of_at_least_32_characters\x1b[0m\n'
  );
  process.exit(1);
}
// --------------------------------------------------------------------------
