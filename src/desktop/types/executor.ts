export interface ExecutorItem {
  name: string;
  command: string;
  args: string[];
  encoding: string;
  category: string;
  uniqueId: string;
  env?: Record<string, string>;
  shell?: { use: boolean; path?: string; args?: string[] };
  waitForKeyPress?: boolean;
  // 複数コマンド対応
  commands?: Array<{
    command: string;
    args: string[];
    env?: Record<string, string | null>;
  }>;
}

// category毎に現在指定されているコマンドを保存する
export interface CurrentExecutors {
  run?: string;
  make?: string;
  help?: string;
}

// context key
export const CUREXEC = "language-hsp3.executor.current";

// コマンドのカテゴリ
export enum ExecutorItemCategory {
  run = "run",
  make = "make",
  help = "help",
  custom = "custom",
}

export type ExecutionMode = "direct" | "shell";

// executorに渡すコマンドのパラメータ
export interface ExecutionParams {
  name: string;
  cwd: string;
  env: Record<string, string>;
  encoding: string;
  mode: ExecutionMode;
  shellPath?: string;
  shellArgs?: string[];
  waitForKeyPress?: boolean;
  // 複数コマンド対応（メインプロパティに変更）
  commands: Array<{
    command: string;
    args: string[];
    env: Record<string, string>;
  }>;
}
