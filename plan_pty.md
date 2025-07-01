# NodePty ベースターミナル実装計画

## 1. 目的

- 任意のコンソールアプリケーション（hspc/hsptest/hsp3cl 等）を VS Code ターミナル上で完全にインタラクティブに実行
- 標準入出力をリアルタイムにキャプチャし、ログ記録やエディター上のオーバービュー表示を行う
- 環境変数（例: HSP3_ROOT）や前置コマンドをターミナル再起動なしに動的に注入できるようにする

## 2. 背景

- 既存の VirtualTerminal 実装は自前ターミナルエミュレータであり、VS Code の本物の端末機能を活かしきれていない
- 複雑な ANSI 処理や履歴管理を自前で維持する負担が大きい
- node-pty を使えばシェルを介さずに任意アプリを擬似端末上で動かせる

## 3. 要求仕様

- NodePtyTerminal による `vscode.Pseudoterminal` 実装
- 任意コマンドを `pty.spawn(command, args)` で直接起動
- `onData` → `writeEmitter.fire(data)` でターミナル表示およびログ出力
- `handleInput(data)` → `proc.write(data)` でユーザー入力をプロセスに渡す
- `closeEmitter.fire(exitCode)` で終了検知
- 前置コマンドや環境変数注入は `proc.write("export ...\r\n")` / `proc.write("set ...\r\n")` で実現
- 必要に応じてシェル経由でコマンド実行するオプションをサポート
- 一部のユーザー入力（Ctrl+C, Ctrl+L, 矢印キーなど）をフック／無効化／カスタム処理する機能をサポート

## 4. アーキテクチャ概要

1. 依存追加

   - `node-pty` / `@types/node-pty`
   - `iconv-lite` / `@types/iconv-lite`

2. `src/desktop/pty/NodePtyTerminal.ts`（新規）

   - `implements vscode.Pseudoterminal`
   - オプションでシェル経由実行モードをサポート（`shellPath`/`shellArgs`/`preCommands`）
   - `handleInput` 内で特定キー入力をフック／無効化／カスタム処理するオプションを提供
   - `open()` で `pty.spawn`
   - `onData`/`onExit` イベント連携
   - `handleInput`/`close()` 実装

3. `src/desktop/pty/TerminalManager.ts`（新規）

   - 名前ベースで `NodePtyTerminal` を生成・管理
   - `createTerminal({ name, command, args, cwd, env, iconPath })`
   - ターミナル閉鎖時のクリーンアップハンドラ登録

4. `createExecutor` 改修
   - 設定フラグ `useNodePty`（仮称）により切り替え
   - 従来の ProcessExecutor は残すが、NodePtyTerminal 経路優先

## 5. 実装ステップ

- ステップ1: 依存追加（完了）
- ステップ2: `src/desktop/pty/NodePtyTerminal.ts` 作成
- ステップ3: `src/desktop/pty/TerminalManager.ts` 作成
- ステップ4: `createExecutor` を改修し、`useNodePty` 分岐を追加
- ステップ5: `package.json` の `contributes.configuration` に `language-hsp3.useNodePty` を追加
- ステップ6: テスト・ドキュメント更新

## 6. テスト計画

- 単体テスト: NodePtyTerminal の open/handleInput/onDidWrite/onDidClose 動作確認
- 結合テスト: 複数コンソールアプリの起動・前置コマンド挿入・環境変数変更検証
- 手動テスト: Windows/Mac/Linux 上でシームレスな入出力操作を実環境で確認

## 7. ドキュメント更新

- `doc/extension.md`: 新設定フラグと利用方法追記
- `README.md`: NodePty 対応手順記載
- `doc/logging.md`: ターミナル入出力ログフロー追加

## 8. 移行手順

1. `language-hsp3.useNodePty: false` で既存動作確認
2. `true` に切り替え、NodePtyTerminal 経由の動作検証
3. 問題なければデフォルトを `true` に変更しリリース

## 9. スケジュール

| フェーズ     | 期間  | 内容                             |
| ------------ | ----- | -------------------------------- |
| 準備         | 1日   | 依存追加・設定設計               |
| 実装         | 2-3日 | NodePtyTerminal・TerminalManager |
| テスト       | 1-2日 | 単体/結合/手動テスト             |
| ドキュメント | 0.5日 | README・doc 更新                 |
| リリース準備 | 0.5日 | 移行手順最終確認                 |

### 実装詳細

以下を実装時に参照してください。

- src/desktop/executor.ts

  - ExecutorOptions に `enableSubstitution?: boolean` を追加
  - ExecutorOptions に以下を追加:
    ```ts
    interface ExecutorOptions {
      mode?: "direct" | "shell"; // 実行モード
      shellPath?: string; // シェル起動パス（shellモード時）
      shellArgs?: string[]; // シェル起動引数
      preCommands?: string[]; // シェル起動後・コマンド実行前に注入するコマンド
      enableSubstitution?: boolean; // 既存機能
      // その他既存フィールド...
    }
    ```
  - import で `expandPath` を読み込み、`options.enableSubstitution !== false` の場合のみコマンドと引数に対し `expandPath`／`substituteVariables` を適用
  - 変数置換用関数 `substituteVariables(arg: string, context: {editorPath: string, filePath: string}): string` を src/desktop/utils/substitution.ts に実装

