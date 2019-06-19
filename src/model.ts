"use strict";
//import * as fs from "fs";
//import * as os from "os";
import { basename, dirname, extname, join } from "path";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { decode } from "iconv-lite";
//import { strict } from "assert";
//import { version } from "punycode";
//import { AnyARecord } from "dns";
import { convertPath } from "./wine";
//import { stringify } from "querystring";

export class Model implements vscode.Disposable {
  private _config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("language-hsp3");
  private _output: vscode.OutputChannel = vscode.window.createOutputChannel("HSP");
  private _wineMode: boolean = false;

  constructor() {
    // get config wineMode
    const temp = vscode.workspace.getConfiguration("language-hsp3");
    if (temp) {
      const temp2 = temp.get("wineMode");
      if (temp2) {
        this._wineMode = <boolean>temp2;
      }
    }
  }

  private replace(args: string[], file: string): string[] {
    if (!args) { return []; }
    let result: string[] = [];

    for (var i = 0; i < args.length; i++) {
      result.push(
        args[i].replace(
          /%FILEPATH%/g,
          (word) => {
            if (word === "%FILEPATH%") { return file; }
            return "";
          }
        )
      );
    }
    return result;
  }

  private updateConfig(fileUri: vscode.Uri | null) {
    this._config = vscode.workspace.getConfiguration("language-hsp3", fileUri);
  }

  private async isLegacyHspc(compilerPath: string): Promise<boolean> {
    try {
      // hspcのバージョンを確認する。
      const compBasename = basename(compilerPath);
      const option = { encoding: "Shift_JIS", maxBuffer: 204800 };
      if (compBasename === "hspc.exe" || compBasename === "hspc") {
        let version: { stdout: string | Buffer, stderr: string | Buffer };
        if (this._wineMode) {
          version = await promisify(execFile)("wine", [compilerPath, "-v"], option);
        } else {
          version = await promisify(execFile)(compilerPath, ["-v"], option);
        }
        let str = decode(<any>version.stdout, "Shift_JIS");
        let revalue = str.match(/ hspc Version (\d+)\.(\d+)\.(\d+)/);
        if (!revalue) { console.log("Incompatible hspc."); return false; }  // hspc以外のツール
        if (Number(revalue[1]) <= 1) { return true; } // hspc v1
      }
    } catch (err) {
      console.log(err); // hspcの呼び出しに失敗した。
      vscode.window.showWarningMessage("The compiler call failed.");
    }
    return false;
  }

  private async initialize(fileUri: vscode.Uri): Promise<{ file: string, compilerPath: string, run: string[], make: string[] }> {
    // 1. output clean up
    this._output.clear(); // TODO : 内容を消すか
    this._output.show(true);  // TODO : コンパイルごとに表示するか

    // 2. get editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return Promise.reject(new Error("There was no editor that should exist."));
    }
    if (editor.document.isUntitled) {
      vscode.window.showErrorMessage("Editor content not saved in file.");
      return Promise.reject(new Error("Editor content not saved in file."));
    }
    let file = "";
    if (!fileUri) {
      file = editor.document.uri.fsPath;
    } else {
      file = fileUri.fsPath;
    }
    if (editor.document.isDirty) {
      vscode.window.showInformationMessage("Changes to the editor have not been saved to the ["+ file +"] file.");
    }

    // 3. get config
    if (!fileUri) { this.updateConfig(null); } else { this.updateConfig(fileUri); }
    let compilerPath = this._config.get<string>("compiler");
    if (!compilerPath) {
      this._output.appendLine("Compiler path is not registered.");
      return Promise.reject(new Error("Compiler path is not registered."));
    }
      // Can be converted to Unix path.
    if (this._wineMode) {
      //console.log("wine mode.");
      let unixPaths: string[] = [];
      try {
        unixPaths = await convertPath(["--windows"], [file]);
      } catch (err) {
        console.log(err);
        vscode.window.showWarningMessage("The path format conversion by winepath failed.");
      } finally {
        //console.log(unixPaths);
        if (unixPaths) { file = unixPaths[0]; }
      }
    }

    const runCommand = this._config.get<string[]>("runCommands");
    const makeCommand = this._config.get<string[]>("makeCommands");
    if (!runCommand || !makeCommand) {
      this._output.appendLine("Compiler arguments are not registered.");
      return Promise.reject(new Error("Compiler arguments are not registered."));
    }
    const run = this.replace(runCommand, file);
    const make = this.replace(makeCommand, file);

    return {
      file,
      compilerPath,
      run,
      make
    };
  }

  private convertLegacyCommand(compilerPath: string, args: string[]): string {
    if (this._wineMode) {
      return ("wine " + compilerPath + " " + args.join(" ").replace(/\""/g, ""));
    } else {
      return (compilerPath + " " + args.join(" ").replace(/\""/g, ""));
    }
  }

  public async execCommand(exeFile: string, file: string, args: string[]) {
    const legacyHspc = await this.isLegacyHspc(exeFile);

    const encoding: string = String(this._config.get("encoding"));
    const option = {
      encoding: encoding,
      maxBuffer: this._config.get<number>("maxBuffer"),
      cwd: dirname(file)
    };

    try {
      let result: any;
      if (legacyHspc) {
        const command = this.convertLegacyCommand(exeFile, args);
        result = await promisify(exec)(command, option);
      } else {
        if (this._wineMode) {
          result = await promisify(execFile)("wine", [exeFile].concat(args), option);
        } else {
          result = await promisify(execFile)(exeFile, args, option);
        }
      }
      const stdout = decode(<Buffer>result.stdout, encoding).replace(/\r?\n/g, "\n");
      this._output.appendLine(stdout);
      vscode.window.showInformationMessage("Success");
    } catch (err) {
      console.log(err);

      if (err.stdout) {
        const stdout = decode(<Buffer>err.stdout, encoding).replace(/\r?\n/g, "\n");
        this._output.append(stdout);
      }
      if (err.stderr) {
        const stderr = decode(<Buffer>err.stderr, encoding).replace(/\r?\n/g, "\n");
        this._output.append(stderr);
      }
      vscode.window.showErrorMessage("Error");
    }
  }

  public async run(fileUri: vscode.Uri) {
    let param;
    try {
      param = await this.initialize(fileUri);
    } catch (err) {
      console.log(err);
      return;
    }
    await this.execCommand(param.compilerPath, param.file, param.run);
  }

  public async make(fileUri: vscode.Uri) {
    let param;
    try {
      param = await this.initialize(fileUri);
    } catch (err) {
      console.log(err);
      return;
    }
    await this.execCommand(param.compilerPath, param.file, param.make);
  }

  public dispose() {
    this._output.dispose();
  }
}