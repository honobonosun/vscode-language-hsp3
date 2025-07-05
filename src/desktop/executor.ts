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
  toolset: ToolsetInstance
) => {
  const terminalManager = new TerminalManager(logger);
  const log = logger.section("executor");

  const executeRun = (options: ExecutorOptions): string | undefined => {
    const { filePath, overrideArgs } = options;

    // toolsetから実行パラメータを取得
    const executionParams = toolset.getExecutionParams(
      "run",
      filePath,
      overrideArgs
    );
    if (!executionParams) {
      log.error("Failed to get execution parameters for run");
      return undefined;
    }

    log.debug(
      `Executing run command: ${executionParams.command} ${executionParams.args.join(" ")}`
    );

    // TerminalManagerで実行
    const terminalOptions: TerminalOptions = {
      mode: executionParams.mode,
      cwd: executionParams.cwd,
      env: executionParams.env,
      name: `HSP3 Run - ${executionParams.name}`,
      waitForKeyPress: executionParams.waitForKeyPress,
    };

    if (executionParams.mode === "direct") {
      terminalOptions.shellPath = executionParams.command;
      terminalOptions.shellArgs = executionParams.args;
    } else {
      terminalOptions.shellPath = executionParams.shellPath;
      terminalOptions.shellArgs = executionParams.shellArgs;
      // 引数にスペースが含まれる場合はクォートする
      const quotedArgs = executionParams.args.map((arg) =>
        arg.includes(" ") ? `"${arg}"` : arg
      );
      terminalOptions.commands = [
        `${executionParams.command} ${quotedArgs.join(" ")}`,
      ];
    }

    try {
      const terminalId = terminalManager.createTerminal(terminalOptions);
      log.info(`Run command executed successfully. Terminal ID: ${terminalId}`);
      return terminalId;
    } catch (error) {
      log.error(`Failed to execute run command: ${error}`);
      return undefined;
    }
  };

  const executeMake = (options: ExecutorOptions): string | undefined => {
    const { filePath, overrideArgs } = options;

    // toolsetから実行パラメータを取得
    const executionParams = toolset.getExecutionParams(
      "make",
      filePath,
      overrideArgs
    );
    if (!executionParams) {
      log.error("Failed to get execution parameters for make");
      return undefined;
    }

    log.debug(
      `Executing make command: ${executionParams.command} ${executionParams.args.join(" ")}`
    );

    // TerminalManagerで実行
    const terminalOptions: TerminalOptions = {
      mode: executionParams.mode,
      cwd: executionParams.cwd,
      env: executionParams.env,
      name: `HSP3 Make - ${executionParams.name}`,
      waitForKeyPress: executionParams.waitForKeyPress,
    };

    if (executionParams.mode === "direct") {
      terminalOptions.shellPath = executionParams.command;
      terminalOptions.shellArgs = executionParams.args;
    } else {
      terminalOptions.shellPath = executionParams.shellPath;
      terminalOptions.shellArgs = executionParams.shellArgs;
      // 引数にスペースが含まれる場合はクォートする
      const quotedArgs = executionParams.args.map((arg) =>
        arg.includes(" ") ? `"${arg}"` : arg
      );
      terminalOptions.commands = [
        `${executionParams.command} ${quotedArgs.join(" ")}`,
      ];
    }

    try {
      const terminalId = terminalManager.createTerminal(terminalOptions);
      log.info(
        `Make command executed successfully. Terminal ID: ${terminalId}`
      );
      return terminalId;
    } catch (error) {
      log.error(`Failed to execute make command: ${error}`);
      return undefined;
    }
  };

  return {
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
