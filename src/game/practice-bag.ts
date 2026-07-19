export function avoidImmediatePracticeRepeat(
  ids: readonly string[],
  previousAnswerId?: string,
): string[] {
  const result = [...ids]
  if (!previousAnswerId || result[0] !== previousAnswerId) return result

  const swapIndex = result.findIndex((id, index) => index > 0 && id !== previousAnswerId)
  if (swapIndex < 1) return result

  const first = result[0]
  const swap = result[swapIndex]
  if (first && swap) {
    result[0] = swap
    result[swapIndex] = first
  }
  return result
}
