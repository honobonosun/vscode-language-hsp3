import { spawn, ChildProcess } from "child_process";
import { TerminalStream } from "./terminal";
import { ConfigInstance } from "../common/config";

export interface ExecutorOptions {
  command: string;
  args: string[];
  cwd?: string;
  encoding?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

class ProcessExecutor {
  private childProcess: ChildProcess | undefined;
  private stream: TerminalStream | undefined;
  private isRunning = false;
  private isDisposed = false;

  constructor(private options: ExecutorOptions) {}

  public async execute(stream: TerminalStream): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      this.stream = stream;
      this.isRunning = true;

      const stdout: string[] = [];
      const stderr: string[] = [];
      let isCleanedUp = false;

      // 子プロセスの起動
      this.childProcess = spawn(this.options.command, this.options.args, {
        cwd: this.options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...this.options.env },
      });

      // 標準出力の処理
      this.childProcess.stdout?.on("data", (data: Buffer) => {
        const text = this.decodeBuffer(data);
        stdout.push(text);

        // ターミナルに出力（改行コードを変換）
        stream.write(text.replace(/\n/g, "\r\n"));
      });

      // 標準エラー出力の処理
      this.childProcess.stderr?.on("data", (data: Buffer) => {
        const text = this.decodeBuffer(data);
        stderr.push(text);

        // エラー出力として表示
        stream.writeError(text.replace(/\n/g, "\r\n"));
      });

      // 入力ハンドラーの設定
      const inputDisposable = stream.onInput((data: string) => {
        if (this.childProcess?.stdin && this.isRunning) {
          // 特殊キーの処理
          if (data === "\x03") {
            // Ctrl+C
            this.kill();
            return;
          }

          this.childProcess.stdin.write(data);
        }
      });

      // ストリーム（仮想ターミナル）側から閉じられた時の処理
      const killDisposable = stream.onKill(() => {
        this.kill(); // 子プロセスも道連れにする
      });

      // クリーンアップ関数
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        inputDisposable.dispose();
        killDisposable.dispose();
      };

      // プロセス終了時の処理
      this.childProcess.on("close", (code) => {
        this.isRunning = false;
        const exitCode = code ?? 0;

        cleanup();
        //stream.close(exitCode); // 仮想ターミナルを閉じる
        stream.closeWithKeyWait(exitCode); // キー入力待ちしてから閉じる

        resolve({
          exitCode,
          stdout: stdout.join(""),
          stderr: stderr.join(""),
        });
      });

      // エラー処理
      this.childProcess.on("error", (err) => {
        cleanup();
        this.isRunning = false;
        stream.writeError(`Failed to start process: ${err.message}`);
        stream.close(1);

        reject(err);
      });
    });
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    this.kill();
    this.childProcess = undefined;
    this.stream = undefined;
  }

  public kill(signal: NodeJS.Signals = "SIGTERM"): void {
    if (this.childProcess && this.isRunning) {
      this.isRunning = false;
      this.childProcess.kill(signal);
      this.stream?.writeLine("\r\n^C Process interrupted");
      console.log(`Process killed with signal: ${signal}`);
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }
  private decodeBuffer(buffer: Buffer): string {
    if (this.options.encoding) {
      // カスタムエンコーディング処理があれば使用
      //return iconv.decode(buffer, this.options.encoding);
    }
    return buffer.toString("utf8");
  }
}

const createExecutor = () => {
  const activeProcesses = new Map<symbol, ProcessExecutor>();

  const execute = async (
    stream: TerminalStream,
    options: ExecutorOptions,
    processSymbol?: symbol
  ): Promise<ProcessResult> => {
    const executor = new ProcessExecutor(options);

    if (processSymbol) {
      activeProcesses.set(processSymbol, executor);
    }

    try {
      const result = await executor.execute(stream);

      if (processSymbol) {
        activeProcesses.delete(processSymbol);
      }

      return result;
    } catch (error) {
      if (processSymbol) {
        activeProcesses.delete(processSymbol);
      }
      throw error;
    }
  };

  const killProcess = (processSymbol: symbol): boolean => {
    const executor = activeProcesses.get(processSymbol);
    if (executor) {
      executor.kill();
      activeProcesses.delete(processSymbol);
      return true;
    }
    return false;
  };

  const isProcessActive = (processSymbol: symbol): boolean => {
    const executor = activeProcesses.get(processSymbol);
    return executor?.isActive() ?? false;
  };

  const dispose = () => {
    // 全てのアクティブなプロセスを終了
    for (const [symbol, executor] of activeProcesses) {
      executor.kill();
    }
    activeProcesses.clear();
  };

  return {
    execute,
    killProcess,
    isProcessActive,
    dispose,
  };
};

export default createExecutor;
