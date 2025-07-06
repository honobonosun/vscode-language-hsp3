import * as vscode from "vscode";
import { ConfigInstance } from "../common/config";
import { LoggerInstance } from "../common/logger";
import { ToolsetInstance } from "./toolset";
import { TerminalManager, TerminalOptions } from "./terminal/TerminalManager";

export interface ExecutorOptions {
  filePath: string;
  overrideArgs?: string[];
}

const createExecutor = (
  config: ConfigInstance,
  logger: LoggerInstance,
  toolset: ToolsetInstance,
  context?: vscode.ExtensionContext
) => {
  const terminalManager = new TerminalManager(logger, config, context);
  const log = logger.section("executor");

  const execute = async (
    category: "run" | "make" | "help",
    options: ExecutorOptions
  ): Promise<string | undefined> => {
    const { filePath, overrideArgs } = options;

    // toolsetから実行パラメータを取得
    const executionParams = toolset.getExecutionParams(
      category,
      filePath,
      overrideArgs
    );
    if (!executionParams) {
      log.error(`Failed to get execution parameters for ${category}`);
      return undefined;
    }

    log.debug(
      `Executing ${category} commands: ${executionParams.commands.length} commands`
    );

    // TerminalManagerで実行
    const terminalOptions: TerminalOptions = {
      mode: executionParams.mode,
      cwd: executionParams.cwd,
      env: executionParams.env,
      name: `HSP3 ${category.charAt(0).toUpperCase() + category.slice(1)} - ${executionParams.name}`,
      waitForKeyPress: executionParams.waitForKeyPress,
      preserveFocus: config.get<boolean>("terminal.preserveFocus", false),
    };

    if (executionParams.mode === "direct") {
      // 直接実行モード（最初のコマンドのみ）
      const firstCommand = executionParams.commands[0];
      if (!firstCommand) {
        log.error("No commands to execute");
        return undefined;
      }
      terminalOptions.shellPath = firstCommand.command;
      terminalOptions.shellArgs = firstCommand.args;

      if (executionParams.commands.length > 1) {
        log.warn(
          "Direct mode supports only single command. Multiple commands will be ignored."
        );
      }
    } else {
      // シェル実行モード（複数コマンド対応）
      terminalOptions.shellPath = executionParams.shellPath;
      terminalOptions.shellArgs = executionParams.shellArgs;

      // 各コマンドを順次実行するためのコマンド配列を構築
      const commands: string[] = [];
      for (const cmd of executionParams.commands) {
        // 引数にスペースが含まれる場合はクォートする
        const quotedArgs = cmd.args.map((arg) =>
          arg.includes(" ") ? `"${arg}"` : arg
        );
        commands.push(`${cmd.command} ${quotedArgs.join(" ")}`);
      }
      terminalOptions.commands = commands;
    }

    try {
      const terminalId = await terminalManager.createTerminal(terminalOptions);
      log.info(
        `${category} command executed successfully. Terminal ID: ${terminalId}`
      );
      return terminalId;
    } catch (error) {
      log.error(`Failed to execute ${category} command: ${error}`);
      return undefined;
    }
  };

  // 後方互換性のためのラッパー関数
  const executeRun = async (
    options: ExecutorOptions
  ): Promise<string | undefined> => {
    return execute("run", options);
  };

  const executeMake = async (
    options: ExecutorOptions
  ): Promise<string | undefined> => {
    return execute("make", options);
  };

  return {
    execute,
    executeRun,
    executeMake,
    terminalManager,
    dispose: () => {
      log.debug("Disposing executor and all terminals");
      terminalManager.disposeAll();
    },
  };
};

export default createExecutor;
export type ExecutorInstance = ReturnType<typeof createExecutor>;
