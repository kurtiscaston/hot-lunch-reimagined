/** Move focus to the missed-cutoff line only when it was inside that order form. */
export function shouldFocusMissedCutoff(
  form: { contains(node: Node): boolean } | null,
  active: Node | null,
): boolean {
  if (!form || !active) {
    return false;
  }
  return form.contains(active);
}
