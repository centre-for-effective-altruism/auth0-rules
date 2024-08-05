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
  // Skip if the analogous Rule was executed first. You can get these IDs from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules), separate values are for dev, staging and prod
  const rules = api.rules
  if (
    rules.wasExecuted('rul_3YxacLKiymV7HNa5') ||
    rules.wasExecuted('rul_Us5Wft14QwXvF2vE') ||
    rules.wasExecuted('rul_wNqx6pYqf7M2DHZo')
  ) {
    return
  }

  // Log the context and user information
  console.log(`==== Action context: ====`)
  console.log(event)
  console.log(`==== Action user: ====`)
  console.log(event.user)
}
