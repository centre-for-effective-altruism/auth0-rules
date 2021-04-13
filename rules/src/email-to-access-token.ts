import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'

function addEmailToAccessToken(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): void {
  // This rule adds the authenticated user's email address to the access token.

  const namespace = 'https://parfit.effectivealtruism.org/'
  const accessToken = {
    ...context.accessToken,
    [`${namespace}email`]: user.email,
    [`${namespace}email_verified`]: user.email_verified,
  }

  context.accessToken = accessToken
  return callback(null, user, context)
}
