import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();

function required(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findNativeBinaries(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await findNativeBinaries(path));
    } else if (entry.isFile() && (entry.name.endsWith(".node") || entry.name.endsWith(".dylib"))) {
      out.push(path);
    }
  }
  return out;
}

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit ${code}`));
    });
  });
}

const identity =
  required("KINGS_PRESS_SIGNING_IDENTITY") ||
  required("APPLE_SIGNING_IDENTITY") ||
  required("MACOS_SIGNING_IDENTITY");

if (!identity) {
  throw new Error("Missing signing identity for embedded native binaries.");
}

const binaries = await findNativeBinaries(join(root, "src-tauri", "resources"));
if (!binaries.length) {
  console.log("No embedded native Node binaries found to sign.");
} else {
  console.log(`Signing ${binaries.length} embedded native Node binaries for notarization...`);
  for (const binary of binaries) {
    await run("codesign", [
      "--force",
      "--timestamp",
      "--options",
      "runtime",
      "--sign",
      identity,
      binary,
    ]);
  }
}
