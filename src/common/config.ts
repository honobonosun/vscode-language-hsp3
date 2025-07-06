/* eslint-disable @typescript-eslint/no-explicit-any */
import vscode from "vscode";

type ConfigListener = (e: vscode.ConfigurationChangeEvent) => void;

interface ConfigInstance {
  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  has(section: string): boolean;
  inspect<T>(section: string): any;
  update(
    section: string,
    value: unknown,
    configurationTarget?: vscode.ConfigurationTarget | boolean
  ): Thenable<void>;
  dispose(): void;
  addListener(listener: ConfigListener): symbol;
  removeListener(id: symbol): boolean;
  readonly listenerCount: number;
}

const createConfig = (section?: string): ConfigInstance => {
  let cfg = vscode.workspace.getConfiguration(section);
  const listeners: Map<symbol, ConfigListener> = new Map();

  const subscription = vscode.workspace.onDidChangeConfiguration((e) => {
    if (!section || (section && e.affectsConfiguration(section))) {
      cfg = vscode.workspace.getConfiguration(section);
      listeners.forEach((listener) => listener(e));
    }
  });

  return {
    get<T>(section: string, defaultValue?: T): T | undefined {
      return cfg.get(section, defaultValue as T);
    },
    has: (section: string) => cfg.has(section),
    inspect: <T>(section: string) => cfg.inspect<T>(section),
    update: (
      section: string,
      value: unknown,
      configurationTarget?: vscode.ConfigurationTarget | boolean
    ) => cfg.update(section, value, configurationTarget),
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
export type { ConfigInstance, ConfigListener };
