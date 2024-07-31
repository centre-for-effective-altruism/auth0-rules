import { generateCode, paginateNestedQuery } from '../../lib/utils'
import auth0 from '../../lib/client'
import { ACTION_MANIFEST } from '../../manifests'
import { red, green } from 'chalk'
import { exit } from 'process'
import { getAllActions } from '../../lib/utils'
import {
  GetActions200ResponseActionsInner as Action,
  PatchBindingsRequestBindingsInnerOneOf,
} from 'auth0'

async function ensureTriggerBindingState({
  bindingName,
  actionId,
  triggerId,
  bound,
}: {
  bindingName: string
  actionId: string
  triggerId: string
  bound: boolean
}) {
  const prevTriggerBindings = await paginateNestedQuery(
    auth0.actions.getTriggerBindings.bind(auth0.actions, {
      triggerId,
    }),
    'bindings'
  )()

  const prevBoundState = prevTriggerBindings.some(
    (tb) => tb.action.id === actionId
  )

  if (prevBoundState === bound) {
    console.log(
      `Action ${
        bound ? 'enabled' : 'disabled'
      }: No need to update trigger binding state ${green(`\u2713`)}`
    )
    return
  }

  const prevTriggerBindingsUpdateFormat: PatchBindingsRequestBindingsInnerOneOf[] =
    prevTriggerBindings.map((tb) => ({
      display_name: tb.display_name,
      ref: {
        type: 'action_id',
        value: tb.action.id,
      },
    }))

  // TODO enforce ordering
  if (bound) {
    await auth0.actions.updateTriggerBindings(
      { triggerId },
      {
        bindings: [
          ...prevTriggerBindingsUpdateFormat,
          {
            display_name: bindingName,
            ref: {
              type: 'action_id',
              value: actionId,
            },
          },
        ],
      }
    )
    console.log(`Action enabled: Trigger binding added ${green(`\u2713`)}`)
  } else {
    await auth0.actions.updateTriggerBindings(
      { triggerId },
      {
        bindings: prevTriggerBindingsUpdateFormat.filter(
          (tb) => tb.ref.value !== actionId
        ),
      }
    )
    console.log(`Action disabled: Trigger binding removed ${green(`\u2713`)}`)
  }
}

async function deployAction({
  actionDef,
  existingActions,
}: {
  actionDef: ActionDefinition
  existingActions: Action[]
}) {
  const script = await generateCode(actionDef, 'actions')
  const existingAction = existingActions.find(
    (existing) => existing.name === actionDef.name
  )

  const actionPayload = {
    name: actionDef.name,
    code: script,
    supported_triggers: [
      { id: actionDef.trigger, version: actionDef.triggerVersion },
    ],
  }
  const updateEnabled = async (actionId: string) =>
    ensureTriggerBindingState({
      bindingName: `${actionDef.name}_${actionDef.trigger}`,
      triggerId: actionDef.trigger,
      actionId,
      bound: actionDef.enabled,
    })

  // If end state is disabled, disable before updating
  if (!actionDef.enabled && existingAction) {
    await updateEnabled(existingAction.id)
  }

  const createOrUpdateAction = async () => {
    if (existingAction) {
      await auth0.actions.update({ id: existingAction.id }, actionPayload)
      console.log(`Action updated ${green(`\u2713`)}`)
      return existingAction.id
    } else {
      const createActionResponse = await auth0.actions.create(actionPayload)
      console.log(`Action created ${green(`\u2713`)}`)
      return createActionResponse.data.id
    }
  }
  const actionId = await createOrUpdateAction()

  await auth0.actions.deploy({ id: actionId })
  console.log(`Action deployed ${green(`\u2713`)}`)

  // If end state is enabled, enable after updating
  if (actionDef.enabled) {
    await updateEnabled(actionId)
  }
}

export default async function run() {
  try {
    const actions = await getAllActions()
    for (const actionDef of ACTION_MANIFEST) {
      await deployAction({ actionDef: actionDef, existingActions: actions })
    }
  } catch (err) {
    console.error(red((err as Error).message))
    exit(1)
  }
}
