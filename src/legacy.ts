import { execFile, spawn } from "node:child_process";
import { dirname } from "node:path";
import {
  commands,
  Disposable,
  languages,
  LanguageStatusItem,
  LanguageStatusSeverity,
  OutputChannel,
  Range,
  window,
  workspace,
} from "vscode";
import { z } from "zod";
import { decodeStream } from "iconv-lite";
import * as readline from "readline";
import opener = require("opener");
import Outline from "./hsp/legacy/outline";

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
  private cfg = workspace.getConfiguration("language-hsp3");
  private outcha = window.createOutputChannel("language-hsp3 V1", "text");
  private profilebar: LanguageStatusItem | undefined;
  private profile: Profile | undefined;
  private outline = new Outline();

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
    else if (!index) {
      this.outcha.appendLine("Profile is unspecified.");
      this.outcha.show(true);
      return undefined;
    } else if (!Object.hasOwn(profiles, index)) {
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

    // outline
    this.outline.update(this.cfg);
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
    this.outline.dispose();
    if (this.profilebar) this.profilebar.dispose();
    this.subscription.forEach((el) => el.dispose());
  }

  private get useWine(): boolean {
    if (this.cfg.get("wineMode")) return true;
    else return false;
  }

  private get compiler(): string | undefined {
    if (this.profile) return this.profile.path;
    else return this.cfg.get("compiler");
  }

  private get encoding(): string | undefined {
    if (this.profile) return this.profile.encoding;
    else return this.cfg.get("encoding");
  }

  private getcwd(): string | undefined {
    const editor = window.activeTextEditor;
    if (!editor) return editor;
    if (this.cfg.get("choiceWorkDirCur")) {
      return workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath;
    } else {
      return dirname(editor.document.uri.fsPath);
    }
  }

  private get runcmdargs(): string[] | undefined {
    if (this.profile) return this.profile.commands.run;
    else return this.cfg.get("runCommands");
  }

  private get makecmdargs(): string[] | undefined {
    if (this.profile) return this.profile.commands.make;
    else return this.cfg.get("makeCommands");
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
        else break;
      }
      case "online": {
        const helpman = this.cfg.get("helpman.path.online") as
          | string
          | undefined;
        if (helpman) return { mode, path: helpman };
        else break;
      }
    }
    return undefined;
  }

  private async hsp3root(): Promise<string> {
    return commands.executeCommand<string>("toolset-hsp3.current.toString");
  }

  private async spawn(command: string, cmdargs: string[], cwd?: string | null) {
    const editor = window.activeTextEditor;
    if (!editor) return;
    if (!command) return;
    if (this.useWine) command = `wine ${command}`;
    if (!cmdargs) return;

    const hsp3dir = await this.hsp3root().catch((reason) => undefined);
    const encoding = this.encoding;
    if (!encoding) return;

    // TODO: winepath
    let filepath = editor.document.uri.fsPath;

    // set env
    const env = process.env;
    if (hsp3dir && this.cfg.get("useSetHSP3ROOT")) env["HSP3_ROOT"] = hsp3dir;

    // 特殊文字の対応（cmd.exeの環境変数展開を再現）
    const sc = new Map<string, string>(scbase);
    sc.set("filepath", filepath);
    if (hsp3dir) sc.set("hsp3root", hsp3dir);
    const regexp = /%(.*?)%/g;
    let args = cmdargs.map((el) =>
      el.replace(
        regexp,
        (body, key: string) => sc.get(key.toLowerCase()) ?? body,
      ),
    );

    // set cwd
    if (cwd === null) cwd = undefined;
    else if (cwd === undefined) cwd = this.getcwd();

    // TODO: Wine command

    // print command info
    this.outcha.appendLine(`set decode : "${encoding}"`);
    this.outcha.appendLine(`set cwd : "${cwd}"`);
    this.outcha.appendLine(
      `run command : "${command}" [${args.map((str) => `"${str}"`).join(" ")}]`,
    );
    this.outcha.show(true);

    // run command
    const shell = (this.cfg.get("useShell") as boolean) ?? true;
    const child = spawn(command, args, { cwd, shell, env });
    child.on("error", (err) => {
      this.outcha.appendLine(`spawn error : ${err.message}`);
      // todo 英語にも対応したいです。
      if ("code" in err && err.code === "ENOENT")
        this.outcha.appendLine(
          `  コマンド "${command}" の実行に失敗しました。`,
        );
      console.log("spawn error", err);
      return;
    });
    child.on("close", (code) =>
      this.outcha.appendLine(`exit code process: ${code}\n`),
    );
    const data = child.stdout.pipe(decodeStream(encoding));
    readline
      .createInterface(data)
      .on("line", (line) => this.outcha.appendLine(line));
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
          RegExp(
            "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)",
          ),
        );
        if (!range) return;
        return editor.document.getText(range);
      })();
      if (!word) return;

      const helpman = this.helpman;
      if (!helpman) return;
      else if (helpman.mode === "online")
        opener(helpman.path.replace("%s", encodeURIComponent(word)));
      else if (helpman.mode === "local") this.spawn(helpman.path, [word]);
    },
  };
}