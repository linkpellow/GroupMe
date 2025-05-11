import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Create logs directory
fs.mkdirSync("logs", { recursive: true });
const log = fs.createWriteStream(`logs/server-${new Date().toISOString().slice(0,10)}.log`, { flags:"a" });

console.log("Starting server with live logging...");
console.log(`Log file: logs/server-${new Date().toISOString().slice(0,10)}.log`);

// Change directory to the server directory
process.chdir(path.join(process.cwd(), 'dialer-app', 'server'));

// Start the server with npm run dev
const proc = spawn("npm", ["run", "dev"], { shell:true, stdio:["ignore","pipe","pipe"] });

// Pipe stdout and stderr to both the console and the log file
proc.stdout.pipe(process.stdout);
proc.stdout.pipe(log);
proc.stderr.pipe(process.stderr);
proc.stderr.pipe(log);

// Handle process exit
proc.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
}); 