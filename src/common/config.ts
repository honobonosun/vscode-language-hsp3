import vscode from "vscode";

type ConfigListener = (e: vscode.ConfigurationChangeEvent) => void;

const createConfig = (section?: string) => {
  let cfg = vscode.workspace.getConfiguration(section);
  const listeners: Map<symbol, ConfigListener> = new Map();

  const subscription = vscode.workspace.onDidChangeConfiguration((e) => {
    if (!section || (section && e.affectsConfiguration(section))) {
      cfg = vscode.workspace.getConfiguration(section);
      listeners.forEach((listener) => listener(e));
    }
  });

  return {
    ...cfg,
    dispose: () => {
      listeners.clear();
      subscription.dispose();
    },
    addListener: (listener: ConfigListener): symbol => {
      const id = Symbol("configListener");
      listeners.set(id, listener);
      return id;
    },
    removeListener: (id: symbol): boolean => {
      return listeners.delete(id);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
};

export default createConfig;
export type Config = typeof createConfig;
export type ConfigInstance = ReturnType<typeof createConfig>;
export type { ConfigListener };
