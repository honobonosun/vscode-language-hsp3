import z from "zod";

// Zodスキーマの定義
const ExecutorSchema = z.object({
  enable: z.boolean(),
  index: z.string(),
  paths: z.record(
    z.object({
      hide: z.boolean().optional(),
      path: z.string(),
      encoding: z.string(),
      buffer: z.number(),
      commands: z
        .object({
          run: z.array(z.string()),
          make: z.array(z.string()),
        })
        .and(z.record(z.array(z.string()))), // その他のコマンドも許可
      helpman: z.string(),
    })
  ),
});

// Zodから型を推論
export type ExecutorType = z.infer<typeof ExecutorSchema>;

export function validate(executor: unknown): ExecutorType | string {
  try {
    return ExecutorSchema.parse(executor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // zodを使ったメッセージに加工する。
      const messages = error.errors.map(
        (err) =>
          `[language-hsp3.executor.${err.path.join(".")}]: "${err.message}"`
      );
      return `設定の検証に失敗しました\n${messages.join("\n")}`;
    }
    if (error instanceof Error) return error.message;
    throw error; // ここまで来たらどうしようもないので、そのまま投げる。
  }
}
