import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

import type { PostLoginEvent } from 'auth0-actions'

// TODO types
/**
 * Sometimes it's useful to be able to see what information is currently in the
 * context object at runtime. If this rule is enabled, it will print the current
 * values of the `context` and `user` args to console, which can be viewed by
 * connecting the Auth0 `Realtime Webtask Logs` extension to the tenant
 */
const onExecutePostLogin = async (event: any, api: any) => {
  console.log(`==== Action event: ====`)
  console.log(event)
  console.log(`==== Action user: ====`)
  console.log(event.user)
}
