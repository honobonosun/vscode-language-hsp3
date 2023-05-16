# Change Log

All notable changes to the "dev-vscode-language-hsp3" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 2023/xx/xx - 1.2.0
- _update_ hsp37の追加キーワードの色分けに対応中です。

## 2022/12/29 - 1.1.1
- _fix_ toolset-hsp3が有効でない環境でRun HSP programに失敗する不具合を修正しました。
- _add_ "language-hsp3.executor.enable"を無効化する案内を開始しました。
  - readme.mdに注意書きを追加しました。

## 2022/10/17 - 1.1.0
- _add_ toolset-hsp3で指定された環境をRun HSP Programに反映できるようになりました。

## 2022/05/24 - 1.0.6
- _fix_ パッケージの依存関係を更新しました。

## 2022/05/24 - 1.0.5
- _fix_ パッケージの依存関係を更新しました。

## 2021/09/30 - 1.0.4
- _fix_ パッケージの依存関係を更新しました。
- _fix_ VSCodeの対応エンジンを最新へ変更しました。
- _add_ ベータ版hspcのバージョンに対応しました。
- _update_ HSP3のコーディングインデントルールをgingier-hsp3寄りに変更しました。
- _update_ HSP3.6で追加されたキーワードを色分けできるようになりました。

## 2020/12/07 - 1.0.3
- _fix_ Outlineで認識した定義位置が実際の位置とずれていたのを修正しました。

## 2020/03/20 - 1.0.2
- _fix_ GitHubのSecurity Alertsを受けて、依存関係を更新しました。

## 2019/12/07 - 1.0.1
- _fix_ [プリプロセス命令は小文字です。 #13](https://github.com/honobonosun/vscode-language-hsp3/issues/13) を修正しました。
- _add_ Outlineに`#const`と`#enum`を追加しました。

## 2019/11/17 - 1.0.0
- [Outline機能を作る #10](https://github.com/honobonosun/vscode-language-hsp3/issues/10) を実装しました。
- [Statusbar機能を作る #11](https://github.com/honobonosun/vscode-language-hsp3/issues/11) を実装しました。
- [Helpman機能を作る。 #12](https://github.com/honobonosun/vscode-language-hsp3/issues/12) を実装しました。
- _update_ ステータスバーにコマンド実行中が表示されるようになりました。

## 2019/08/25 - 0.1.4
- _fix_ `array.value = "--"`で正しくハイライトされない問題を修正しました。

## 2019/08/01 - 0.1.3
- _fix_ [指数表記に小文字を使うとハイライトされません。 #8](https://github.com/honobonosun/vscode-language-hsp3/issues/8)を修正しました。

## 2019/06/27 - 0.1.2
- _fix_ [変数初期化文にハイライトされない複合代入文があります。 #7](https://github.com/honobonosun/vscode-language-hsp3/issues/7)を修正しました。

## 2019/06/19 - 0.1.1
- _add_ dup、dupptr命令の第一引数を変数としてハイライトできるようになりました。
- _fix_ 拡張機能が設定を読み込むときに、VSCodeから警告される問題を修正しました。

## 2019/06/16 - 0.1.0
- _update_ コマンド機能を移植しました。
- _add_ wineModeを実装しました。

## 2019/05/28 - 0.0.1
- 最初のバージョンを公開。
