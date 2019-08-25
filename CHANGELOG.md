# Change Log

All notable changes to the "dev-vscode-language-hsp3" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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