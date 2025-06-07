import vscode from "vscode";

const config = (section?: string) => {
  let cfg = vscode.workspace.getConfiguration(section);
  const subscription = vscode.workspace.onDidChangeConfiguration((e) => {
    if (!section || (section && e.affectsConfiguration(section)))
      cfg = vscode.workspace.getConfiguration(section);
  });
  return {
    dispose: () => {
      subscription.dispose();
    },
    get: <T>(subSection: string, defaultValue: T): T => {
      return cfg.get<T>(subSection) ?? defaultValue;
    },
    has: cfg.has,
    update: <T>(subSection: string, value: T) => cfg.update(subSection, value),
  };
};
export default config;
export type Config = typeof config;
export type ConfigInstance = ReturnType<typeof config>;
