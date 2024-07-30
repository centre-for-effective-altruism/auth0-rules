import { PostLoginEvent, PostLoginApi } from 'auth0-actions'

/**
 * Sometimes it's useful to be able to see what information is currently in the
 * context object at runtime. If this rule is enabled, it will print the current
 * values of the `context` and `user` args to console, which can be viewed by
 * connecting the Auth0 `Realtime Webtask Logs` extension to the tenant
 *
 * @param {Event} event - Details about the user and the context in which they
 *   are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the
 *   behavior of the login.
 */
exports.onExecutePostLogin = async (
  event: PostLoginEvent<any, any, any, any>,
  api: PostLoginApi
) => {
  /**
   * Skip if the analogous Rule was executed first. You can get this ID from the Rules
   * page in the Auth0 dashboard (https://manage.auth0.com/#/rules)
   */
  // @ts-ignore
  if (api.rules.wasExecuted('rul_3YxacLKiymV7HNa5')) {
    return
  }
  // Log the context and user information
  console.log(`==== Action context: ====`)
  console.log(event)
  console.log(`==== Action user: ====`)
  console.log(event.user)
}
