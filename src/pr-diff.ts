import parseDiff from 'parse-diff'
import * as core from '@actions/core'
import { checkContains } from './utils/regexp'
import { matchesAnyGlob } from './utils/glob'
import { stripComments } from './utils/comments'

export interface DiffCheckOptions {
  // exact paths or globs of files to skip
  filesToExclude?: string[]
  // exact paths or globs of files to check, if empty all files are checked
  filesToInclude?: string[]
  // ignore C-style comments (`//`, `/*`, `*`) in added lines
  ignoreComments?: boolean
}

export function checkPrDiff(
  filesChanged: parseDiff.File[],
  diffMustContainRule: string,
  diffShallNotContainRule: string,
  options: DiffCheckOptions = {}
): void {
  if (!(diffMustContainRule || diffShallNotContainRule)) {
    return
  }

  const { filesToExclude = [], filesToInclude = [], ignoreComments = false } = options

  if (diffMustContainRule) {
    core.info(`Checking diff contain to contain «${diffMustContainRule}»`)
  }
  if (diffShallNotContainRule) {
    core.info(`Checking diff content to NOT contain «${diffShallNotContainRule}»`)
  }

  let mustContainFound = false
  const offenders: string[] = []
  // Should test the regexp rules to the smallest possible payload, thus drill for the chunks.
  // This is the best way to avoid the regular expressions to run wild on too large diffs.
  for (const file of filesChanged) {
    const filePath = getFilePath(file)
    if (!isFileChecked(file, filesToInclude, filesToExclude)) {
      core.info(`Skipping file in diff check: ${filePath}`)
      continue
    }
    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (!('add' in change)) {
          continue
        }

        const content = getContentToCheck(change.content, ignoreComments)
        if (content === null) {
          continue
        }

        if (diffMustContainRule && checkContains(content, diffMustContainRule)) {
          mustContainFound = true
        }

        if (diffShallNotContainRule && checkContains(content, diffShallNotContainRule)) {
          offenders.push(change.content)
          core.warning(`Offending diff in file «${filePath}» line ${change.ln}: «${change.content}»`)
        }
      }
    }
  }

  if (offenders.length > 0) {
    core.setFailed(
      `The added code does contain «${diffShallNotContainRule}» in ${offenders.length} line(s) - this is not allowed`
    )
    core.exportVariable('diff', offenders.join('\n'))
    core.setOutput('diff', offenders.join('\n'))
  }

  if (diffMustContainRule && !mustContainFound) {
    // if a rule was provided but our file scan did not find it, the required string has not been found
    // in any changes. Thus, we need to fail
    core.setFailed(`The added code does not contain «${diffMustContainRule}» - this is required`)
  }
}

function getFilePath(file: parseDiff.File): string {
  // new files have `from` set to /dev/null, deleted files have `to` set to /dev/null
  return (file.to && file.to !== '/dev/null' ? file.to : file.from) ?? ''
}

function isFileChecked(file: parseDiff.File, filesToInclude: string[], filesToExclude: string[]): boolean {
  const paths = [file.from, file.to].filter((path): path is string => !!path && path !== '/dev/null')
  if (filesToInclude.length > 0 && !paths.some(path => matchesAnyGlob(path, filesToInclude))) {
    return false
  }
  return !paths.some(path => matchesAnyGlob(path, filesToExclude))
}

/**
 * Returns the content the rules should be checked against, or null if the line should be skipped.
 * The leading `+` of the diff line is kept, so rules behave the same with and without comment stripping.
 */
function getContentToCheck(content: string, ignoreComments: boolean): string | null {
  if (!ignoreComments) {
    return content
  }
  const code = stripComments(content.slice(1))
  return code === null ? null : content.charAt(0) + code
}
