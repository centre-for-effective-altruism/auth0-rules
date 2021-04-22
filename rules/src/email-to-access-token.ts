import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'

/**
 * Some server-side applications need access to the user's email address. This
 * rule adds the user's email address and verification status to the Access Token
 */
function addEmailToAccessToken(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): void {
  const namespace = TEMPLATE_DATA.namespace
  const accessToken = {
    ...context.accessToken,
    [`${namespace}/email`]: user.email,
    [`${namespace}/email_verified`]: user.email_verified,
  }

  context.accessToken = accessToken
  return callback(null, user, context)
}
