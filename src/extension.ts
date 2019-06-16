"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Model } from "./model";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  //console.log('Congratulations, your extension "commander-hsp3" is now active!');

  const model = new Model();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let run = vscode.commands.registerCommand('language-hsp3.run', (fileUri: vscode.Uri) => {
    // The code you place here will be executed every time your command is executed
    model.run(fileUri);
  });
  let make = vscode.commands.registerCommand('language-hsp3.make',
  (fileUri: vscode.Uri) => {
    model.make(fileUri);
  });

  context.subscriptions.push(run);
  context.subscriptions.push(make);

  context.subscriptions.push(model);
}

// this method is called when your extension is deactivated
export function deactivate() { }
