import { generateCode, getAllActions, printCodeDiff } from '../../lib/utils'
import { Change, diffLines } from 'diff'
import { ACTION_MANIFEST } from '../../manifests'
import { GetActions200ResponseActionsInner as Action } from 'auth0'
import { cyan, green, grey, magenta, red } from 'chalk'

type DiffPair = [ActionDefinition, Action | undefined]

// TODO:
// - [X] Write rudimentary deploy script to get log-context working end to end
//   - [X] Create or update action
//   - [X] Deploy or not based on `enabled`
//   - [X] Attach to trigger
//   - [X] Test, get it to log something
// - [ ] Handle secrets
// - [ ] Handle ordering
// - [ ] Write our own types for actions
// - [ ] Add info about enabled/disabled state to diff script

export default async function run() {
  const actions = await getAllActions()
  // Match actions in the manifest to existing Auth0 actions
  const matches: DiffPair[] = ACTION_MANIFEST.map((actionDef) => [
    actionDef,
    actions.find((action) => actionDef.name === action.name),
  ])
  // Actions that exist on Auth0 but are not defined in the manifest
  const extras: Action[] = actions.filter((action) =>
    ACTION_MANIFEST.every((actionDef) => actionDef.name !== action.name)
  )
  const diffs: [ActionDefinition, Change[]][] = []
  const missingActions: ActionDefinition[] = []

  // generate the diffs
  for (const [actionDef, action] of matches) {
    if (!action?.code) {
      missingActions.push(actionDef)
      continue
    }
    const script = await generateCode(actionDef, 'actions')
    diffs.push([actionDef, diffLines(action.code, script)])
  }
  // print the diffs
  const upToDateActions = printCodeDiff(diffs, 'actions')
  if (upToDateActions.length) {
    console.log(`\n[[ Up-to-date actions ]]`)
    console.log(
      grey(
        `${
          upToDateActions.length === ACTION_MANIFEST.length
            ? 'All'
            : upToDateActions.length
        } actions defined in the manifest are identical to those that exist on the Auth0 tenant:`
      )
    )
    console.log(
      `${upToDateActions.map((action) => `- ${cyan(action.name)}`).join('\n')}`
    )
  }

  if (missingActions.length) {
    console.log(`\n[[ Missing actions ]]`)
    console.log(
      grey(
        `${missingActions.length} actions defined in the manifest do not exist on the Auth0 tenant:`
      )
    )
    console.log(
      `${missingActions
        .map((action) => `- ${magenta(action.name)}`)
        .join('\n')}`
    )
  }

  if (extras.length) {
    console.log(`\n[[ Extra actions ]]`)
    console.log(
      grey(
        `${extras.length} actions exist on the Auth0 tenant that are not included in the manifest:`
      )
    )
    console.log(
      `${extras.map((action) => `- ${magenta(action.name)}`).join('\n')}`
    )
  }
}
