import vscode from "vscode";

const createConfig = (section?: string) => {
  let cfg = vscode.workspace.getConfiguration(section);
  const subscription = vscode.workspace.onDidChangeConfiguration((e) => {
    if (!section || (section && e.affectsConfiguration(section)))
      cfg = vscode.workspace.getConfiguration(section);
  });
  return {
    dispose: () => {
      subscription.dispose();
    },
    ...cfg,
  };
};
export default createConfig;
export type Config = typeof createConfig;
export type ConfigInstance = ReturnType<typeof createConfig>;
