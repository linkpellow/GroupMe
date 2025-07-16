"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_safe_1 = __importDefault(require("dotenv-safe"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
console.log('[ENV LOADER] Source file:', __filename);
// This file is loaded first to ensure all environment variables
// are available before any other module tries to access them.
// ------------------- Helper: resolve .env.local path -------------------
/**
 * Attempt to locate the .env.local file regardless of whether the code is
 * running from `src/` (ts-node-dev) or from the transpiled `dist/` output.
 * We try a short list of deterministic paths and return the first one that
 * exists on disk.
 */
function locateEnvLocal() {
    // Candidate paths, tried in order, to support both dev (ts-node) and prod (dist) execution
    const candidateFiles = [
        path_1.default.resolve(__dirname, '../../.env.local'), // From src/config to server/
        path_1.default.resolve(__dirname, '../../../../.env.local'), // From dist/server/src/config to server/
    ];
    for (const file of candidateFiles) {
        if (fs_1.default.existsSync(file)) {
            console.log(`[ENV LOADER] Found .env.local at: ${file}`);
            return file;
        }
    }
    console.log('[ENV LOADER] .env.local not found in candidate paths:', candidateFiles);
    return undefined;
}
// ------------------- Load env vars with dotenv-safe -------------------
const envLocalPath = locateEnvLocal();
if (envLocalPath) {
    // Use dotenv.parse to read the file
    const parsedLocal = dotenv_1.default.parse(fs_1.default.readFileSync(envLocalPath));
    // Set process.env for any keys not already set
    for (const [key, value] of Object.entries(parsedLocal)) {
        if (!process.env[key])
            process.env[key] = value;
    }
}
dotenv_safe_1.default.config({
    allowEmptyValues: false,
    example: path_1.default.resolve(__dirname, '../../.env.example'),
});
// ----------------------------------------------------------------------
// If an existing environment variable has a weak JWT_SECRET (e.g. inherited
// from the shell), but the .env.local contains a strong one, prefer the strong
// secret to avoid fallback behaviour.
//-----------------------------------------------------------------------
if (envLocalPath && fs_1.default.existsSync(envLocalPath)) {
    try {
        const parsedLocal = dotenv_1.default.parse(fs_1.default.readFileSync(envLocalPath));
        const localSecret = parsedLocal.JWT_SECRET;
        if (localSecret && localSecret.length >= 32) {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
                // Only override if the in-memory secret is missing or weak.
                process.env.JWT_SECRET = localSecret;
                console.warn('[ENV LOADER] Overrode weak JWT_SECRET with secure value from .env.local');
            }
            else if (process.env.JWT_SECRET !== localSecret) {
                // A different strong secret was injected via the shell or another env file.
                // This causes token signature mismatches across restarts. Abort with a clear message.
                console.error('\n\x1b[31m[FATAL ERROR] JWT_SECRET mismatch detected.\x1b[0m');
                console.error('The JWT_SECRET provided via the environment does not match the value in .env.local.');
                console.error('To avoid authentication issues, use the same secret everywhere.');
                console.error(`→ .env.local JWT_SECRET length: ${localSecret.length} chars`);
                console.error(`→ process.env JWT_SECRET length: ${process.env.JWT_SECRET.length} chars`);
                console.error('\nResolve by removing inline JWT_SECRET assignments and relying solely on .env.local');
                process.exit(1);
            }
        }
    }
    catch {
        // ignore parse errors – dotenvSafe already handled absence
    }
}
// ------------------- SECURITY HARDENING: JWT SECRET CHECK -------------------
// This is a critical security check. The server must not start with a weak
// or default JWT_SECRET. The '.env.local' file should define a secret of at
// least 32 characters.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('\n\n\x1b[31m[FATAL ERROR] INSECURE JWT_SECRET DETECTED.\x1b[0m');
    console.error('\x1b[33mThe JWT_SECRET environment variable is missing, or is less than 32 characters long.\x1b[0m');
    console.error('For security, the server will not start.');
    console.error('Please ensure the ".env.local" file in the "dialer-app/server" directory contains a line like this:');
    console.error('\n  \x1b[32mJWT_SECRET=your_super_secret_random_string_of_at_least_32_characters\x1b[0m\n');
    process.exit(1);
}
// --------------------------------------------------------------------------
// ------------------- SECURITY HARDENING: MONGODB_URI CHECK -------------------
if (!process.env.MONGODB_URI) {
    console.error('\n\x1b[31m[FATAL ERROR] MONGODB_URI missing.\x1b[0m');
    process.exit(1);
}
const mongoUri = process.env.MONGODB_URI;
// Basic sanity: must start with mongodb:// or mongodb+srv://
if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    console.error('\n\x1b[31m[FATAL ERROR] MONGODB_URI must start with mongodb:// or mongodb+srv://\x1b[0m');
    console.error('Value:', mongoUri);
    process.exit(1);
}
// --------------------------------------------------------------------------
