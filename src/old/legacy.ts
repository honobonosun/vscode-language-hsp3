import { execFile, spawn } from "node:child_process";
import { dirname } from "node:path";
import * as readline from "readline";
import { decodeStream } from "iconv-lite";
import {
  Disposable,
  LanguageStatusItem,
  LanguageStatusSeverity,
  OutputChannel,
  Range,
  commands,
  languages,
  window,
  workspace,
} from "vscode";
import { z } from "zod";
import opener = require("opener");
import { error } from "node:console";
import { MY_CONFIG_SECTION, OUTCHA_NAME_EXEC } from "./constants";
import { winepath } from "./winepath";

const profileEl = z.object({
  hide: z.boolean(),
  path: z.string(),
  encoding: z.string(),
  buffer: z.number(),
  helpman: z.string(),
  commands: z.object({
    run: z.array(z.string()),
    make: z.array(z.string()),
  }),
});

const schema = z.record(profileEl);

type Profile = z.infer<typeof profileEl>;
type Profiles = z.infer<typeof schema>;

const scbase = new Map<string, string>();
for (const key of Object.keys(process.env)) {
  const val = process.env[key];
  if (val) scbase.set(key.toLowerCase(), val);
}

export default class Legacy implements Disposable {
  private subscription: Disposable[] = [];
  private cfg = workspace.getConfiguration(MY_CONFIG_SECTION);
  private outcha = window.createOutputChannel(OUTCHA_NAME_EXEC, "text");
  private profilebar: LanguageStatusItem | undefined;
  private profile: Profile | undefined;

  private executor = {
    use: () => this.cfg.get("executor.enable") as boolean | undefined,
    index: () => this.cfg.get("executor.index") as string | undefined,
    profiles: () => this.cfg.get("executor.paths") as Profiles | undefined,
  };

