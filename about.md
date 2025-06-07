# vscode-language-hsp3 プロジェクト現状

## 概要

HSP3（Hot Soup Processor 3）言語のVSCode拡張機能プロジェクトです。シンタックスハイライト、外部ツール実行、アウトライン表示などの機能を提供します。

## プロジェクト情報

- **名前**: language-hsp3
- **バージョン**: 2.2.2 (preview)
- **ライセンス**: MIT License
- **リポジトリ**: https://github.com/honobonosun/vscode-language-hsp3
- **対応VSCodeバージョン**: ^1.70.0

## アーキテクチャ

### デュアルプラットフォーム対応

- **Desktop版** (`src/desktop/`): フル機能版（ローカル環境）
- **Web版** (`src/web/`): 基本機能版（vscode.dev対応）

### 主要ファイル構成

```
src/
├── common/           # 共通機能
│   ├── config.ts     # 設定管理
│   ├── langCfg.ts    # 言語設定管理
│   ├── constant.ts   # 定数定義
│   └── log.ts        # ログ機能
├── desktop/          # デスクトップ版
│   ├── extension.ts  # メイン拡張機能
│   ├── config.ts     # 設定クラス
│   ├── outline.ts    # アウトライン機能
│   ├── terminal.ts   # ターミナル管理
│   └── executor.ts   # 外部ツール実行
└── web/              # Web版
    └── extension.ts  # Web版拡張機能
```

## 主要機能

### 1. シンタックスハイライト

- HSP3言語の構文を色分け表示
- Desktop版・Web版両方で利用可能

### 2. 外部ツール実行（Desktop版のみ）

- HSP3コンパイラ（hspc.exe）の実行
- デバッグ実行とリリースビルド
- 仮想ターミナルでの実行結果表示

### 3. アウトライン機能（Desktop版のみ）

- 関数、ラベル、モジュールなどの一覧表示
- 定義位置へのジャンプ機能
- 表示項目のフィルタリング

### 4. 設定管理

- 複数のHSPコンパイラ設定をサポート
- エンコーディング設定
- コメント記号の選択（`;` または `//`）

## 設定例

### Executor設定

```json
{
  "language-hsp3.executor.enable": true,
  "language-hsp3.executor.index": "3.51",
  "language-hsp3.executor.paths": {
    "3.51": {
      "hide": false,
      "path": "C:\\hsp351\\hspc.exe",
      "encoding": "Shift_JIS",
      "buffer": 204800,
      "helpman": "C:\\hsp351\\helphsp\\helpman.exe",
      "commands": {
        "run": ["-dwCra", "%FILEPATH%"],
        "make": ["-PmCa", "%FILEPATH%"]
      }
    }
  }
}
```

### その他の設定

- `language-hsp3.outline.enable`: アウトライン機能の有効/無効
- `language-hsp3.line-comment`: コメント記号の選択
- `language-hsp3.encoding`: 文字エンコーディング
- `language-hsp3.MaxBuffer`: 最大バッファサイズ

## 開発環境

### 必要なツール

- Node.js
- npm
- TypeScript
- Webpack

### ビルドコマンド

```bash
npm run build        # 全体ビルド
npm run build:desktop # Desktop版ビルド
npm run build:web    # Web版ビルド
npm run dev          # 開発モード
npm run lint         # コード検証
```

### 開発依存関係

- ESLint + Prettier（コード品質管理）
- TypeScript（型安全性）
- Webpack（バンドル）
- Jest（テスト）

## 最近の更新（v2.2.0）

### 新機能

- vscode.dev（Web版）対応
- 一行コメント記号の選択機能
- 言語設定の動的更新

### 改善点

- ワード境界の変更
- language-configuration.jsonの更新
- 設定管理の最適化

## 既知の制限事項

### Web版の制限

- アウトライン機能は未対応
- 外部ツール呼び出しは未対応
- 基本的な言語サポートのみ

### Desktop版の注意点

- アウトライン機能はCPUとメモリを多く使用
- Windows環境での動作を前提

## 今後の課題

1. **パフォーマンス最適化**

   - アウトライン機能の軽量化
   - メモリ使用量の削減

2. **機能拡張**

   - Web版でのアウトライン対応
   - より高度な言語サポート

3. **保守性向上**
   - テストカバレッジの向上
   - ドキュメント整備

## ライセンス情報

- メインプロジェクト: MIT License
- 依存ライブラリ: 各種ライセンス（詳細は[LICENSE](./LICENSE)参照）
- hsp3-vscode-syntax由来のコード: CC0 1.0 Universal

---

_最終更新: 2025年6月7日_
