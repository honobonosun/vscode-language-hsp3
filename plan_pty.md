# 疑似ターミナル 実装計画

## 各ファイルの役割

### src/desktop/toolset.ts

### src/desktop/executor.ts

### src/desktop/terminal/PseudoTerminal.ts

VSCodeAPIによる擬似端末とnode-ptyをペアでインスタンスします。

### src/desktop/terminal/

### src/desktop/terminal/

### src/desktop/terminal/

### ユーリティ

- pathex.ts
  - 環境変数を実際の文字列に置き換えます
- wine.ts
  - winepathを使ってunix/windows間のパス変換を行います。
