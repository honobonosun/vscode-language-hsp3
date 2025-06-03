import vscode from "vscode";

export interface LanguageConfigurationManager {
  updateConfiguration(): void;
  dispose(): void;
}

export function createLanguageConfigurationManager(
  languageId: string,
  configurationSection: string
): LanguageConfigurationManager {
  let resource: vscode.Disposable | undefined = undefined;
  let currentLineComment = ";";

  const updateConfiguration = () => {
    const config = vscode.workspace.getConfiguration(configurationSection);
    const lineComment = config.get<string>("line-comment");
    if (lineComment !== currentLineComment) {
      currentLineComment = lineComment ?? ";";
      if (resource) resource.dispose();
      resource = vscode.languages.setLanguageConfiguration(languageId, {
        comments: { lineComment },
      });
    }
  };

  return {
    updateConfiguration,
    dispose() {
      if (resource) resource.dispose();
    },
  };
}
