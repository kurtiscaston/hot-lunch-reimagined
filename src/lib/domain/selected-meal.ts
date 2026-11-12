/** Keep the chosen meal when it is still served. Otherwise use the first meal on the day. */
export function selectedMealId(currentId: string, itemIds: readonly string[]): string {
  if (itemIds.includes(currentId)) {
    return currentId;
  }
  return itemIds[0] ?? "";
}
