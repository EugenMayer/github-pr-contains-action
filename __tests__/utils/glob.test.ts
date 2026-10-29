import { globToRegExp, matchesAnyGlob } from '../../src/utils/glob'

describe('globToRegExp', () => {
  it('should match ** across directories', async () => {
    expect(globToRegExp('**/*.kt').test('Foo.kt')).toBeTruthy()
    expect(globToRegExp('**/*.kt').test('src/main/kotlin/Foo.kt')).toBeTruthy()
    expect(globToRegExp('**/*.kt').test('src/Foo.kts')).toBeFalsy()
    expect(globToRegExp('src/**').test('src/a/b.txt')).toBeTruthy()
  })

  it('should not match * across directories', async () => {
    expect(globToRegExp('*.kt').test('Foo.kt')).toBeTruthy()
    expect(globToRegExp('*.kt').test('src/Foo.kt')).toBeFalsy()
    expect(globToRegExp('src/?oo.kt').test('src/Foo.kt')).toBeTruthy()
  })

  it('should support braces and escape regexp characters', async () => {
    expect(globToRegExp('**/*.{kt,kts}').test('build.gradle.kts')).toBeTruthy()
    expect(globToRegExp('**/*.{kt,kts}').test('a/Foo.kt')).toBeTruthy()
    expect(globToRegExp('**/*.{kt,kts}').test('a/Foo.java')).toBeFalsy()
    expect(globToRegExp('a.txt').test('abtxt')).toBeFalsy()
  })
})

describe('matchesAnyGlob', () => {
  it('should match exact paths and ignore a leading ./', async () => {
    expect(matchesAnyGlob('.github/workflows/check.yml', ['./.github/workflows/check.yml'])).toBeTruthy()
    expect(matchesAnyGlob('./README.md', ['README.md'])).toBeTruthy()
    expect(matchesAnyGlob('README.md', [])).toBeFalsy()
  })
})
