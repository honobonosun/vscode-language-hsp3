import * as vscode from "vscode";
import * as pty from "node-pty";
import * as iconv from "iconv-lite";
import { ExecutorOptions } from "./executor";
import { TerminalStream } from "./terminal";
import { EventEmitter } from "events";

export class CliPtyExecutor implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number | void>();
  public onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  public onDidClose: vscode.Event<number | void> = this.closeEmitter.event;

  private ptyProcess?: pty.IPty;

  constructor(private options: ExecutorOptions) {}

  open(initialDimensions?: vscode.TerminalDimensions): void {
    // プロセスをPTYで起動
    this.ptyProcess = pty.spawn(this.options.command, this.options.args, {
      cwd: this.options.cwd,
      env: { ...process.env, ...this.options.env },
    });

    // データ受信時にデコード＆出力
    this.ptyProcess.onData((data) => {
      let text: string;
      if (this.options.encoding) {
        text = iconv.decode(Buffer.from(data, "utf8"), this.options.encoding);
      } else {
        text = data;
      }
      this.writeEmitter.fire(text);
      // TODO: ログ出力を実装
    });

    // プロセス終了検知
    this.ptyProcess.onExit((e) => {
      this.closeEmitter.fire(e.exitCode);
    });
  }

  handleInput(data: string): void {
    // ユーザー入力をプロセスに転送
    this.ptyProcess?.write(data);
  }

  close(): void {
    // 強制終了
    this.ptyProcess?.kill();
  }
}
