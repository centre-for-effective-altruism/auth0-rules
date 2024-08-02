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
  // Skip if the analogous Rule was executed first. You can get this ID from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules)
  if (api.rules.wasExecuted('rul_p0EQTFpeLGeLw1DP')) {
    return
  }

  if (!event.authorization) return

  const namespace = TEMPLATE_DATA.namespace
  const email = event.user!.email
  const emailVerified = event.user!.email_verified

  if (event.authorization) {
    api.accessToken.setCustomClaim(`${namespace}/email`, email)
    api.accessToken.setCustomClaim(`${namespace}/email_verified`, emailVerified)
  }
}
