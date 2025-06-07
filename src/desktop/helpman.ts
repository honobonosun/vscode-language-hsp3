import * as vscode from "vscode";
import { exec } from "child_process";
import opener from "opener";
import createConfig from "../common/config";
import { EXTENSION_ID } from "../common/constant";

const createHelpman = () => {
  const config = createConfig(EXTENSION_ID);
  return {
    call: (editor: vscode.TextEditor) => {
      const word = editorGetWord(editor);
      if (config.get("")) {
        const url = config.get("helpman.path.online") as string;
        opener(url.replace("%s", encodeURIComponent(word)));
      }
    },
    dispose: () => {
      config.dispose();
    },
  };
};
export default createHelpman;

function editorGetWord(textEditor: vscode.TextEditor): string {
  const selection = textEditor.selection;
  const seltext = textEditor.document.getText(
    new vscode.Range(selection.active, selection.anchor)
  );
  if (seltext !== "") {
    return seltext;
  } else {
    const position = textEditor.selection.start;
    const wordRange = textEditor.document.getWordRangeAtPosition(
      position,
      RegExp(
        "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)"
      )
    );
    return textEditor.document.getText(wordRange);
  }
}
