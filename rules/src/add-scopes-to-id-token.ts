import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

function addScopesToIdToken(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
) {
  const requiredApplications = ['{{{whitelist}}}']
  // only run if our application is on the list
  if (requiredApplications.includes(context.clientID)) {
    const namespace = 'https://parfit.effectivealtruism.org'
    context.idToken[`${namespace}/scope`] = context.accessToken.scope.join(' ')
  }

  callback(null, user, context)
}
