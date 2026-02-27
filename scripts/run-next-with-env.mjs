import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const unwrapped = value.slice(1, -1);
    if (value.startsWith('"')) {
      return unwrapped
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return unwrapped;
  }
  return value;
}

function parseEnvFile(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = normalized.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }
    parsed[key] = unquote(value);
  }

  return parsed;
}

const [, , envFile, ...nextArgs] = process.argv;

if (!envFile) {
  console.error("Missing env file path. Usage: node scripts/run-next-with-env.mjs <env-file> <next-args...>");
  process.exit(1);
}

if (nextArgs.length === 0) {
  console.error("Missing Next.js CLI args. Example: node scripts/run-next-with-env.mjs .env.dev dev");
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.error(`Env file not found: ${envPath}`);
  process.exit(1);
}

const fileContent = readFileSync(envPath, "utf8");
const envValues = parseEnvFile(fileContent);

for (const [key, value] of Object.entries(envValues)) {
  process.env[key] = value;
}

const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
