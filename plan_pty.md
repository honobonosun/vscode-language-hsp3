# Executor の再設計：Pseudoterminal ベース実装計画

## 1. 目的

- 完全インタラクティブ CLI の入出力を拡張側でキャプチャ可能にする
- 既存の Shell 統合 API の制約を回避し、双方向フックをシームレスに実装する

## 2. 背景

- 現状の `executor.ts` は `child_process.spawn` 経由で標準入出力を処理
- VS Code Shell 統合 API ではリアルタイムかつ完全なインタラクティブ操作のフックが困難
- デバッグやログ記録機能の強化要望がある

## 3. 要求仕様

- CLI プロセスの stdout/stderr をリアルタイムに取得し、ターミナル表示と同時にログに記録する
- ユーザー入力（stdin）をキャプチャしつつ CLI に渡す
- 設定フラグによる従来動作との切り替えをサポート
- Windows/Mac/Linux 上で安定して動作する

## 4. アーキテクチャ概要

1. 依存に `node-pty` を追加
2. `vscode.Pseudoterminal` インターフェースを実装した `CliPtyExecutor` クラスを新規作成
3. `TerminalManager` および既存 `createExecutor` を改修し、Pty 対応を統合
4. 設定オプション `usePty` を追加し、動的に切り替え可能とする

## 5. 実装ステップ

### ステップ 1: 依存追加

- `npm install node-pty --save`
- 必要に応じて `@types/node-pty` を追加
- `npm install iconv-lite --save`
- 必要に応じて `@types/iconv-lite` を追加

### ステップ 2: `src/desktop/ptyExecutor.ts` 作成

- `vscode.Pseudoterminal` を実装
  - `open(initialDimensions?)`: `pty.spawn()` で CLI プロセス開始
  - `onDidWrite` / `onDidClose` イベントエミッタ設定
  - `handleInput(data)`: キー入力を `proc.write()` に転送
  - プロセスの `onData` で `writeEmitter.fire(data)` ＆ログ記録
- pty からの出力データを `ExecutorOptions.encoding` に応じて `iconv-lite` でデコードし、VirtualTerminal へ渡す

### ステップ 2.1: 変数置換の実装

- `src/desktop/pathex.ts` の `secureExpandPathSafe`/`expandPath` を利用し、`ExecutorOptions.command` と `ExecutorOptions.args` 内の変数（例: `%FILEPATH%`, `${editor_keyword}`）を実行直前に安全に展開・置換する
- 置換時に危険文字やパストラバーサルが検出された場合はエラーを返し、実行を中止またはユーザーへ通知する

### ステップ 3: `TerminalManager` 連携変更

- 従来の `vscode.window.createTerminal({ shellPath, shellArgs })` を条件付きで維持
- フラグ `usePty = true` 時は `createTerminal({ name, pty: new CliPtyExecutor(...) })` を呼び出し

### ステップ 4: `createExecutor` の改修

- `config.get('usePty')` を利用し、返却する Executor の種類を切り替え
- 変数置換機能の有効/無効は `config.get('language-hsp3.substituteVariables', true)` で制御し、false 時はステップ 2.1 をスキップする
- ExecutorOptionsに `enableSubstitution?: boolean` プロパティを追加し、false の場合はステップ 2.1 をスキップする
- 置換後かつ検証済みの `safeCommand` と `safeArgs` を `ProcessExecutor` または `CliPtyExecutor` に渡す

### ステップ 5: 設定項目追加

- `package.json` の `contributes.configuration` に `language-hsp3.usePty` を追加
- デフォルトを `false` とし、段階的移行をサポート
- ExecutorOptionsの型定義に `enableSubstitution?: boolean` を追加し、関数呼び出し時に開発者が文字列置換機能を切り替え可能にする

### ステップ 6: 互換性検証

- 設定フラグ切替テスト
- 既存単体テスト／結合テストの適用確認

## 6. テスト計画

- **単体テスト**: `CliPtyExecutor` の open/handleInput/onDidWrite の動作確認
- **結合テスト**: VS Code 上で CLI を起動し、入出力フローを自動・手動で検証
- **手動テスト**: Windows/Mac/Linux での実環境テスト

## 7. ドキュメント更新

- `doc/extension.md`: 新機能・設定フラグの説明を追記
- `README.md`: Pseudoterminal 対応手順を記載
- `doc/logging.md`: 入出力ログフローを追加

## 8. 移行手順

1. ローカルで `language-hsp3.usePty: false` の動作を確認
2. `true` に切り替え、Pty 実装を検証
3. 問題なければデフォルトを `true` に変更しリリース

## 9. スケジュール

| フェーズ     | 期間  | 内容                               |
| ------------ | ----- | ---------------------------------- |
| 準備         | 1日   | 依存追加、設定設計                 |
| 実装         | 2-3日 | `CliPtyExecutor`・連携改修         |
| テスト       | 1-2日 | 単体／結合／手動テスト             |
| ドキュメント | 0.5日 | README・ドキュメント更新           |
| リリース準備 | 0.5日 | 移行手順最終確認、デフォルト値変更 |

### 実装詳細

以下を実装時に参照してください。

- src/desktop/executor.ts

  - ExecutorOptions に `enableSubstitution?: boolean` を追加
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

- src/desktop/ptyExecutor.ts (新規)

  ```ts
  import * as pty from "node-pty";
  import * as iconv from "iconv-lite";
  import { ExecutorOptions } from "./executor";
  import { TerminalStream } from "./terminal";

  export class CliPtyExecutor implements vscode.Pseudoterminal {
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

- createExecutor 関数改修

  - `usePty` と `options.enableSubstitution` によって `ProcessExecutor` or `CliPtyExecutor` を選択
  - 置換フロー実装例を plan_pty.md ステップ 4 に従い追加

- 型定義／設定
  - tsconfig.json に node-pty, iconv-lite 型定義を許可する設定を追加
