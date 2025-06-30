"use strict";

import * as vscode from "vscode";
import createConfig from "../common/config";
import { createLanguageConfigurationManager } from "../common/langCfg";
import { EXTENSION_ID, LANGUAGE_ID, OUTPUT_NAME } from "../common/constant";
import createLogger from "../common/log";
import { terminalManager } from "./terminal";
import createExecutor from "./executor";
import createHelpman from "./helpman";
import i18n from "../common/i18n";
import createToolset from "./toolset";
import createExtensionManager from "../common/extmgr";

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const debugMode = context.extensionMode === vscode.ExtensionMode.Development;
  const config = createConfig(EXTENSION_ID);

  await i18n.init(vscode.env.language, {
    debug: debugMode,
  });
  const logger = createLogger(OUTPUT_NAME, {
    consoleDubbing: debugMode,
  });
  if (debugMode) logger.info(i18n.t("activation"));

  const executor = createExecutor();
  const helpman = createHelpman(config);
  const extmgr = createExtensionManager(logger);
  const toolset = await createToolset(context, logger, config, extmgr);
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
      (editor) => {}
    ),
    vscode.commands.registerTextEditorCommand(
      "language-hsp3.make",
      (editor) => {}
    ),
    vscode.commands.registerTextEditorCommand(
      "language-hsp3.RunWithArgs",
      (editor) => {}
    )
  );

  // 一行コメント記号の設定変更に追従する。
  const langConfigManager = createLanguageConfigurationManager(
    LANGUAGE_ID,
    EXTENSION_ID
  );
  langConfigManager.updateConfiguration();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_ID))
        langConfigManager.updateConfiguration();
    }),
    langConfigManager
  );
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  console.log("language-hsp3 deactivate.");
}

const createTask = () => {};
