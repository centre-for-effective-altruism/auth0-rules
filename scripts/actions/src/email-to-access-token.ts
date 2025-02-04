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
  const namespace = TEMPLATE_DATA.namespace
  const email = event.user.email
  const emailVerified = event.user.email_verified

  api.accessToken.setCustomClaim(`${namespace}/email`, email)
  api.accessToken.setCustomClaim(`${namespace}/email_verified`, emailVerified)
}
