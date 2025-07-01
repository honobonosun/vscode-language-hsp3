import vscode from "vscode";
import { LoggerInstance } from "./logger";
import { Result } from "./types";
import i18n from "./i18n";

const createExtensionManager = (logger: LoggerInstance) => {
  const log = logger.section("ExtensionManager");
  const loadedExtensions = new Map<string, unknown>();

  // ログ関数
  const loadingResultLog = (
    name: string,
    result?: Result<unknown, unknown>
  ) => {
    const success = result?.success;
    const msg = `Extension "${name}" activation ${success ? "succeeded" : "failed"}`;
    if (success) {
      log.info(msg);
    } else {
      log.warn(msg, { consoleDubbing: true });

      if (result && result.error instanceof Error)
        log.warn(result.error.message, { consoleDubbing: true });
      else if (result && typeof result.error === "string")
        log.error(result.error, { consoleDubbing: true });
      else {
        if (result) {
          log.error(i18n.t("log-output-failed", { extensionName: name }), {
            consoleDubbing: true,
          });
        }
      }
    }
  };

  const load = async (name: string) => {
    const extension = vscode.extensions.getExtension(name);
    if (!extension) {
      const result = {
        success: false as const,
        error: "Extension not found",
      };
      loadingResultLog(name, result);
      return false;
    }
    if (!extension.isActive) {
      const result = await extension.activate().then(
        (value) => ({ success: true as const, value }),
        (error) => ({ success: false as const, error })
      );
      if (!result.success) {
        loadingResultLog(name, result);
        return false;
      }
    }
    loadedExtensions.set(name, extension.exports);
    loadingResultLog(name, { success: true, value: null });
    return true;
  };

  // loadした拡張機能の生死を確認して、読み込みし直す。
  const subscription = vscode.extensions.onDidChange(async () => {
    log.info("Reloading extensions");
    for (const name of loadedExtensions.keys()) {
      await load(name);
    }
  });

  return {
    load,
    export: (name: string) => loadedExtensions.get(name),
    dispose: () => {
      subscription.dispose();
    },
  };
};
export type ExtMgrInstance = ReturnType<typeof createExtensionManager>;
export default createExtensionManager;
