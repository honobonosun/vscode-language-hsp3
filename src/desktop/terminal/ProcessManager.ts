import { spawn, ChildProcess } from "child_process";
import * as vscode from "vscode";

export interface ProcessOptions {
  /** 実行するコマンド */
  command: string;
  /** コマンド引数 */
  args: string[];
  /** ワーキングディレクトリ */
  cwd?: string;
  /** 環境変数 */
  env?: NodeJS.ProcessEnv;
}

export class ProcessManager implements vscode.Disposable {
  private processes: Map<symbol, ChildProcess> = new Map();

  /**
   * 新しいプロセスを起動し、管理対象に追加します。
   * @returns プロセスを識別するシンボル
   */
  public spawnProcess(options: ProcessOptions): symbol {
    const id = Symbol();
    const proc = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.processes.set(id, proc);
    return id;
  }

  /**
   * 指定したプロセスの標準出力にデータリスナーを登録します。
   */
  public onStdout(id: symbol, listener: (data: Buffer) => void): void {
    const proc = this.processes.get(id);
    proc?.stdout?.on("data", listener);
  }

  /**
   * 指定したプロセスの標準エラー出力にデータリスナーを登録します。
   */
  public onStderr(id: symbol, listener: (data: Buffer) => void): void {
    const proc = this.processes.get(id);
    proc?.stderr?.on("data", listener);
  }

  /**
   * 指定したプロセスの終了イベントにリスナーを登録します。
   */
  public onExit(id: symbol, listener: (code: number | null) => void): void {
    const proc = this.processes.get(id);
    proc?.on("close", (code) => listener(code));
  }

  /**
   * 指定したプロセスを強制終了します。
   */
  public kill(id: symbol, signal: NodeJS.Signals = "SIGTERM"): boolean {
    const proc = this.processes.get(id);
    if (!proc) return false;
    proc.kill(signal);
    this.processes.delete(id);
    return true;
  }

  /**
   * 管理中の全プロセスを強制終了し、クリアします。
   */
  public killAll(): void {
    for (const [id, proc] of this.processes) {
      proc.kill();
    }
    this.processes.clear();
  }

  public dispose(): void {
    this.killAll();
  }
}

export const processManager = new ProcessManager();
