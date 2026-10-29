/**
 * Strips C-style comments (`//`, `/*`, `*`) from a single line of code.
 * Returns null if the whole line is a comment and should not be checked at all.
 *
 * This is line based and intentionally simple: `//` inside string literals (e.g. URLs) is treated as a comment too.
 */
export function stripComments(line: string): string | null {
  const withoutTrailingComment = line.replace(/\/\/.*$/, '')
  if (/^\s*(\*|\/\*)/.test(withoutTrailingComment)) {
    return null
  }
  return withoutTrailingComment
}
