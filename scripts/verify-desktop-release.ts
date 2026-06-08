import { lstat, mkdtemp, readdir, readlink, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const appPath = join(root, "src-tauri", "target", "release", "bundle", "macos", "Jack Script.app");
const dmgPath = join(root, "src-tauri", "target", "release", "bundle", "dmg", "Jack Script_0.1.0_aarch64.dmg");
const bundledServer = join(appPath, "Contents", "Resources", "resources", "desktop-server", "server.js");
const bundledNode = join(appPath, "Contents", "Resources", "resources", "node", "bin", process.platform === "win32" ? "node.exe" : "node");
const bundledServerRoot = join(appPath, "Contents", "Resources", "resources", "desktop-server");
const requireDeveloperId =
  process.argv.includes("--require-developer-id") ||
  process.env.JACK_SCRIPT_REQUIRE_DEVELOPER_ID === "true" ||
  process.env.KINGS_PRESS_REQUIRE_DEVELOPER_ID === "true";
const requireNotarized =
  process.argv.includes("--require-notarized") ||
  process.env.JACK_SCRIPT_REQUIRE_NOTARIZED === "true" ||
  process.env.KINGS_PRESS_REQUIRE_NOTARIZED === "true";

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function assertExists(path: string, label: string) {
  if (!(await exists(path))) throw new Error(`Missing ${label}: ${path}`);
  console.log(`ok ${label}`);
}

async function run(command: string, args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "pipe" });
    let out = "";
    child.stdout.on("data", (data) => { out += data; });
    child.stderr.on("data", (data) => { out += data; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`ok ${label}`);
        resolve();
      } else {
        reject(new Error(`${label} failed with exit ${code}\n${out}`));
      }
    });
  });
}

async function runCapture(command: string, args: string[], label: string) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "pipe" });
    let out = "";
    child.stdout.on("data", (data) => { out += data; });
    child.stderr.on("data", (data) => { out += data; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${label} failed with exit ${code}\n${out}`));
    });
  });
}

async function findEnvFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findEnvFiles(path)));
    else if (entry.name === ".env" || entry.name.startsWith(".env.")) out.push(path);
  }
  return out;
}

async function assertPlistValue(plistPath: string, key: string, expected: string) {
  const raw = await runCapture("plutil", ["-extract", key, "raw", "-o", "-", plistPath], `Info.plist ${key}`);
  const actual = raw.trim();
  if (actual !== expected) {
    throw new Error(`Expected ${key}=${expected}, got ${actual}`);
  }
}

async function verifyAppBundleMetadata(bundlePath: string) {
  const plist = join(bundlePath, "Contents", "Info.plist");
  await assertExists(plist, "app Info.plist");
  await Promise.all([
    assertPlistValue(plist, "CFBundleDisplayName", "Jack Script"),
    assertPlistValue(plist, "CFBundleName", "Jack Script"),
    assertPlistValue(plist, "CFBundleIdentifier", "com.jackscript.desktop"),
    assertPlistValue(plist, "CFBundleShortVersionString", "0.1.0"),
  ]);
  console.log("ok app bundle metadata");
}

async function verifyDmgPayload() {
  const mountDir = await mkdtemp(join(tmpdir(), "jack-script-dmg-mount-"));
  let attached = false;
  try {
    await run("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mountDir, dmgPath], "DMG mount");
    attached = true;
    const mountedApp = join(mountDir, "Jack Script.app");
    const applicationsLink = join(mountDir, "Applications");
    await assertExists(mountedApp, "DMG app payload");

    const linkStat = await lstat(applicationsLink);
    if (!linkStat.isSymbolicLink()) {
      throw new Error(`Expected DMG Applications shortcut to be a symlink: ${applicationsLink}`);
    }
    const linkTarget = await readlink(applicationsLink);
    if (linkTarget !== "/Applications") {
      throw new Error(`Expected DMG Applications shortcut to target /Applications, got ${linkTarget}`);
    }
    console.log("ok DMG Applications shortcut");
    await verifyAppBundleMetadata(mountedApp);
  } finally {
    if (attached) {
      await run("hdiutil", ["detach", mountDir], "DMG detach");
    }
    await rm(mountDir, { recursive: true, force: true });
  }
}

async function verifyDeveloperIdSignature() {
  const details = await runCapture("codesign", ["-dv", "--verbose=4", appPath], "codesign details");
  if (/Signature=adhoc/.test(details)) {
    throw new Error("Expected a Developer ID signature, but the app is ad-hoc signed.");
  }
  if (/TeamIdentifier=not set/.test(details)) {
    throw new Error("Expected a Developer ID TeamIdentifier, but none is set.");
  }
  if (!/Authority=Developer ID Application/.test(details)) {
    throw new Error(`Expected Developer ID Application authority in codesign details.\n${details}`);
  }
  console.log("ok Developer ID signature");
}

async function verifyNotarization() {
  await run("xcrun", ["stapler", "validate", appPath], "app notarization ticket");
  await run("spctl", ["-a", "-vv", "-t", "install", dmgPath], "Gatekeeper DMG assessment");
}

async function waitForReady(port: number) {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Packaged server did not become ready on ${url}`);
}

