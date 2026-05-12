/** Forma mínima compatible con `ZodError` (sin dependencia runtime de zod). */
export type ZodIssuesLike = {
  readonly issues: ReadonlyArray<{
    readonly path: ReadonlyArray<string | number>;
    readonly message: string;
  }>;
};

export function formatZodIssues(err: ZodIssuesLike): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}
