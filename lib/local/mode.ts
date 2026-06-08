export function isLocalFirstMode(): boolean {
  return (
    process.env.KINGS_PRESS_LOCAL_FIRST === "true" ||
    process.env.JACK_SCRIPT_LOCAL_FIRST === "true" ||
    process.env.DATA_BACKEND === "sqlite" ||
    Boolean(process.env.JACK_SCRIPT_DB_PATH) ||
    Boolean(process.env.KINGS_PRESS_DB_PATH)
  );
}
