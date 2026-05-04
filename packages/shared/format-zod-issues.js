/**
 * @param {{ issues: ReadonlyArray<{ path: (string|number)[], message: string }> }} err
 */
export function formatZodIssues(err) {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
