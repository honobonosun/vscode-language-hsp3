import * as vscode from "vscode";
// processManager を通じて child_process.spawn を利用します
import { ConfigInstance } from "../common/config";
import { terminalManager } from "./terminal/TerminalManager";
import { processManager } from "./terminal/ProcessManager";

/**
 * 実行オプション
 */
export interface ExecutionParams {
  /** ターミナルに表示する名前 */
  name: string;
  /** 実行するコマンド */
  command: string;
  /** コマンド引数 */
  args: string[];
  /** 作業ディレクトリ */
  cwd?: string;
  /** 環境変数 */
  env?: NodeJS.ProcessEnv;
  /** 表示用エンコーディング */
  encoding?: string;
  /** direct or shell */
  mode?: "direct" | "shell";
  /** shell モード時のシェルパス */
  shellPath?: string;
  /** shell モード時のシェル引数 */
  shellArgs?: string[];
  /** shell モード時の事前実行コマンド */
  preCommands?: string[];
}

/**
 * Executor インスタンス
 */
export interface ExecutorInstance extends vscode.Disposable {
  /** 実行開始 */
  execute(options: ExecutionParams): void;
}

/**
 * Executor ファクトリ
 */
export function createExecutor(config: ConfigInstance): ExecutorInstance {
  const executor = {
    execute(options: ExecutionParams): void {
      // 引数と環境変数は既に置換済みなのでそのまま利用します
      const args = options.args || [];
      const env: NodeJS.ProcessEnv = options.env || {};

      // NodePtyTerminal 経由で表示
      terminalManager.createTerminal({
        name: options.name,
        command: options.command,
        args,
        cwd: options.cwd,
        env,
        encoding: options.encoding,
        mode: options.mode,
        shellPath: options.shellPath,
        shellArgs: options.shellArgs,
        preCommands: options.preCommands,
      });
    },
    dispose(): void {
      terminalManager.dispose();
      processManager.dispose();
    },
  };

  return executor;
}

export type ExecutorInstanceType = ReturnType<typeof createExecutor>;
// デフォルトエクスポートで activate.ts などでの import createExecutor をサポート
export default createExecutor;
