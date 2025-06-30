import * as vscode from "vscode";
import { execFile } from "child_process";
import opener from "opener";
import { ConfigInstance } from "../common/config";

const editorGetWord = (editor: vscode.TextEditor) => {
  const selcur = editor.selection;
  const seltext = editor.document.getText(
    new vscode.Range(selcur.active, selcur.anchor)
  );
  if (seltext !== "") return seltext;

  const wordRange = editor.document.getWordRangeAtPosition(selcur.active);
  if (wordRange) return editor.document.getText(wordRange);
};

const createHelpman = (config: ConfigInstance) => {
  const call = (editor: vscode.TextEditor) => {
    const word = editorGetWord(editor);
    if (!word) return;

    //const url = get "helpman.path.online";
    //opener(url.replace("%s", encodeURIComponent(word)));
  };
  const cmd = vscode.commands.registerTextEditorCommand(
    "language-hsp3.helpman.search",
    call
  );
  return {
    call,
    dispose: () => {
      config.dispose();
      cmd.dispose();
    },
  };
};
export default createHelpman;
