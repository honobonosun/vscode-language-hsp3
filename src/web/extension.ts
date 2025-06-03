import vscode from "vscode";
import { EXTENSION_ID, LANGUAGE_ID } from "../common/constant";
import { createLanguageConfigurationManager } from "../common/langCfg";

export function activate(context: vscode.ExtensionContext): void {
  console.log("activate web-mode vscode-language-hsp3");

  const configManager = createLanguageConfigurationManager(
    LANGUAGE_ID,
    EXTENSION_ID
  );

  configManager.updateConfiguration();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_ID)) {
        configManager.updateConfiguration();
      }
    }),
    configManager
  );
}

export function deactivate(): void {
  console.log("deactivate web-mode language-hsp3");
}
