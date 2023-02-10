import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { commands, Disposable, OutputChannel, window, workspace } from "vscode";
import { z } from "zod";

const schema = z.record(
  z.object({
    hide: z.boolean(),
    path: z.string(),
    encoding: z.string(),
    buffer: z.number(),
    helpman: z.string(),
    commands: z.object({
      run: z.array(z.string()),
      make: z.array(z.string()),
    }),
  }),
);

type ExecutorPaths = z.infer<typeof schema>;

export default class Legacy implements Disposable {
  subscription: Disposable[] = [];
  cfg = workspace.getConfiguration("language-hsp3");
  outcha: OutputChannel;

  constructor() {
    this.outcha = window.createOutputChannel("HSP (legacy extension)", "hsp3");
    this.subscription.push(
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("language-hsp3"))
          this.cfg = workspace.getConfiguration("language-hsp3");
      }),
    );
  }
  dispose() {
    this.subscription.forEach((el) => el.dispose());
  }

  private executor = {
    use: () => this.cfg.get("executor.enable") as boolean | undefined,
    index: () => this.cfg.get("executor.index") as string | undefined,
    paths: () => this.cfg.get("executor.paths") as ExecutorPaths | undefined,
  };

  private profile() {
    if (!this.executor.use()) return undefined;
    const paths = this.executor.paths();
    const index = this.executor.index();
    if (!paths) return undefined;
    else if (!index) {
      this.outcha.appendLine("Profile is unspecified.");
      return undefined;
    } else if (!(index in paths)) {
      this.outcha.appendLine(`Profile "${index}" settings not found.`);
      return undefined;
    }
    try {
      return schema.parse(paths)[index];
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.log(e);
        this.outcha.appendLine("Profile Validation Error.");
        this.outcha.appendLine(e.issues.map((v) => v.message).join("\n"));
      }
      return undefined;
    }
  }

  private get compiler(): string | undefined {
    const profile = this.profile();
    if (profile) return profile.path;
    return this.cfg.get("compiler") as string | undefined;
  }

  private async execution(command: string, args: string[]) {
    // commandはいったん絶対パスへ
    // wineも考慮する
    const cwd = undefined;
    const env = process.env;
    if (this.cfg.get("useSetHSP3ROOT")) {
      try {
        console.log(await commands.getCommands(true));
        //env.HSP3_ROOT = undefined
      } catch (e) {}
    }
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false, cwd, env });
      child;
    });
  }

  public async run() {
    const compiler = this.compiler;
    if (!compiler) {
      return;
    }
  }

  public async make() {}

  public async helpman() {}
}
