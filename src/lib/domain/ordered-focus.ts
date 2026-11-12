/** Focus the new order line only after this form submitted it. */
export function shouldFocusOrderedLine(justSubmitted: boolean, hasOrder: boolean): boolean {
  return justSubmitted && hasOrder;
}