  private curProfile() {
    if (!this.executor.use()) return undefined;
    const profiles = this.executor.profiles();
    const index = this.executor.index();
    if (!profiles) return undefined;
    if (!index) {
      this.outcha.appendLine("Profile is unspecified.");
      this.outcha.show(true);
      return undefined;
    }
    if (!Object.hasOwn(profiles, index)) {
      this.outcha.appendLine(`Profile "${index}" settings not found.`);
      this.outcha.show(true);
      return undefined;
    }
    try {
      return schema.parse(profiles)[index];
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.log(["profiles ZodError", e]);
        this.outcha.appendLine("Profile Validation Error.");
        this.outcha.appendLine(
          e.issues
            .map((v) => `Profile ${v.path.join(".")} : ${v.message}`)
            .join("\n"),
        );
        this.outcha.show(true);
      }
      return undefined;
    }
  }

  private update() {
    // profile
    this.profile = this.curProfile();

    // profilebar
    if (!this.profilebar && this.executor.use()) {
      this.profilebar = languages.createLanguageStatusItem(
        "language-hsp3.profile",
        { language: "hsp3", scheme: "file" },
      );
      this.profilebar.detail = "current profile";
      this.profilebar.command = {
        command: "language-hsp3.changeOfExecutor",
        title: "Select",
      };
      //console.log("create langStatBar");
    } else if (this.profilebar && !this.executor.use()) {
      this.profilebar.dispose();
      //console.log("profilebar dispose.", this.profilebar);
      this.profilebar = undefined;
    }
    if (this.profilebar) {
      const index = this.executor.index();
      const profiles = this.executor.profiles();
      if (index && profiles && Object.hasOwn(profiles, index)) {
        if (this.profilebar.text !== index) this.profilebar.text = index;
        if (this.profilebar.severity !== LanguageStatusSeverity.Information)
          this.profilebar.severity = LanguageStatusSeverity.Information;
      } else {
        if (this.profilebar.text !== "none") this.profilebar.text = "none";
        if (this.profilebar.severity !== LanguageStatusSeverity.Error)
          this.profilebar.severity = LanguageStatusSeverity.Error;
      }
    }
  }

  constructor() {
    this.update();

    this.subscription.push(
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("language-hsp3")) {
          this.cfg = workspace.getConfiguration("language-hsp3");
          this.update();
        }
      }),
      commands.registerCommand("language-hsp3.changeOfExecutor", async () => {
        const profiles = this.executor.profiles();
        if (!profiles) {
          window.showErrorMessage(
            "language-hsp3.executor.paths is empty. Please fill in the necessary settings.",
          );
          return;
        }
        const sel = await window.showQuickPick(Object.keys(profiles));
        if (sel) this.cfg.update("executor.index", sel);
      }),
    );
  }

  public dispose() {
    this.outcha.dispose();
    if (this.profilebar) this.profilebar.dispose();
    for (const elm of this.subscription) elm.dispose();
  }

  private get useWine(): boolean {
    if (this.cfg.get("wineMode")) return true;
    return false;
  }

  private get compiler(): string | undefined {
    if (this.profile) return this.profile.path;
    return this.cfg.get("compiler");
  }

  private get encoding(): string | undefined {
    if (this.profile) return this.profile.encoding;
    return this.cfg.get("encoding");
  }

  private getcwd(): string | undefined {
    const editor = window.activeTextEditor;
    if (!editor) return editor;
    if (this.cfg.get("choiceWorkDirCur")) {
      return workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
    }
    return dirname(editor.document.uri.fsPath);
  }

  private get runcmdargs(): string[] | undefined {
    if (this.profile) return this.profile.commands.run;
    return this.cfg.get("runCommands");
  }

  private get makecmdargs(): string[] | undefined {
    if (this.profile) return this.profile.commands.make;
    return this.cfg.get("makeCommands");
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
        if (this.profile) return { mode, path: this.profile.helpman };
        const helpman = this.cfg.get("helpman.path.local") as
          | string
          | undefined;
        if (helpman) return { mode, path: helpman };
        break;
      }
      case "online": {
        const helpman = this.cfg.get("helpman.path.online") as
          | string
          | undefined;
        if (helpman) return { mode, path: helpman };
        break;
      }
    }
    return undefined;
  }

  private async hsp3root(): Promise<string> {
    return commands.executeCommand<string>("toolset-hsp3.current.toString");
  }

  private async spawn(
    p_command: string,
    p_cmdargs: string[],
    p_cwd?: string | null,
  ) {
    // 必要な情報を揃える。
    const encoding = this.encoding;
    if (!encoding) return;

    const editor = window.activeTextEditor;
    if (!editor) return;
    const filepath = await (async () => {
      if (this.useWine) {
        return (await winepath(["-w"], [editor.document.uri.fsPath]))[0];
      }
      return editor.document.uri.fsPath;
    })();

    const hsp3dir = await this.hsp3root().then(undefined, (reason) => {
      // todo : print error
      console.log(reason);
      return undefined;
    });
    // set env
    const env = process.env;
    if (hsp3dir && this.cfg.get("useSetHSP3ROOT")) env.HSP3_ROOT = hsp3dir;
    // 特殊文字の対応（cmd.exeの環境変数展開を再現）
    // WARN : Windowsの小文字大文字を区別しない仕様に合わせているので、Mac、Linux系で不都合に見舞われる恐れがあります。
    const sc = new Map<string, string>(scbase);
    sc.set("filepath", filepath);
    if (hsp3dir) sc.set("hsp3root", hsp3dir);
    const regexp = /%(.*?)%/g;
    const args = p_cmdargs.map((el) =>
      el.replace(
        regexp,
        (body, key: string) => sc.get(key.toLowerCase()) ?? body,
      ),
    );
    // set cwd
    let cwd = p_cwd;
    if (cwd === null)
      // set cwd
      cwd = undefined;
    else if (cwd === undefined) cwd = this.getcwd();

    // 外部プロセスを実行する。
    let command: string;
    if (this.useWine) {
      command = "wine";
      args.unshift(p_command);
    } else {
      command = p_command;
    }
    const option = { cwd, env };

    this.outcha.appendLine(` Run command: ${command} ${args.join(" ")}`);
    this.outcha.appendLine(` Decoder: ${encoding}`);

    const child = spawn(command, args, option);
    child.on("error", (err) => {
      if (err instanceof Error && "code" in err && err.code === "ENOENT")
        console.log(err);
      this.outcha.appendLine(err.message); // todo :issue #20 日本語で伝える
    });
    child.on("exit", (code) => {
      this.outcha.appendLine(` Exit code (${code})`);
    });
    readline
      .createInterface(child.stdout.pipe(decodeStream(encoding)))
      .on("line", (line) => this.outcha.appendLine(line));
    readline
      .createInterface(child.stderr.pipe(decodeStream(encoding)))
      .on("line", (line) => this.outcha.appendLine(`stderr: ${line}`));
  }

  public execution = {
    run: () => {
      const compiler = this.compiler;
      if (!compiler) {
        window.showErrorMessage("compiler is not set.");
        return;
      }
      const args = this.runcmdargs;
      if (!args) {
        window.showErrorMessage("run option is not set.");
        return;
      }
      this.spawn(compiler, args);
    },
    make: () => {
      const compiler = this.compiler;
      if (!compiler) {
        window.showErrorMessage("compiler is not set.");
        return;
      }
      const args = this.makecmdargs;
      if (!args) {
        window.showErrorMessage("run option is not set.");
        return;
      }
      this.spawn(compiler, args);
    },
    helpman: () => {
      const word = (() => {
        const editor = window.activeTextEditor;
        if (!editor) return;

        const selword = editor.document.getText(
          new Range(editor.selection.start, editor.selection.end),
        );
        if (selword !== "") return selword;

        const range = editor.document.getWordRangeAtPosition(
          editor.selection.start,
          /(-?\d*\.\d\w*)|([^\`\~\!\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/,
        );
        if (!range) return;
        return editor.document.getText(range);
      })();
      if (!word) return;

      const helpman = this.helpman;
      if (!helpman) return;
      if (helpman.mode === "online")
        opener(helpman.path.replace("%s", encodeURIComponent(word)));
      else if (helpman.mode === "local") this.spawn(helpman.path, [word]);
    },
  };
}
