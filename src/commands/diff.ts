import { generateRuleScript, getAllRules } from '../lib/utils'
import { Change, diffLines } from 'diff'
import MANIFEST from '../manifest'
import { Rule } from 'auth0'
import { cyan, green, grey, magenta, red, redBright } from 'chalk'
import { padEnd } from 'lodash'

type DiffPair = [RuleDefinition, Rule | undefined]

export default async function run() {
  const Rules = await getAllRules()
  // Match rules in the manifest to existing Auth0 rules
  const matches: DiffPair[] = MANIFEST.map((ruleDef) => [
    ruleDef,
    Rules.find((Rule) => ruleDef.name === Rule.name),
  ])
  // Rules that exist on Auth0 but are not defined in the manifest
  const extras: Rule[] = Rules.filter((Rule) =>
    MANIFEST.every((ruleDef) => ruleDef.name !== Rule.name)
  )
  const diffs: [RuleDefinition, Change[]][] = []
  const missingRules: RuleDefinition[] = []
  const upToDateRules: RuleDefinition[] = []
  // generate the diffs
  for (const [ruleDef, Rule] of matches) {
    if (!Rule?.script) {
      missingRules.push(ruleDef)
      continue
    }
    const script = await generateRuleScript(ruleDef)
    diffs.push([ruleDef, diffLines(Rule.script, script)])
  }
  // print the diffs
  let changesHeaderPrinted = false
  for (const [ruleDef, changes] of diffs) {
    if (changes.every((part) => !part.added || part.removed)) {
      upToDateRules.push(ruleDef)
      continue
    }
    if (!changesHeaderPrinted) {
      console.log(`[[ Changed rules ]]`)
      changesHeaderPrinted = true
    }
    const lineDelimiter = padEnd('-', ruleDef.name.length + 3, '-')
    console.log(`- ${cyan(ruleDef.name)}:`)
    console.log(lineDelimiter)
    for (const part of changes) {
      const changed = part.added || part.removed
      // add a space character to the beginning of unchanged lines to preserve
      // alignment when we add +/- chars
      const value = changed ? part.value : part.value.replace(/^(.)/gm, ' $1')
      const output = part.added
        ? green(`+${value}`)
        : part.removed
        ? redBright(`-${value}`)
        : grey(`${value}`)
      // we're writing character by character, so we do this by piping to
      // STDOUT directly rather than using console.log
      process.stderr.write(output)
    }
  }
  if (upToDateRules.length) {
    console.log(`\n[[ Up-to-date rules ]]`)
    console.log(
      grey(
        `${
          upToDateRules.length === MANIFEST.length
            ? 'All'
            : upToDateRules.length
        } rules defined in the manifest are identical to those that exist on the Auth0 tenant:`
      )
    )
    console.log(
      `${upToDateRules.map((Rule) => `- ${cyan(Rule.name)}`).join('\n')}`
    )
  }

  if (missingRules.length) {
    console.log(`\n[[ Missing rules ]]`)
    console.log(
      grey(
        `${missingRules.length} rules defined in the manifest do not exist on the Auth0 tenant:`
      )
    )
    console.log(
      `${missingRules.map((Rule) => `- ${magenta(Rule.name)}`).join('\n')}`
    )
  }

  if (extras.length) {
    console.log(`\n[[ Extra rules ]]`)
    console.log(
      grey(
        `${extras.length} rules exist on the Auth0 tenant that are not included in the manifest:`
      )
    )
    console.log(`${extras.map((Rule) => `- ${magenta(Rule.name)}`).join('\n')}`)
  }
}
