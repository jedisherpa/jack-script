import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const APP_DIR_NAME = "Jack Script";
const LEGACY_APP_DIR = "King's Press Editorial Desk";

export function localDataDir(): string {
  const explicit =
    process.env.JACK_SCRIPT_DATA_DIR ||
    process.env.KINGS_PRESS_DATA_DIR ||
    process.env.LOCAL_DATA_DIR;
  if (explicit) return explicit;

  if (process.platform === "darwin") {
    const modern = join(homedir(), "Library", "Application Support", APP_DIR_NAME);
    const legacy = join(homedir(), "Library", "Application Support", LEGACY_APP_DIR);
    return existsSync(legacy) && !existsSync(modern) ? legacy : modern;
  }
  if (process.platform === "win32") {
    return join(process.env.APPDATA || homedir(), APP_DIR_NAME);
  }
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "jack-script");
}

export function localDatabasePath(): string {
  return (
    process.env.JACK_SCRIPT_DB_PATH ||
    process.env.KINGS_PRESS_DB_PATH ||
    process.env.LOCAL_DATABASE_PATH ||
    join(localDataDir(), "jack-script.sqlite3")
  );
}

export function localStorageDir(): string {
  return process.env.JACK_SCRIPT_STORAGE_DIR || process.env.KINGS_PRESS_STORAGE_DIR || join(localDataDir(), "storage");
}
