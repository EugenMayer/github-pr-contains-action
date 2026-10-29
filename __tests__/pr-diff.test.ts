/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import parseDiff from 'parse-diff'
import { checkPrDiff } from '../src/pr-diff'
import * as core from '@actions/core'

function getChunk(content: string): parseDiff.Chunk {
  return {
    content,
    changes: [
      {
        type: 'add',
        add: true,
        ln: 1,
        content
      }
    ],
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1
  }
}

const filesContaining: parseDiff.File[] = [
  {
    from: 'file.txt',
    to: 'file.txt',
    chunks: [getChunk('anything else')],
    additions: 5,
    deletions: 0
  },
  {
    from: './.workflows/offending.txt',
    to: './.workflows/offending.txt',
    chunks: [getChunk('something  else'), getChunk('anything "0.0.0-foo-SNAPSHOT" else')],
    additions: 5,
    deletions: 0
  }
]

const filesNotContaining: parseDiff.File[] = [
  {
    from: 'file.txt',
    to: 'file.txt',
    chunks: [getChunk('anything else')],
    additions: 5,
    deletions: 0
  },
  {
    from: 'other.txt',
    to: 'other.txt',
    chunks: [getChunk('something  else'), getChunk('else')],
    additions: 5,
    deletions: 0
  }
]

// Mock the GitHub Actions core library
let setFailedMock: jest.SpyInstance
let setInfoMock: jest.SpyInstance
// Mock the action's entrypoint
describe('diffContainsRule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setInfoMock = jest.spyOn(core, 'info').mockImplementation()
  })

  const regexpRule = '^[^/]*"(0.0.0-.*-SNAPSHOT).*"'

  it('should find', async () => {
    checkPrDiff(filesContaining, regexpRule, '')
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('should not find', async () => {
    checkPrDiff(filesNotContaining, regexpRule, '')
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('should allow to exclude file', async () => {
    // even though our files contains an offending string, the file doing so is excluded
    checkPrDiff(filesContaining, '', regexpRule, { filesToExclude: ['./.workflows/offending.txt'] })
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(setInfoMock).toHaveBeenCalled()
  })

  it('should allow to exclude file by glob', async () => {
    checkPrDiff(filesContaining, '', regexpRule, { filesToExclude: ['**/*.txt'] })
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('should fail when finding a forbidden string even if the required string was found before', async () => {
    checkPrDiff(filesContaining, 'anything else', regexpRule)
    expect(setFailedMock).toHaveBeenCalledTimes(1)
  })
})

function getFile(path: string, lines: string[], isNew = false): parseDiff.File {
  return {
    from: isNew ? '/dev/null' : path,
    to: path,
    chunks: lines.map(line => getChunk(`+${line}`)),
    additions: lines.length,
    deletions: 0
  }
}

describe('kotlin assert rule', () => {
  let setOutputMock: jest.SpyInstance
  let warningMock: jest.SpyInstance
  beforeEach(() => {
    jest.clearAllMocks()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    jest.spyOn(core, 'info').mockImplementation()
    jest.spyOn(core, 'exportVariable').mockImplementation()
    warningMock = jest.spyOn(core, 'warning').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  const rule = '\\bassert\\('
  const options = { filesToInclude: ['**/*.kt'], ignoreComments: true }

  it('should report all offending lines in included files', async () => {
    const files = [
      getFile('src/main/kotlin/Foo.kt', ['    assert(x > 0)', 'val y = 1', 'assert(y)']),
      getFile('src/main/kotlin/Bar.kt', ['  assert(true)'], true)
    ]
    checkPrDiff(files, '', rule, options)
    expect(setFailedMock).toHaveBeenCalledTimes(1)
    expect(warningMock).toHaveBeenCalledTimes(3)
    expect(setOutputMock).toHaveBeenCalledWith('diff', '+    assert(x > 0)\n+assert(y)\n+  assert(true)')
  })

  it('should only check included files', async () => {
    const files = [getFile('.github/workflows/check.yml', ["diffDoesNotContain: '\\bassert\\('"]), getFile('Foo.java', ['assert(x)'])]
    checkPrDiff(files, '', rule, options)
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('should ignore comments', async () => {
    const files = [
      getFile('Foo.kt', ['val x = 1 // assert(x)', '// assert(x)', '/* assert(x) */', ' * assert(x)', '  */'])
    ]
    checkPrDiff(files, '', rule, options)
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('should not ignore comments by default', async () => {
    checkPrDiff([getFile('Foo.kt', ['// assert(x)'])], '', rule, { filesToInclude: ['**/*.kt'] })
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('should not match words ending with assert', async () => {
    checkPrDiff([getFile('Foo.kt', ['softAssert(x)', 'myassert(x)'])], '', rule, options)
    expect(setFailedMock).not.toHaveBeenCalled()
  })
})
