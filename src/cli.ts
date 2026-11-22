#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { cleanup } from "./db/cleanup.js";
import { migrate } from "./db/migrate.js";
import { seed } from "./db/seed.js";

export interface CliIo {
  env: Record<string, string | undefined>;
  readStdin: () => Promise<string>;
  out: (line: string) => void;
  err: (line: string) => void;
}

const USAGE = `Usage: curriculum-api <command>

Commands:
  migrate         apply database migrations (needs DATABASE_URL)
  seed            create the profile row with default prompts (needs DATABASE_URL)
  hash-password   read a password from stdin and print its bcrypt hash
  cleanup         delete public_usage and admin_login_attempts rows older than 30 days (needs DATABASE_URL)`;

const BCRYPT_COST = 12;

/** Runs one command and returns the process exit code. */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const [command] = argv;

  const databaseUrl = () => {
    const url = io.env.DATABASE_URL;
    if (!url) io.err("DATABASE_URL is required");
    return url;
  };

  switch (command) {
    case "migrate": {
      const url = databaseUrl();
      if (!url) return 1;
      await migrate(url);
      io.out("migrations applied");
      return 0;
    }
    case "seed": {
      const url = databaseUrl();
      if (!url) return 1;
      io.out(`profile ${await seed(url)}`);
      return 0;
    }
    case "hash-password": {
      const password = (await io.readStdin()).replace(/\r?\n$/, "");
      if (!password) {
        io.err("password is required on stdin");
        return 1;
      }
      io.out(await bcrypt.hash(password, BCRYPT_COST));
      return 0;
    }
    case "cleanup": {
      const url = databaseUrl();
      if (!url) return 1;
      const counts = await cleanup(url);
      io.out(`public_usage: ${counts.publicUsage}`);
      io.out(`admin_login_attempts: ${counts.loginAttempts}`);
      return 0;
    }
    default:
      io.err(USAGE);
      return 1;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  runCli(process.argv.slice(2), {
    env: process.env,
    readStdin,
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  }).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
