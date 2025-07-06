# language-hsp3 for VSCode

HSP3言語サポート拡張機能です。シンタックスハイライト、外部ツール呼び出しなどの機能を提供します。

## 機能

- HSP3のシンタックスハイライト
- 外部ツールの実行（汎用的なコマンド実行）
- ターミナルでのコマンド実行
- 複数コマンドの連続実行
- 変数置換システム
- 文書アウトライン表示
- HSP3ヘルプマンとの連携

### コマンド

| コマンド | 機能 | ショートカット |
|---------|------|-------------|
| `language-hsp3.run` | HSP3プログラムの実行 | `Ctrl+K F5` |
| `language-hsp3.make` | 実行ファイルの作成 | `Ctrl+F9` |
| `language-hsp3.RunWithArgs` | 引数付きでプログラム実行 | - |
| `language-hsp3.changeOfExecutor` | コンパイラの切り替え | - |
| `language-hsp3.helpman.search` | HSP3ドキュメント検索 | `Ctrl+F1` |

### ターミナル機能

- **ターミナル数制限**: 作成するターミナルの最大数制限
- **自動クリーンアップ**: 制限超過時の古いターミナル削除
- **永続化制御**: VS Code再起動時のターミナル復元制御
- **フォーカス制御**: 実行時のエディタフォーカス保持
- **待機コマンド制御**: シェルモードでの自動待機コマンド挿入

## 設定

### 基本的なExecutor設定

```json
"language-hsp3.executor.paths": {
  // 実行ファイル単位で設定します。同じ実行ファイルでも、キーさえ違えば大丈夫です。
  "3.51": { // キーが切り替えの名前になります。
    "hide": false,  // trueにすると、このキーを切り替え候補に表示しません。
    "path": "C:\\hsp351\\hspc.exe", // 使用する実行ファイルの絶対パスを指定してください。
    "encoding": "Shift_JIS",  // 実行ファイルから返されるコードページを指定してください。
    "buffer": 204800, // 最大で受け取るbyte数を指定してください。
    "helpman": "C:\\hsp351\\helphsp\\helpman.exe",  // helpman.exeの絶対パスを指定してください。
    "commands": {
      "run": [  // デバッグ実行に相当するコマンド引数を指定してください。
        "-dwCra",
        "%FILEPATH%"
      ],
      "make": [ // 自動実行ファイル作成に相当するコマンド引数を指定してください。
        "-PmCa",
        "%FILEPATH%"
      ]
    }
  }
}
```

### 高度なToolset設定

複数のコマンドを連続実行する場合：

```json
"language-hsp3.executor.toolset": [
  {
    "name": "HSP3 Build Process",
    "category": "run",
    "encoding": "Shift_JIS",
    "shell": {"use": true, "path": "cmd"},
    "env": {"HSP_ROOT": "/path/to/hsp", "DEBUG_MODE": "1"},
    "commands": [
      {
        "command": "hspcmp",
        "args": ["-dwCra", "%FILEPATH%"],
        "env": {"COMPILE_MODE": "release"}
      },
      {
        "command": "echo",
        "args": ["Build complete"],
        "env": {"DEBUG_MODE": null, "NOTIFY": "true"}
      }
    ]
  }
]
```

### ターミナル制御設定

```json
// ターミナル数の制御
"language-hsp3.terminal.maxCount": 5,
"language-hsp3.terminal.autoCleanup": false,

// ターミナル永続化の制御
"language-hsp3.terminal.enablePersistence": false,

// ターミナルフォーカス制御
"language-hsp3.terminal.preserveFocus": false,

// 待機コマンド制御
"language-hsp3.terminal.waitForKeyPress": false
```

### 変数置換制御

```json
// コマンド文字列内での環境変数置換のアクセス制御
"language-hsp3.env.whitelist": ["PATH", "HSP_ROOT"],
"language-hsp3.env.blacklist": ["SECRET_KEY"]
```

### その他の設定

```json
// デバッグモード
"language-hsp3.debugMode": false,

// コメント記号の設定
"language-hsp3.line-comment": ";",

// アウトライン機能
"language-hsp3.outline.enable": true,
"language-hsp3.outline.masks": ["label", "deffunc"]
```

## ドキュメント

- [拡張機能のログ機能とデバッグモードの使い方](./doc/logging.md)

## License

このプロジェクトは MIT License の下でライセンスされています。また、この拡張機能が使用している依存ライブラリのライセンス情報についても、[LICENSE](./LICENSE) ファイルに記載されています。
