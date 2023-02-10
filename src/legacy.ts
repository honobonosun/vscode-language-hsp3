import { spawn } from "node:child_process";
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
  private subscription: Disposable[] = [];
  private cfg = workspace.getConfiguration("language-hsp3");
  private outcha: OutputChannel;

  constructor() {
    this.outcha = window.createOutputChannel("HSP (legacy extension)", "hsp3");
    this.subscription.push(
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("language-hsp3"))
          this.cfg = workspace.getConfiguration("language-hsp3");
      }),
    );
  }

  public dispose() {
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
      this.outcha.show(true)
      return undefined;
    } else if (!(index in paths)) {
      this.outcha.appendLine(`Profile "${index}" settings not found.`);
      this.outcha.show(true);
      return undefined;
    }
    try {
      return schema.parse(paths)[index];
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.log(e);
        this.outcha.appendLine("Profile Validation Error.");
        this.outcha.appendLine(e.issues.map((v) => v.message).join("\n"));
        this.outcha.show(true);
      }
      return undefined;
    }
  }

  private get compiler(): string | undefined {
    const profile = this.profile();
    if (profile) return profile.path;
    const compiler = this.cfg.get("compiler") as string | undefined;
    if (!compiler) window.showErrorMessage("compiler is not set.");
    return compiler;
  }

  private get helpman():
    | { mode: "local" | "online"; path: string }
    | undefined {
    const mode = this.cfg.get("helpman.enable") as
      | "disable"
      | "local"
      | "online"
      | undefined;
    switch (mode) {
      case "local": {
        const profile = this.profile();
        if (profile) return { mode, path: profile.helpman };
        const helpman = this.cfg.get("helpman.path.local") as
          | string
          | undefined;
        if (helpman) return { mode, path: helpman };
        else break;
      }
      case "online": {
        const helpman = this.cfg.get("helpman.path.online") as string | undefined;
        if (helpman) return { mode, path: helpman };
        else break;
      }
    }
    return undefined;
  }

  private get hsp3root(): string | undefined {
    return undefined;
  }

  private async spawn(command: string, args: string[]) {
    // commandはいったん絶対パスへ
    // wineも考慮する
    const cwd = undefined;
    const env = process.env;
    if (this.cfg.get("useSetHSP3ROOT")) {
      this.hsp3root;
    }
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false, cwd, env });
      child;
    });
  }

  public execution = {
    run: () => {
      console.log("run(legacy)");
      console.log(this.compiler);
      console.log(this.helpman);
    },
    make: () => {
      const compiler = this.compiler;
      if (!compiler) return;
    },
    helpman: () => {
      const helpman = this.helpman;
      if (!helpman) return;
    },
  };
}
