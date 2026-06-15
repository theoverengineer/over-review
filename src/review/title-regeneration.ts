/**
 * PR title regeneration helpers.
 * @packageDocumentation
 */

export function shouldRegenerateTitle(currentTitle: string): boolean {
  return currentTitle.toLowerCase().includes('@overreview');
}
