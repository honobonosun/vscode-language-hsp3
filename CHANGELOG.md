# Change Log

All notable changes to the "dev-vscode-language-hsp3" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 2025/06/01 - 2.2.2 preview

- _fix_ 外部ツール呼び出し時に出力ペインが文字化けする不具合を修正。

## 2025/06/01 - 2.2.1 preview

- _fix_ 一行コメントの変更機能の実装忘れを修正しました。

## 2025/06/01 - 2.2.0 preview

- _add_ vscode.dev でも HSP3 言語の色分け機能をサポートしました。
  - 現バージョンでは、アウトラインは機能しません。
  - 外部ツール呼び出しは未対応です。
- _add_ 一行コメントに使用する記号を選べるようになりました。
  - この機能は、[hsp3-ginger/hsp3-vscode-syntax](https://github.com/vain0x/hsp3-ginger/tree/main/hsp3-vscode-syntax) から移植しました。
  - Web版 で動作します。
- _update_ ワードの境界を変更しました。
  - _dev_ language-configuration.json の更新になります。
- _dev_ ブランチの操作ミスで一部進捗を削除してしまいました。
  - 割り切って、packageの依存関係から使用する開発ツールチェーンを一新しました。
- **このバージョンは試作です。**
  - webpackの導入によるWeb版の動作確認と、ローカルの差異を確認するためのものです。

## 2023/08/12 - 1.2.0

- _update_ Workspace Trust に対応しました。
  - この変更により、制限モードでも構文の色分けや Outline が使用できます。
  - 制限モードでは、当拡張機能の設定はユーザー設定に限定されます。
- _fix_ node_modules を更新しました。
  - word-wrap from 1.2.3 to 1.2.4.

## 2022/12/29 - 1.1.1

- _fix_ toolset-hsp3 が有効でない環境で Run HSP program に失敗する不具合を修正しました。
- _add_ "language-hsp3.executor.enable"を無効化する案内を開始しました。
  - readme.md に注意書きを追加しました。

## 2022/10/17 - 1.1.0

- _add_ toolset-hsp3 で指定された環境を Run HSP Program に反映できるようになりました。

## 2022/05/24 - 1.0.6

- _fix_ パッケージの依存関係を更新しました。

## 2022/05/24 - 1.0.5

- _fix_ パッケージの依存関係を更新しました。

## 2021/09/30 - 1.0.4

- _fix_ パッケージの依存関係を更新しました。
- _fix_ VSCode の対応エンジンを最新へ変更しました。
- _add_ ベータ版 hspc のバージョンに対応しました。
- _update_ HSP3 のコーディングインデントルールを gingier-hsp3 寄りに変更しました。
- _update_ HSP3.6 で追加されたキーワードを色分けできるようになりました。

## 2020/12/07 - 1.0.3

- _fix_ Outline で認識した定義位置が実際の位置とずれていたのを修正しました。

## 2020/03/20 - 1.0.2

- _fix_ GitHub の Security Alerts を受けて、依存関係を更新しました。

## 2019/12/07 - 1.0.1

- _fix_ [プリプロセス命令は小文字です。 #13](https://github.com/honobonosun/vscode-language-hsp3/issues/13) を修正しました。
- _add_ Outline に`#const`と`#enum`を追加しました。

## 2019/11/17 - 1.0.0

- [Outline 機能を作る #10](https://github.com/honobonosun/vscode-language-hsp3/issues/10) を実装しました。
- [Statusbar 機能を作る #11](https://github.com/honobonosun/vscode-language-hsp3/issues/11) を実装しました。
- [Helpman 機能を作る。 #12](https://github.com/honobonosun/vscode-language-hsp3/issues/12) を実装しました。
- _update_ ステータスバーにコマンド実行中が表示されるようになりました。

## 2019/08/25 - 0.1.4

- _fix_ `array.value = "--"`で正しくハイライトされない問題を修正しました。

## 2019/08/01 - 0.1.3

- _fix_ [指数表記に小文字を使うとハイライトされません。 #8](https://github.com/honobonosun/vscode-language-hsp3/issues/8)を修正しました。

## 2019/06/27 - 0.1.2

- _fix_ [変数初期化文にハイライトされない複合代入文があります。 #7](https://github.com/honobonosun/vscode-language-hsp3/issues/7)を修正しました。

## 2019/06/19 - 0.1.1

- _add_ dup、dupptr 命令の第一引数を変数としてハイライトできるようになりました。
- _fix_ 拡張機能が設定を読み込むときに、VSCode から警告される問題を修正しました。

## 2019/06/16 - 0.1.0

- _update_ コマンド機能を移植しました。
- _add_ wineMode を実装しました。

## 2019/05/28 - 0.0.1

- 最初のバージョンを公開。
