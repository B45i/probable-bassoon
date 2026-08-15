/** First letter of the first two "words" (split on `segmentPattern`), or the first two
 * characters if there's only one word — the same rule an email's local-part and a
 * site's name both want, just with different word boundaries. */
export function initials(text: string, segmentPattern: RegExp = /\s+/): string {
  const segments = text.trim().split(segmentPattern).filter(Boolean)
  const chars = segments.length > 1 ? segments.slice(0, 2).map((segment) => segment[0]) : [...text.slice(0, 2)]
  return chars.join("").toUpperCase()
}
