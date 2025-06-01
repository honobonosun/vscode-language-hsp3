import vscode from "vscode";

type LogKind = "info" | "warn" | "error";

export default class OutputLog implements vscode.Disposable {
  public static readonly logStat = {
    info: "info",
    warn: "warn",
    error: "error",
  };

  private output: vscode.OutputChannel;
  constructor(name: string) {
    this.output = vscode.window.createOutputChannel(name);
  }
  dispose(): void {
    this.output.dispose();
  }

  write(text: string): void {
    this.output.appendLine(text);
  }

  log(section: string, kind: LogKind, text: string): void {
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").replace("Z", "");
    const logMessage = `[${timestamp}] [${section}] [${kind.toUpperCase()}] ${text}`;
    this.write(logMessage);
  }

  createSection(section: string): (kind: LogKind, text: string) => void {
    return (kind: LogKind, text: string): void => this.log(section, kind, text);
  }
}
