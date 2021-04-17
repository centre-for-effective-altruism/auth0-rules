import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

/**
 * Sometimes it's useful to be able to see what information is currently in the
 * context object at runtime. If this rule is enabled, it will print the current
 * values of the `context` and `user` args to console, which can be viewed by
 * connecting the Auth0 `Realtime Webtask Logs` extension to the tenant
 */
function logContext(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): void {
  console.log(`==== Rule context: ====`)
  console.log(context)
  console.log(`==== Rule user: ====`)
  console.log(user)
  return callback(null, user, context)
}
