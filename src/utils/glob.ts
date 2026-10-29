/**
 * Minimal glob matcher for file paths, supporting `**`, `*`, `?` and `{a,b}`.
 * `*` and `?` never match `/`, `**` matches across directories.
 */
export function globToRegExp(glob: string): RegExp {
  let regexp = ''
  let inGroup = false
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i]
    switch (char) {
      case '*':
        if (glob[i + 1] === '*') {
          if (glob[i + 2] === '/') {
            // `**/` matches zero or more directories
            regexp += '(?:.*/)?'
            i += 2
          } else {
            regexp += '.*'
            i += 1
          }
        } else {
          regexp += '[^/]*'
        }
        break
      case '?':
        regexp += '[^/]'
        break
      case '{':
        inGroup = true
        regexp += '(?:'
        break
      case '}':
        inGroup = false
        regexp += ')'
        break
      case ',':
        regexp += inGroup ? '|' : ','
        break
      default:
        regexp += char.replace(/[.+^$()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${regexp}$`)
}

function normalizePath(path: string): string {
  return path.replace(/^\.\//, '')
}

/**
 * Returns true if the path equals one of the patterns or matches one of them as a glob.
 */
export function matchesAnyGlob(path: string, patterns: string[]): boolean {
  const normalizedPath = normalizePath(path)
  return patterns.some(pattern => {
    const normalizedPattern = normalizePath(pattern)
    return normalizedPattern === normalizedPath || globToRegExp(normalizedPattern).test(normalizedPath)
  })
}
