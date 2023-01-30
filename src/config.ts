import * as vscode from "vscode";

export interface ExecutorBody {
  enable: boolean;
  index: string;
  paths: {
    [name: string]: {
      hide: boolean;
      path: string;
      encoding: string;
      buffer: number;
      helpman: string;
      commands: { [name: string]: string[] };
    };
  };
}

export default class Config {
  public config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("language-hsp3", null); // constructorでrefresh呼んでるのに気づかないから此処で初期化。

  constructor(uri: null | vscode.Uri = null) {
    this.refresh(uri);
    return;
  }

  /**
   * 設定を再読み込みします。
   * @param uri 読み込み対象のエディタ情報
   */
  public refresh(uri: null | vscode.Uri = null): void {
    this.config = vscode.workspace.getConfiguration("language-hsp3", uri);
  }

  private recover(section: string): unknown {
    const inspect = this.config.inspect(section);
    if (inspect?.defaultValue) {
      return inspect.defaultValue;
    } else {
      throw new Error(
        `Unrecoverable error. Failed to get \`${section}.defaultValue\`.`,
      );
    }
  }

  private timeID: NodeJS.Timeout | undefined;

  public useExecutor(): boolean {
    return false;
  }

  /**
   * コンパイラのパスを取得します。
   * executorの設定も考慮されます。
   */
  public compiler(): string {
    const compiler = this.config.get("compiler");
    if (compiler) {
      return compiler as string;
    } else {
      return this.recover("compiler") as string;
    }
  }

  /**
   * コンパイラの返答をエンコードするには、どの形式で行うか
   */
  public encoding(): string {
    const encoding = this.config.get("encoding");
    if (encoding) {
      return encoding as string;
    } else {
      return this.recover("encoding") as string;
    }
  }

  public maxBuffer(): number {
    const buffer = this.config.get("MaxBuffer");
    if (buffer) {
      return buffer as number;
    } else {
      return this.recover("MaxBuffer") as number;
    }
  }

  public cmdArgs(name: string): string[] {
    if (name === "run" || name === "make") {
      name = name === "run" ? "runCommands" : "makeCommands";
      const args = this.config.get(name);
      if (args) {
        return args as string[];
      } else {
        throw new Error(
          `The ${name} command is not configured. Please try again.`,
        );
      }
    } else {
      throw new Error(`*dev* An impossible value "${name}" was specified.`);
    }
  }

  public wineMode(): boolean {
    return this.config.get("wineMode") as boolean;
  }

  /**
   * helpman.exeのパスを取得します。
   */
  public helpman(): string {
    const helpman = this.config.get("helpman.path.local");
    if (helpman) {
      return helpman as string;
    } else {
      return this.recover("helpman.path.local") as string;
    }
  }

  public useSetHSP3ROOT(): boolean {
    return this.config.get("useSetHSP3ROOT") as boolean;
  }

  // ここから先は、vscode.WorkspaceConfigurationのメソッド。

  public get(section: string) {
    return this.config.get(section);
  }

  public has(section: string) {
    return this.config.has(section);
  }

  public update(
    section: string,
    value: any,
    configurationTarget?: boolean | vscode.ConfigurationTarget | undefined,
  ) {
    return this.config.update(section, value, configurationTarget);
  }

  public inspect(section: string) {
    return this.config.inspect(section);
  }
}
