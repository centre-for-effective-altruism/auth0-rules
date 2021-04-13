import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'

async function testRule(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  console.log('Test function called')
  callback(null, user, context)
}
