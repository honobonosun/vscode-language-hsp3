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