async function smokePackagedServer() {
  const dataDir = await mkdtemp(join(tmpdir(), "jack-script-release-smoke-"));
  const port = 3219;
  const child = spawn(bundledNode, [bundledServer], {
    cwd: bundledServerRoot,
    stdio: "pipe",
    env: {
      HOME: dataDir,
      PATH: process.env.PATH ?? "",
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
      JACK_SCRIPT_LOCAL_FIRST: "true",
      KINGS_PRESS_LOCAL_FIRST: "true",
      DATA_BACKEND: "sqlite",
      STORAGE_PROVIDER: "local",
      KINGS_PRESS_STORAGE: "local",
      JACK_SCRIPT_DATA_DIR: dataDir,
      KINGS_PRESS_DATA_DIR: dataDir,
      JACK_SCRIPT_DB_PATH: join(dataDir, "jack-script.sqlite3"),
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      LLM_PROVIDER: "ollama",
      LLM_BASE_URL: "http://127.0.0.1:11434",
      LLM_MODEL: "llama3.2",
      ANTHROPIC_API_KEY: "",
    },
  });

  try {
    await waitForReady(port);
    const [status, campaigns, schedules] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/llm/status`).then((r) => r.json()),
      fetch(`http://127.0.0.1:${port}/api/campaigns`).then((r) => r.json()),
      fetch(`http://127.0.0.1:${port}/api/gather/schedules/run-due`, { method: "POST" }).then((r) => r.json()),
    ]);
    if (status.provider !== "ollama") throw new Error(`Unexpected LLM provider: ${JSON.stringify(status)}`);
    if (!Array.isArray(campaigns.campaigns) || campaigns.campaigns.length === 0) {
      throw new Error(`Expected seeded campaigns, got ${JSON.stringify(campaigns)}`);
    }
    if (typeof schedules.ran !== "number") throw new Error(`Unexpected scheduler response: ${JSON.stringify(schedules)}`);
    console.log("ok packaged server smoke");
  } finally {
    child.kill();
    await rm(dataDir, { recursive: true, force: true });
  }
}

await assertExists(appPath, "macOS app bundle");
await assertExists(bundledServer, "packaged Next server");
await assertExists(bundledNode, "bundled Node runtime");
await verifyAppBundleMetadata(appPath);

const envFiles = await findEnvFiles(bundledServerRoot);
if (envFiles.length) throw new Error(`Bundled server contains env files:\n${envFiles.join("\n")}`);
console.log("ok no bundled env files");

if (process.platform === "darwin") {
  await run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath], "codesign verification");
  if (requireDeveloperId) await verifyDeveloperIdSignature();
  if (await exists(dmgPath)) {
    await run("hdiutil", ["imageinfo", dmgPath], "DMG imageinfo");
    await verifyDmgPayload();
    if (requireNotarized) await verifyNotarization();
  } else if (requireNotarized) {
    await run("xcrun", ["stapler", "validate", appPath], "app notarization ticket");
  }
}

await smokePackagedServer();
console.log("Desktop release verification passed.");
