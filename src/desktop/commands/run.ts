import * as vscode from "vscode";
import path from "path";
import type { ExecutorInstance } from "../executor";
import type { ToolsetInstance } from "../toolset";
import { LoggerInstance } from "../../common/logger";

export function createRunCommand(
  executor: ExecutorInstance,
  toolset: ToolsetInstance,
  logger: LoggerInstance
): (editor: vscode.TextEditor) => void {
  return async (editor) => {
    logger.info("run command executed");
    vscode.window.showInformationMessage(
      "HSP3 Run command executed successfully!"
    );
  };
}
