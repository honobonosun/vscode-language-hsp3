import * as vscode from "vscode";
import Config from "../common/config";
import { tokenizer } from "./hsp/lexer";
import { parse, kinds, IOutlineElement } from "./hsp/parser";
import createConfig from "../common/config";
import { EXTENSION_ID } from "../common/constant";

/**
 * outlineに表示するiconをkindの種類から決定して返します。
 * @param kind 種類
 */
function symbolKind(kind: kinds): vscode.SymbolKind {
  switch (kind) {
    case kinds.label:
      return vscode.SymbolKind.Key;
    case kinds.module:
      return vscode.SymbolKind.Class;
    case kinds.define:
      return vscode.SymbolKind.Object;
    case kinds.const:
      return vscode.SymbolKind.Constant;
    case kinds.enum:
      return vscode.SymbolKind.Enum;
    case kinds.deffunc:
    case kinds.defcfunc:
    case kinds.modfunc:
    case kinds.modcfunc:
    case kinds.modterm:
    case kinds.func:
    case kinds.cfunc:
    case kinds.cmd:
      return vscode.SymbolKind.Method;
    case kinds.modinit:
      return vscode.SymbolKind.Constructor;
    default:
      return vscode.SymbolKind.String;
  }
}

export default class Outline implements vscode.Disposable {
  public provider: undefined | vscode.Disposable;
  private masks: string[] = [];
  private config;

  constructor() {
    this.config = createConfig(EXTENSION_ID);
  }

  public dispose(): void {
    if (this.provider) {
      this.provider.dispose();
    }
  }

  public create(): void {
    this.provider = vscode.languages.registerDocumentSymbolProvider(
      { scheme: "file", language: "hsp3" },
      { provideDocumentSymbols: this.provideDocumentSymbols.bind(this) }
    );
  }

  public update(): void {
    this.masks = this.config.get("outline.masks") as string[];
    if (this.config.get("outline.enable") && !this.provider) {
      this.create();
    } else if (!this.config.get("outline.enable") && this.provider) {
      this.provider.dispose();
      this.provider = undefined;
    }
  }

  private provideDocumentSymbols(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentSymbol[]> {
    return new Promise((resolve) => {
      const result: vscode.DocumentSymbol[] = [];

      const tokens = tokenizer(document.getText());
      //console.log("tokenizer", tokens);

      const parsed = parse(tokens);
      //console.log("parsed", parsed);

      if (!parsed.success) {
        return resolve([]);
      }

      const position = {
        begin: (i: number): vscode.Position => {
          const { begin } = tokens[i].location;
          return new vscode.Position(begin.row, begin.column);
        },
        end: (i: number): vscode.Position => {
          const { end } = tokens[i].location;
          return new vscode.Position(end.row, end.column);
        },
      };

      const range = {
        entire: (elm: IOutlineElement): vscode.Range =>
          new vscode.Range(
            position.begin(elm.position.entire[0]),
            position.end(elm.position.entire[1])
          ),
        literal: (elm: IOutlineElement): vscode.Range =>
          new vscode.Range(
            position.begin(elm.position.literal[0]),
            position.end(elm.position.literal[1])
          ),
      };

      const documentSymbol = (elm: IOutlineElement): vscode.DocumentSymbol =>
        new vscode.DocumentSymbol(
          elm.literal,
          elm.kind,
          symbolKind(elm.kind),
          range.entire(elm),
          range.literal(elm)
        );

      const merge = (
        group: vscode.Range,
        elm: IOutlineElement
      ): vscode.Range => {
        const beginRange = group;
        return new vscode.Range(
          beginRange.start,
          position.end(elm.position.literal[1])
        );
      };

      let group: vscode.DocumentSymbol | undefined = undefined;
      for (const elm of parsed.result as IOutlineElement[]) {
        if (group) {
          if (elm.kind === kinds.global) {
            group.range = merge(group.range, elm);
            result.push(group);
            group = undefined;
          } else {
            if (elm.kind === kinds.module) {
              continue;
            } // モジュール入れ子は除外
            if (this.masks.find((v) => v === elm.kind)) {
              continue;
            } // this.masks にあるなら除外
            group.children.push(documentSymbol(elm));
          }
        } else {
          if (elm.kind === kinds.module) {
            group = documentSymbol(elm);
          } else {
            // 除外リスト this.masksと構文的に存在しちゃダメなものたち
            if (
              this.masks
                .concat([
                  kinds.global,
                  kinds.modinit,
                  kinds.modterm,
                  kinds.modfunc,
                  kinds.modcfunc,
                ])
                .find((v) => v === elm.kind)
            ) {
              continue;
            }
            result.push(documentSymbol(elm));
          }
        }
      }

      //console.log("result", result);
      resolve(result);
    });
  }
}
