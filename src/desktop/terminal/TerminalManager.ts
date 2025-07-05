import * as vscode from "vscode";
import type { LoggerInstance } from "../../common/logger";

export interface TerminalOptions {
  mode: "direct" | "shell";
  command?: string;
  args?: string[];
  shellPath?: string;
  shellArgs?: string[];
  commands?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export class TerminalManager {
  private terminal: vscode.Terminal;
  private logger: LoggerInstance;

  constructor(logger: LoggerInstance, options: TerminalOptions) {
    this.logger = logger;
    this.terminal = this.createTerminal(options);
    this.terminal.show();
  }

  private createTerminal(options: TerminalOptions): vscode.Terminal {
    const { mode, cwd, env } = options;

    if (mode === "direct") {
      const { command, args = [] } = options;
      if (!command) {
        throw new Error("Command is required for direct mode");
      }

      return vscode.window.createTerminal({
        name: "HSP3",
        cwd,
        env,
        shellPath: command,
        shellArgs: args,
      });
    } else {
      const { shellPath, shellArgs, commands = [] } = options;
      
      const terminal = vscode.window.createTerminal({
        name: "HSP3",
        cwd,
        env,
        shellPath,
        shellArgs,
      });

      // コマンドを順次実行
      commands.forEach(command => {
        terminal.sendText(command, true);
      });

      return terminal;
    }
  }

  public sendText(text: string, addNewLine: boolean = true): void {
    this.terminal.sendText(text, addNewLine);
  }

  public dispose(): void {
    this.terminal.dispose();
  }
}