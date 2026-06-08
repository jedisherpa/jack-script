import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const appPath = join(root, "src-tauri", "target", "release", "bundle", "macos", "Jack Script.app");
const dmgDir = join(root, "src-tauri", "target", "release", "bundle", "dmg");
const arch = process.arch === "arm64" ? "aarch64" : process.arch;
const dmgPath = join(dmgDir, `Jack Script_0.1.0_${arch}.dmg`);

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

if (process.platform !== "darwin") {
  throw new Error("DMG packaging is only available on macOS.");
}

const signingIdentity =
  required("KINGS_PRESS_SIGNING_IDENTITY") ||
  required("APPLE_SIGNING_IDENTITY") ||
  required("MACOS_SIGNING_IDENTITY");

const stagingDir = await mkdtemp(join(tmpdir(), "jack-script-dmg-"));
try {
  await mkdir(dmgDir, { recursive: true });
  await run("cp", ["-R", appPath, stagingDir], "copy app into DMG staging");
  await symlink("/Applications", join(stagingDir, "Applications"));
  await run(
    "hdiutil",
    ["create", "-volname", "Jack Script", "-srcfolder", stagingDir, "-ov", "-format", "UDZO", dmgPath],
    "create compressed DMG"
  );

  if (signingIdentity) {
    await run("codesign", ["--force", "--timestamp", "--sign", signingIdentity, dmgPath], "sign DMG");
    await run("codesign", ["--verify", "--verbose=2", dmgPath], "verify DMG signature");
  } else {
    console.warn("No Developer ID identity provided; DMG was created unsigned.");
    console.warn("Set APPLE_SIGNING_IDENTITY, MACOS_SIGNING_IDENTITY, or KINGS_PRESS_SIGNING_IDENTITY to sign it.");
  }

  console.log(`DMG ready: ${dmgPath}`);
} finally {
  await rm(stagingDir, { recursive: true, force: true });
}
