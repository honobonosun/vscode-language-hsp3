# language-hsp3 for VSCode

これは、atom版 language-hsp3 の移植です。  
This is porting extension of the "[language-hsp3](https://github.com/honobonosun/language-hsp3)" for [atom](https://atom.io/).

![ss](./2019-06-16.png)

## Setup

既にHSP3とhspcをインストールしているなら、４番まで飛ばしてください。  
If you installed HSP3 and hspc, please skip 3 steps.

以下の手順に従ってコンピューターを設定してください。  
Please setting your computer by following the steps below.

日本語

1. HSPとhspcをダウンロードしてください。
2. コンピューターにHSPをインストールしてください。
3. hspcを解凍して、hspc.exeファイルをHSPがインストールされたディレクトリ（HSP3.51なら、デフォルトで _C:\\hsp351\\_）にコピーして貼り付けします。
4. **重要** HSPがインストールされたディレクトリにあるhsprtファイルをruntimeディレクトリにコピーしてください。
5. language-hsp3 拡張機能をインストールしてください。
6. VSCodeの設定画面の「拡張機能」の「HSP」の「compiler」にhspc.exeの絶対パスを設定します。
7. vscodeのエディタに `mes "Hello VSCode!"` を書いてhspファイルとして保存します。拡張子は".hsp"です。
8. エディタ上にある「Run HSP program」を押します。
9. 「Hello VSCode!」と表示されれば、セットアップは完了です。

English

1. Download [HSP](http://hsp.tv/) and [hspc](http://dev.onionsoft.net/seed/info.ax?id=1392).
2. Install the HSP on your computer.
3. Unzip hspc and copy and paste the hspc.exe file into the directory where the HSP was installed (For HSP 3.51, the default is _C:\\hsp351\\_ ).
4. _IMPORTANT_ Copy the hsprt file from the HSP installation directory to the runtime directory.
5. Install the language-hsp3 extension.
6. Set the absolute path of hspc.exe to "compiler" in "HSP" of "Settings" on the VSCode setting screen.
7. Write `mes "Hello VSCode!"` in the vscode editor and save it as an hsp file. The extension is ".hsp".
8. Press "Run HSP program" on the editor.
9. When "Hello VSCode!" is displayed, the setup is completed.

**Enjoy!**

### How do I use a console compiler other than hspc?

コマンドの実行時にコンパイラに渡される引数を設定できます。  
You can set the arguments that are passed to the compiler when you run the command.

settings.jsonファイルに以下のプロパティを設定できます。  
You can set the following properties in the settings.json file:

```json
// this command is "compiler arg1 arg2 filepath"
"language-hsp3.runCommands": [
  "arg1",
  "arg2",
  "%FILEPATH%"
],
"language-hsp3.makeCommands": [
  "arg1",
  "arg2",
  "%FILEPATH%"
]
```

`%FILEPATH%`は、特殊文字です。エディタのファイルパスに置き換わります。  
`%FILEPATH%` is a special character. Replaces the file path in the editor.

## Commands that will be available

| command | title | description |
|:--------|:------|:------------|
|language-hsp3.run | Run HSP program | アクティブなエディタで開いているファイルをHSPプログラムとして実行します。<br>Runs the file open in the active editor as an HSP program.|
|language-hsp3.make | Automatic exe file creation | アクティブなエディタで開いているファイルに対して自動実行ファイル作成を行います。<br>Automatic executable creation for files opened in the active editor.|

| command | default key |
|:--------|:------------|
|language-hsp3.run|Ctrl+K F5|
|language-hsp3.make|Ctrl+F9|

アクティブなエディタがない場合、コマンドは失敗します。  
If no editor is active, the command fails.

エディタの内容がファイルとして保存されていない場合、失敗します。  
If the contents of the editor are not saved as a file, it fails.

コマンドボタンは、HSP言語での編集中に表示されます。  
Command buttons appear while editing in the HSP language.

コマンドは、Altキーを押している間だけ切り替わります。  
The command switches only while you hold down the Alt key.

## Command execution with a new executor

v1.0.0からは、executorモジュールでコマンドが実行されます。  
Starting with v 1.0. 0, commands are executed in the executor module.

このモジュールは従来のコマンド実行と、hspc v2以降のhspc v2用引数付き実行コマンド、ステータスバーから使用するコンパイル設定の変更に対応します。  
This module supports legacy command execution, new argued execution commands since hspc v2, and changes to compilation setting from the status bar.

既定値では、従来と同じ動作に設定されています。  
By default, the behavior is set to the same as before.

新しいexecutorを有効化すると、従来の設定から新しい設定へ切り替わります。  
Enabling the new executor switches from the old setting to the new setting.

なので、複数のバージョンのHSPを使用しない場合、従来のコマンド実行から移行しなくても大丈夫です。  
So if you don't want to use multiple versions of HSP, you don't have to migrate from running traditional commands.

executorをカスタマイズする場合、json形式でキーと値を正しく設定する必要があります。  
If you customize executor, you must set keys and values correctly in json format.

### executor customize

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

## License

### [language-hsp3 for VSCode](https://github.com/honobonosun/vscode-language-hsp3)
MIT License  
Copyright (c) 2019 Honobono

### [language-hsp3](https://github.com/honobonosun/language-hsp3)
MIT License  
Copyright (c) 2017-2018 Honobono

### [iconv-lite](https://www.npmjs.com/package/iconv-lite)
MIT License

Copyright (c) 2011 Alexander Shtuchkin
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### [Code Runner](https://github.com/formulahendry/vscode-code-runner)
MIT License

Copyright (c) 2017 Jun Han

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### [opener](https://github.com/domenic/opener)

Dual licensed under WTFPL and MIT:

---

Copyright Â© 2012â€“2018 Domenic Denicola <d@domenic.me>

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See below for more details.

        DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                    Version 2, December 2004

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.

---

The MIT License (MIT)

Copyright Â© 2012â€“2018 Domenic Denicola <d@domenic.me>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
