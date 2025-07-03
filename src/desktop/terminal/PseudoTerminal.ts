import * as vscode from "vscode";
import * as pty from "node-pty";
import { LoggerInstance } from "../../common/logger";

export class PseudoTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  public readonly onDidWrite = this.writeEmitter.event;

  private closeEmitter = new vscode.EventEmitter<number | void>();
  public readonly onDidClose = this.closeEmitter.event;

  private ptyProcess: pty.IPty;
  private terminal: vscode.Terminal;
  private isKilled = false;
  private log: ReturnType<LoggerInstance["section"]>;

  constructor(
    logger: LoggerInstance,
    private shellPath: string,
    private shellArgs: string[] = [],
    private cwd?: string,
    private env?: { [key: string]: string }
  ) {
    this.log = logger.section("PseudoTerminal");

    this.log.debug(
      `Creating PseudoTerminal: shell=${shellPath}, args=${JSON.stringify(shellArgs)}, cwd=${cwd}`
    );

    this.ptyProcess = pty.spawn(this.shellPath, this.shellArgs, {
      name: "xterm-color",
      cwd: this.cwd,
      env: this.env,
    });

    this.log.debug(
      `Pty process created: pid=${this.ptyProcess.pid}, cols=${this.ptyProcess.cols}, rows=${this.ptyProcess.rows}`
    );

    this.ptyProcess.onData((data) => {
      this.writeEmitter.fire(data);
    });
    this.ptyProcess.onExit((event) => {
      this.log.debug(
        `Pty process exited: exitCode=${event.exitCode}, signal=${event.signal}`
      );
      this.isKilled = true;
      this.closeEmitter.fire(event.exitCode);
    });
    this.terminal = vscode.window.createTerminal({
      name: this.shellPath,
      pty: this,
    });
    this.terminal.show();
  }

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    this.log.debug(
      `Terminal opened: dimensions=${JSON.stringify(initialDimensions)}, pid=${this.ptyProcess?.pid}, killed=${this.isKilled}`
    );
    if (initialDimensions && this.ptyProcess && !this.isKilled) {
      try {
        this.ptyProcess.resize(
          initialDimensions.columns,
          initialDimensions.rows
        );
        this.log.debug(
          `Resize successful: ${initialDimensions.columns}x${initialDimensions.rows}`
        );
      } catch (error) {
        this.log.warn(`Failed to resize pty process: ${error}`);
      }
    }
  }

  close(): void {
    this.log.debug(
      `Closing terminal: pid=${this.ptyProcess?.pid}, killed=${this.isKilled}`
    );
    if (!this.isKilled) {
      this.ptyProcess.kill();
      this.isKilled = true;
    }
    this.terminal.dispose();
  }

  handleInput(data: string): void {
    this.ptyProcess.write(data);
  }

  setDimensions(dimensions: vscode.TerminalDimensions): void {
    this.log.debug(
      `Setting dimensions: ${JSON.stringify(dimensions)}, pid=${this.ptyProcess?.pid}, killed=${this.isKilled}`
    );
    if (this.ptyProcess && !this.isKilled) {
      try {
        this.ptyProcess.resize(dimensions.columns, dimensions.rows);
        this.log.debug(
          `Dimension resize successful: ${dimensions.columns}x${dimensions.rows}`
        );
      } catch (error) {
        this.log.warn(`Failed to resize pty process: ${error}`);
      }
    }
  }

  public sendText(text: string, addNewLine: boolean = true): void {
    this.terminal.sendText(text, addNewLine);
  }

  /** 直接 pty シェルに書き込む */
  public write(data: string): void {
    this.ptyProcess.write(data);
  }
}
