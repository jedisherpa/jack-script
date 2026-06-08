import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const arch = process.arch === "arm64" ? "aarch64" : process.arch;
const dmgPath = join(root, "src-tauri", "target", "release", "bundle", "dmg", `Jack Script_0.1.0_${arch}.dmg`);

function required(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function run(command: string, args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit ${code}`));
    });
  });
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "darwin") {
  throw new Error("DMG notarization is only available on macOS.");
}

if (!(await exists(dmgPath))) {
  throw new Error(`Missing DMG. Run npm run desktop:package-dmg first.\nExpected: ${dmgPath}`);
}

const apiKey = required("APPLE_API_KEY");
const apiIssuer = required("APPLE_API_ISSUER");
const apiKeyPath = required("APPLE_API_KEY_PATH");
const appleId = required("APPLE_ID");
const applePassword = required("APPLE_PASSWORD");
const appleTeamId = required("APPLE_TEAM_ID");

let credentials: string[];
if (apiKey && apiIssuer && apiKeyPath) {
  credentials = ["--key", apiKeyPath, "--key-id", apiKey, "--issuer", apiIssuer];
} else if (appleId && applePassword && appleTeamId) {
  credentials = ["--apple-id", appleId, "--password", applePassword, "--team-id", appleTeamId];
} else {
  throw new Error(
    [
      "Missing Apple notarization credentials.",
      "Set APPLE_API_KEY, APPLE_API_ISSUER, and APPLE_API_KEY_PATH, or set",
      "APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID.",
    ].join(" ")
  );
}

await run("xcrun", ["notarytool", "submit", dmgPath, "--wait", ...credentials], "submit DMG for notarization");
await run("xcrun", ["stapler", "staple", dmgPath], "staple DMG notarization ticket");
await run("xcrun", ["stapler", "validate", dmgPath], "validate DMG notarization ticket");
await run(
  "spctl",
  ["--assess", "--type", "open", "--context", "context:primary-signature", "--verbose=4", dmgPath],
  "Gatekeeper DMG assessment"
);

console.log(`Notarized DMG ready: ${dmgPath}`);
