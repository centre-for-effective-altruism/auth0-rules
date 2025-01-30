import {
  DefaultPostLoginApi,
  DefaultPostLoginEvent,
} from '../types/auth0-actions'

/**
 * Sometimes it's useful to be able to see what information is currently in the
 * context object at runtime. If this rule is enabled, it will print the current
 * values of the `context` and `user` args to console, which can be viewed by
 * connecting the Auth0 `Realtime Webtask Logs` extension to the tenant
 */
exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  // Log the context and user information
  console.log(`==== Action context: ====`)
  console.log(event)
  console.log(`==== Action user: ====`)
  console.log(event.user)
}
