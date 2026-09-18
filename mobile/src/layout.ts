/**
 * Shared bottom chrome constants for tabbed screens.
 * Tab bar owns the home-indicator inset; list screens only need a breath gap.
 */
export const TAB_CONTENT_BOTTOM = 36;

export function screenPad(topInset: number, extraTop = 8) {
  return { paddingTop: topInset + extraTop };
}
