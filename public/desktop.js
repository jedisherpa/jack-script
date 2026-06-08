/* King’s Press desktop bridge.
   In a browser this is inert. In Tauri it exposes local-first setup commands. */
(function () {
  const core = window.__TAURI__ && window.__TAURI__.core;
  const event = window.__TAURI__ && window.__TAURI__.event;

  function isDesktop() { return !!(core && typeof core.invoke === "function"); }

  async function invoke(command, args) {
    if (!isDesktop()) throw new Error("Desktop runtime is not available.");
    return core.invoke(command, args || {});
  }

  async function listen(name, handler) {
    if (!isDesktop() || !event || typeof event.listen !== "function") return function () {};
    return event.listen(name, handler);
  }

  window.KINGS_DESKTOP = {
    isDesktop,
    ollamaStatus: () => invoke("ollama_status"),
    startOllama: () => invoke("start_ollama_service"),
    listOllamaModels: () => invoke("list_ollama_models"),
    pullOllamaModel: (model) => invoke("pull_ollama_model", { model }),
    saveModelChoice: (model) => invoke("save_model_choice", { model }),
    getModelChoice: () => invoke("get_model_choice"),
    initLocalDatabase: () => invoke("init_local_database"),
    createLocalBackup: () => invoke("create_local_backup"),
    runtimeStatus: () => invoke("desktop_runtime_status"),
    onShowModelSetup: (handler) => listen("kingspress:show-model-setup", handler),
    onBackupCreated: (handler) => listen("kingspress:backup-created", handler),
  };
})();
