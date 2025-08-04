const { spawn } = require("child_process");
const path = require("path");

// Path to the ts-node executable
const tsNodePath = path.join(__dirname, "node_modules", ".bin", "ts-node");

// Launch the server with transpile-only flag to bypass type checking
const server = spawn(
  tsNodePath,
  ["--transpile-only", "--project", "tsconfig-bypass.json", "src/index.ts"],
  {
    stdio: "inherit",
    shell: true,
  },
);

server.on("error", (err) => {
  console.error("Failed to start server:", err);
});

process.on("SIGINT", () => {
  server.kill("SIGINT");
  process.exit(0);
});
