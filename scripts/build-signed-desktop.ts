import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.cwd();

function required(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function hasApiKeyNotaryCredentials() {
  return Boolean(required("APPLE_API_KEY") && required("APPLE_API_ISSUER") && required("APPLE_API_KEY_PATH"));
}

function hasAppleIdNotaryCredentials() {
  return Boolean(required("APPLE_ID") && required("APPLE_PASSWORD") && required("APPLE_TEAM_ID"));
}

function tauriBin() {
  const bin = process.platform === "win32" ? "tauri.cmd" : "tauri";
  return join(root, "node_modules", ".bin", bin);
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

if (process.platform !== "darwin") {
  throw new Error("Signed desktop release builds are currently configured for macOS only.");
}

const signingIdentity =
  required("KINGS_PRESS_SIGNING_IDENTITY") ||
  required("APPLE_SIGNING_IDENTITY") ||
  required("MACOS_SIGNING_IDENTITY");
const hasImportableCertificate = Boolean(required("APPLE_CERTIFICATE") && required("APPLE_CERTIFICATE_PASSWORD"));

if (!signingIdentity && !hasImportableCertificate) {
  throw new Error(
    [
      "Missing Developer ID signing credentials.",
      "Set KINGS_PRESS_SIGNING_IDENTITY, APPLE_SIGNING_IDENTITY, or MACOS_SIGNING_IDENTITY",
      "to a Developer ID Application certificate in the login keychain, or provide",
      "APPLE_CERTIFICATE plus APPLE_CERTIFICATE_PASSWORD for CI certificate import.",
    ].join(" ")
  );
}

if (!hasApiKeyNotaryCredentials() && !hasAppleIdNotaryCredentials()) {
  throw new Error(
    [
      "Missing Apple notarization credentials.",
      "Set APPLE_API_KEY, APPLE_API_ISSUER, and APPLE_API_KEY_PATH, or set",
      "APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID.",
    ].join(" ")
  );
}

const providerShortName =
  required("KINGS_PRESS_PROVIDER_SHORT_NAME") ||
  required("APPLE_PROVIDER_SHORT_NAME") ||
  required("APPLE_TEAM_ID");
const tempDir = join(tmpdir(), `kings-press-signed-${Date.now()}`);
const configPath = join(tempDir, "tauri.signed.conf.json");

await mkdir(tempDir, { recursive: true });
try {
  const macOS: Record<string, unknown> = {
    signingIdentity: signingIdentity ?? null,
    hardenedRuntime: true,
  };
  if (providerShortName) macOS.providerShortName = providerShortName;

  await writeFile(
    configPath,
    JSON.stringify(
      {
        build: {
          beforeBundleCommand: "./node_modules/.bin/tsx scripts/sign-sidecar-native.ts",
        },
        bundle: {
          macOS,
        },
      },
      null,
      2
    )
  );

  console.log("Building Developer ID signed Jack Script desktop release...");
  await run(tauriBin(), ["build", "--ci", "--config", configPath]);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
