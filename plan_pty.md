# ターミナル実装計画

このドキュメントでは、VSCode 拡張機能における仮想ターミナル機能の実装方針を定義します。

## 1. 設定スキーマ拡張 (package.json)

- `language-hsp3.executor.toolset`: 配列（ユーザー設定スコープ）。各要素は以下のプロパティを持つ:
  - `name`: string（任意の名称）
  - `category`: "run" | "make" | "help" | "custom"
  - `continueOnError`: boolean（デフォルト: false）
  - `commands`: 配列。各要素は以下のプロパティを持つ:
    - `command`: string
    - `args`: string[]
    - `encoding`: string
    - `env`: Record<string, string>
    - `shell`: `{ use: false }` または `{ use: true; path: string; args: string[] }`
- 環境変数フィルタ用グローバル設定（マシンスコープ）
  - `language-hsp3.env.whitelist`: string[]（デフォルト: []）
  - `language-hsp3.env.blacklist`: string[]（デフォルト: []）

## 2. Zod スキーマ／型定義の拡張

- `src/desktop/toolset.ts` 内の `executorPathSchema` に上記プロパティを追加
- `src/desktop/types/executor.ts`、`src/desktop/executor.ts` の `ExecutorItem` / `ExecutorOptions` に反映
- `src/desktop/toolset.ts` の `generateUniqueId` による長大な文字列化を回避する方法を検討

## 3. 実行オプション生成

- `useShell === true` → `mode: "shell"` を返し、`shellPath` / `shellArgs` / `preCommands` を含める
- `useShell === false` → `mode: "direct"` を返す

## 4. ターミナルマネージャーの再構築

- `TerminalManager.createTerminal` にシェルモード / 直接モードのロジックを統合
- デフォルトシェル解決（Windows: `cmd.exe` / `powershell.exe`、Unix: `$SHELL` / `bash`）を追加

## 5. ロギング機能追加

- コマンド `language-hsp3.terminal.toggleLogging` で仮想ターミナルのログキャプチャを ON/OFF
- 出力先ファイルはワークスペース設定 `language-hsp3.terminal.logFile` で指定

## 6. マルチターミナル / ラベル

- ユーザー設定でターミナル命名規則を指定可能とする

## 7. 将来の Web ブラウザ対応

- `hsp3dish` 向けに `hspcmp` ウェブアセンブリ導入を検討
- ブラウザ上での仮想ファイルシステム再現機能を検討

## 補足仕様

- **TerminalManager.ts** は疑似ターミナルの管理を行います。
  - 複数の疑似ターミナルインスタンスを生成・管理。
  - 拡張機能終了時に全インスタンスを強制停止し、リソースを解放します。
  - 入出力・終了コードなどのイベント購読と発行、リスナー管理を行います。
  - 各インスタンスのI/Oアクセスの窓口となります。
- **PseudoTerminal.ts** は疑似ターミナルの単一インスタンスを表します。
  - インスタンスに対してI/Oアクセスを提供します。
  - ターミナルマネージャーが必要とする機能を提供します。
- **executor.ts** を通してターミナルマネージャーに疑似ターミナルのインスタンス生成およびコマンド実行を指示します。
  - 実行するコマンドは **toolset.ts** の **CurrentExecutors** を利用し、`getExecutionOptions` や（未実装の）`getExecutorCommandAndArgs` で実行に必要な情報を生成します。
- シェル経由でもコマンドの終了コード取得が可能です。
  - 終了後に特定のコマンドを挿入することで終了コード取得が可能（Windows CMDシェルで検証済み）。

---

_この計画は上記の要件に基づき作成されたもので、実装中に更新される可能性があります。_

## 実装ToDoリスト

1. 設定スキーマの拡張

   - [ ] package.json の `language-hsp3.executor.toolset` を追加
     - [ ] `name`（string）
     - [ ] `category`（"run" | "make" | "help" | "custom"）
     - [ ] `continueOnError`（boolean, デフォルト: false）
     - [ ] `commands`（配列: 各要素に`command`/`args`/`encoding`/`env`/`shell`）
   - [ ] package.json の JSON スキーマにデフォルト値を設定（`continueOnError: false`, `shell.use: false`, `shell.args: []`, `encoding: 'utf8'`, `env: {}` など）
   - [ ] グローバル環境変数フィルタ設定（whitelist/blacklist）を追加

2. 型定義・バリデーションの拡張

   - [ ] src/desktop/toolset.ts の `executorPathSchema` に新プロパティ追加
   - [ ] src/desktop/types/executor.ts, src/desktop/executor.ts の `ExecutorItem` / `ExecutorOptions` を拡張
   - [ ] src/desktop/toolset.ts の `generateUniqueId` による長大な文字列化を回避する方法を検討
   - [ ] src/desktop/toolset.ts の Zod スキーマにデフォルト値設定・必須/オプションの再検討

3. 実行オプション生成ロジック

   - [ ] `useShell` の値に応じて `mode: "shell"` / `"direct"` を返すロジックを実装
   - [ ] `shellPath`, `shellArgs`, `commands` の値を反映
   - [ ] コマンド実行時の環境変数フィルタリングを `secureExpandPathSafe` の動作に合わせて適用

4. ターミナルマネージャーの再構築

   - [ ] `src/desktop/terminal/TerminalManager.ts` を新規作成
     - [ ] `createTerminal` にシェル/直接モードの分岐を統合
     - [ ] デフォルトシェル未指定時に VSCode のターミナルプロファイル既定を取得しフォールバック、取得失敗時に警告ログを出力
     - [ ] 複数ターミナルインスタンスの管理
     - [ ] 終了時の全インスタンス強制停止・リソース解放
     - [ ] イベント購読・発行・リスナー管理
   - [ ] `src/desktop/terminal/PseudoTerminal.ts` を新規作成
     - [ ] 単一疑似ターミナルインスタンスのI/O管理

5. executor.ts との連携

   - [ ] executor.ts からターミナルマネージャー経由でインスタンス生成・コマンド実行
   - [ ] toolset.ts の `CurrentExecutors`, `getExecutionOptions`, `getExecutorCommandAndArgs` を活用

6. ロギング機能

   - [ ] `language-hsp3.terminal.toggleLogging` コマンドの実装
   - [ ] `language-hsp3.terminal.logFile` 設定の反映
   - [ ] ログファイルサイズ制限・ローテーションのガードを追加

7. マルチターミナル・ラベル対応

   - [ ] ターミナル命名規則のユーザー設定対応
   - [ ] ターミナル名生成時に `expandPath()` を利用し、必要に応じ `secureExpandPathSafe()` を拡張してエスケープ無視オプションと `checkDangerousChars` 無効化オプションを追加

8. 終了コード取得

   - [ ] シェル経由での終了コード取得ロジック（Windows CMD等での検証）

9. 将来のWeb対応（参考）

   - [ ] hsp3dish向けWebAssembly導入検討
   - [ ] 仮想ファイルシステム再現機能の検討

10. テスト設計

- [ ] 主要機能全般のユニットテスト/E2Eテストを作成
