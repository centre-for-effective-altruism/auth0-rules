import {
  DefaultPostLoginApi,
  DefaultPostLoginEvent,
} from '../types/auth0-actions'

/**
 * Some server-side applications need access to the user's email address. This
 * rule adds the user's email address and verification status to the Access Token
 */
exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  // Skip if the analogous Rule was executed first. You can get these IDs from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules). Separate values are for dev, staging and prod
  const rules = api.rules
  if (
    rules.wasExecuted('rul_p0EQTFpeLGeLw1DP') ||
    rules.wasExecuted('rul_f067BwtcAm0kJ4DN') ||
    rules.wasExecuted('rul_8l8h1CJpOp1tRVRP')
  ) {
    return
  }

  const namespace = TEMPLATE_DATA.namespace
  const email = event.user.email
  const emailVerified = event.user.email_verified

  api.accessToken.setCustomClaim(`${namespace}/email`, email)
  api.accessToken.setCustomClaim(`${namespace}/email_verified`, emailVerified)
}
