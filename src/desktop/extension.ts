"use strict";

import * as vscode from "vscode";
import createConfig from "../common/config";
import { createLanguageConfigurationManager } from "../common/langCfg";
import { EXTENSION_ID, LANGUAGE_ID, OUTPUT_NAME } from "../common/constant";
import createLogger from "../common/logger";
import createExecutor from "./executor";
import createHelpman from "./helpman";
import i18n from "../common/i18n";
import createToolset from "./toolset";
import createExtensionManager from "../common/extmgr";

import { createRunCommand } from "./commands/run";
import { createMakeCommand } from "./commands/make";
import { createRunWithArgsCommand } from "./commands/runWithArgs";

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const config = createConfig(EXTENSION_ID);
  const isDevMode = context.extensionMode === vscode.ExtensionMode.Development;
  const userDebugMode = config.get<boolean>("debugMode", false);
  const debugMode = isDevMode || userDebugMode;

  await i18n.init(vscode.env.language, {
    debug: debugMode,
  });
  const logger = createLogger(OUTPUT_NAME, {
    debugMode: debugMode,
  });
  if (debugMode) logger.info(i18n.t("activation"));

  // 設定変更監視: debugMode
  config.addListener((e) => {
    if (e.affectsConfiguration(`${EXTENSION_ID}.debugMode`)) {
      const newDebug = config.get<boolean>("debugMode", false);
      logger.setDebugMode(newDebug);
      logger.info(`Debug mode ${newDebug ? "enabled" : "disabled"}`);
    }
  });

  const helpman = createHelpman(config);
  const extmgr = createExtensionManager(logger);
  const toolset = await createToolset(context, logger, config, extmgr);
  const executor = createExecutor(config, logger, toolset);
  context.subscriptions.push(
    logger,
    config,
    executor,
    helpman,
    toolset,
    extmgr
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "language-hsp3.run",
      createRunCommand(executor, toolset, logger)
    )
    // 一時的にコメントアウト
    // vscode.commands.registerTextEditorCommand(
    //   "language-hsp3.make",
    //   createMakeCommand(executor, toolset)
    // ),
    // vscode.commands.registerTextEditorCommand(
    //   "language-hsp3.RunWithArgs",
    //   createRunWithArgsCommand(executor, toolset)
    // ),
    // vscode.commands.registerCommand(
    //   "language-hsp3.changeOfExecutor",
    //   async () => {
    //     await toolset.showSelect();
    //   }
    // )
  );

  // 一行コメント記号の設定変更に追従する。
  const langConfigManager = createLanguageConfigurationManager(
    LANGUAGE_ID,
    EXTENSION_ID
  );
  langConfigManager.updateConfiguration();
  const langConfigListenerId = config.addListener((e) => {
    if (e.affectsConfiguration(`${EXTENSION_ID}.line-comment`)) {
      langConfigManager.updateConfiguration();
    }
  });
  context.subscriptions.push(
    langConfigManager,
    new vscode.Disposable(() => config.removeListener(langConfigListenerId))
  );
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  console.log("language-hsp3 deactivate.");
}

const createTask = () => {};