- src/desktop/utils/substitution.ts (新規)

  ```ts
  import { secureExpandPathSafe } from "../pathex";
  export function substituteVariables(
    input: string,
    context: { editorPath: string; filePath: string }
  ): string {
    // %FILEPATH% → context.filePath など置換
    // それぞれ expandPath で安全性検証
    // 例: secureExpandPathSafe(filePath, { baseDir: cwd })
    // エラー時には例外を投げる
  }
  ```

- src/desktop/pty/NodePtyTerminal.ts (新規)

  ```ts
  import * as pty from "node-pty";
  import * as iconv from "iconv-lite";
  import { ExecutorOptions } from "./executor";
  import { TerminalStream } from "./terminal";

  export class NodePtyTerminal implements vscode.Pseudoterminal {
    constructor(private options: ExecutorOptions) {}

    open(initialDimensions?: vscode.TerminalDimensions) {
      const proc = pty.spawn(this.options.command, this.options.args, {
        cwd: this.options.cwd,
        env: this.options.env,
      });
      proc.onData((data) => {
        // Bufferではなく文字列だが、encoding指定でデコードが必要ならiconv.decodeを使う
        const text = iconv.decode(
          Buffer.from(data),
          this.options.encoding || "utf8"
        );
        this.writeEmitter.fire(text);
        // ログ出力
      });
      // input/kill イベント連携など
    }
    // handleInput, close などを実装
  }
  ```

- src/desktop/pty/TerminalManager.ts (新規)

  ```ts
  import { ExecutorOptions } from "./executor";
  import { NodePtyTerminal } from "./NodePtyTerminal";

  export class TerminalManager {
    private terminals: { [name: string]: NodePtyTerminal } = {};

    createTerminal({
      name,
      command,
      args,
      cwd,
      env,
      iconPath,
    }: ExecutorOptions) {
      const terminal = new NodePtyTerminal({
        command,
        args,
        cwd,
        env,
        iconPath,
      });
      this.terminals[name] = terminal;
      return terminal;
    }

    // ターミナル閉鎖時のクリーンアップハンドラ登録
    registerCleanupHandler(name: string, handler: () => void) {
      // 実装
    }
  }
  ```

- createExecutor 関数改修

  - `useNodePty` と `options.enableSubstitution` によって `ProcessExecutor` or `NodePtyTerminal` を選択
  - 置換フロー実装例を plan_pty.md ステップ 4 に従い追加

- 型定義／設定
  - tsconfig.json に node-pty, iconv-lite 型定義を許可する設定を追加

## 10. 実装TODOリスト

- [ ] 依存追加: node-pty, @types/node-pty, iconv-lite, @types/iconv-lite
- [ ] `src/desktop/pty/NodePtyTerminal.ts` を実装
- [ ] `src/desktop/pty/TerminalManager.ts` を実装
- [ ] `ExecutorOptions` に `mode`/`shellPath`/`shellArgs`/`preCommands` を追加
- [ ] `createExecutor` に `useNodePty` 分岐を追加
- [ ] `src/desktop/utils/substitution.ts` を実装
- [ ] `package.json` に `language-hsp3.useNodePty` 設定を追加
- [ ] テスト（単体/結合/手動）を作成・実行
- [ ] ドキュメント更新を完了

---

### サンプルコード

#### src/desktop/pty/NodePtyTerminal.ts

```ts
import * as pty from "node-pty";
import * as iconv from "iconv-lite";
import * as vscode from "vscode";

export class NodePtyTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidWrite = this.writeEmitter.event;
  onDidClose = this.closeEmitter.event;
  private proc!: pty.IPty;

  constructor(
    private opts: {
      command: string;
      args: string[];
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      encoding?: string;
      mode?: "direct" | "shell";
      shellPath?: string;
      shellArgs?: string[];
      preCommands?: string[];
    }
  ) {}

  open(): void {
    const { mode = "direct", shellPath, shellArgs, preCommands } = this.opts;
    if (mode === "shell" && shellPath) {
      this.proc = pty.spawn(shellPath, shellArgs || [], {
        cwd: this.opts.cwd,
        env: { ...process.env, ...this.opts.env },
      });
      (preCommands || []).forEach((cmd) => this.proc.write(cmd + "\r\n"));
    } else {
      this.proc = pty.spawn(this.opts.command, this.opts.args, {
        cwd: this.opts.cwd,
        env: { ...process.env, ...this.opts.env },
      });
    }
    this.proc.onData((data) => this.writeEmitter.fire(data));
    this.proc.onExit(({ exitCode }) => this.closeEmitter.fire(exitCode));
  }

  handleInput(data: string): void {
    this.proc.write(data);
  }
  close(): void {
    this.proc.kill();
  }
}
```

#### src/desktop/pty/TerminalManager.ts

```ts
import * as vscode from "vscode";
import { NodePtyTerminal } from "./NodePtyTerminal";
import type { TerminalOptions } from "./types";

export class TerminalManager {
  private map = new Map<
    string,
    { term: vscode.Terminal; disp: vscode.Disposable }
  >();

  createTerminal(opts: TerminalOptions) {
    const ptyTerm = new NodePtyTerminal(opts);
    const term = vscode.window.createTerminal({
      name: opts.name,
      pty: ptyTerm,
      iconPath: opts.iconPath,
    });
    term.show();
    const disp = vscode.window.onDidCloseTerminal((t) => {
      if (t === term) {
        this.map.delete(opts.name);
        disp.dispose();
      }
    });
    this.map.set(opts.name, { term, disp });
    return term;
  }

  // getTerminal, closeTerminal, closeAllTerminals など
}
```
