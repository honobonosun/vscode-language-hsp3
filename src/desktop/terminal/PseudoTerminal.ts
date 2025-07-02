import * as vscode from "vscode";
import { spawn, IPty, IPtyForkOptions } from "node-pty";

export interface PseudoTerminalOptions {
  /** ターミナルに表示する名前 */
  name: string;
  /** 実行するコマンド */
  command: string;
  /** コマンド引数 */
  args: string[];
  /** ワーキングディレクトリ */
  cwd?: string;
  /** 環境変数 */
  env?: NodeJS.ProcessEnv;
  /** エンコーディング（未使用の場合は省略可） */
  encoding?: string;
  /** 直接実行 or シェル経由(shell) */
  mode?: "direct" | "shell";
  /** シェルパス(shell モード時必須) */
  shellPath?: string;
  /** シェル引数(shell モード時使用) */
  shellArgs?: string[];
  /** シェル起動後に実行するコマンド列 */
  preCommands?: string[];
}

export class NodePtyTerminal implements vscode.Pseudoterminal {
  private ptyProcess?: IPty;
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();

  public onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  public onDidClose: vscode.Event<number> = this.closeEmitter.event;

  constructor(private options: PseudoTerminalOptions) {}

  public open(initialDimensions?: vscode.TerminalDimensions): void {
    // 初期サイズ
    const cols = initialDimensions?.columns;
    const rows = initialDimensions?.rows;
    // 環境変数のマージ
    const env = { ...process.env, ...(this.options.env || {}) };
    const spawnOptions: IPtyForkOptions = {
      cwd: this.options.cwd,
      env,
      cols,
      rows,
      encoding: this.options.encoding || "utf8",
    };

    // 実行コマンドと引数を決定
    const exec =
      this.options.mode === "shell" && this.options.shellPath
        ? this.options.shellPath
        : this.options.command;
    const args =
      this.options.mode === "shell" && this.options.shellArgs
        ? this.options.shellArgs
        : this.options.args;

    // プロセス生成
    this.ptyProcess = spawn(exec, args, spawnOptions);

    // 出力イベント
    this.ptyProcess.onData((data) => {
      this.writeEmitter.fire(data);
    });
    // プロセス終了イベント
    this.ptyProcess.onExit(({ exitCode }) => {
      this.closeEmitter.fire(exitCode);
    });

    // シェルモード時のプリコマンド実行
    if (this.options.mode === "shell" && this.options.preCommands) {
      for (const cmd of this.options.preCommands) {
        this.ptyProcess.write(cmd + "\r");
      }
    }
  }

  public handleInput(data: string): void {
    // ユーザ入力をプロセスへ転送
    this.ptyProcess?.write(data);
  }

  public close(): void {
    // ターミナルが閉じられた時に呼ばれる
    this.ptyProcess?.kill();
  }

  public setDimensions(dimensions: vscode.TerminalDimensions): void {
    // ウィンドウサイズ変更
    this.ptyProcess?.resize(dimensions.columns, dimensions.rows);
  }
}
