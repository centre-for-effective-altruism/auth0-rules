import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

/**
 * Single Page Applications don't have an easy way to inspect which scopes are
 * present on the Access Token. The Access Token should be treated as an opaque
 * string (even though it's technically possible to decode it if it's a JWT).
 * Instead, we should place any data that's supposed to be accessible to the
 * application into the ID Token.
 *
 * We restrict this to the subset of applications that are in fact SPA's, as
 * other applications may use cookies to store Auth0 sessions, and adding a lot
 * of scopes to the ID Token (which will also by necessity be added to the
 * Access Token) will significantly increase cookie size (which may cause failed
 * HTTP requests – total HTTP headers should be smaller than 8kb).
 */
function addScopesToIdToken(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
) {
  const requiredApplications: string[] = TEMPLATE_DATA.whitelist
  // only run if our application is on the list
  if (requiredApplications.includes(context.clientID)) {
    const namespace: string = TEMPLATE_DATA.namespace
    context.idToken[`${namespace}/scope`] = context.accessToken.scope.join(' ')
  }

  callback(null, user, context)
}
