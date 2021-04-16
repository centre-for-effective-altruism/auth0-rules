import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'
import { Permission } from 'auth0'

async function filterScopes(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  // Whitelist of applications that can access the full set of scopes
  const applicationWhitelist: string[] = TEMPLATE_DATA.whitelist

  // Set up a management client so that we can read the user's full set of permissions
  const ManagementClient = require('auth0@2.31.0').ManagementClient
  const management = new ManagementClient({
    domain: auth0.domain,
    clientId: configuration.AUTH0_CLIENT_ID,
    clientSecret: configuration.AUTH0_CLIENT_SECRET,
    scope: 'read:roles',
  })

  // Function to page through all of a user's permissions
  const RESULTS_PER_PAGE = 20 // max is 25 (unconfirmed)
  async function getUserPermissions(
    userId: string,
    page = 0
  ): Promise<Permission[]> {
    const results = await management.getUserPermissions({
      id: user.user_id,
      page,
      per_page: RESULTS_PER_PAGE,
    })
    // If we're on the last page, get out of here
    if (results.length < RESULTS_PER_PAGE) return results
    // Otherwise, get the next set of results too
    const nextResults = await getUserPermissions(userId, page + 1)
    return [...results, ...nextResults]
  }

  // get the user's canonical set of permissions
  // see https://auth0.github.io/node-auth0/module-management.ManagementClient.html#getUserPermissions
  const userPermissions = await getUserPermissions(user.user_id)
  const userScopes = userPermissions.map(
    (permissionObj) => permissionObj.permission_name
  )
  // basic OAuth 2.0 scopes
  const defaultScopes = ['openid', 'profile', 'email', 'offline_access']

  // scopes that the application has requested for the user
  const requestedScopes = (
    context.request.body.scope ||
    context.request.query.scope ||
    ''
  ).split(' ')

  // whitelist of scopes accessible to applications that aren't on the application whitelist
  const scopeWhitelist: string[] = []
  // get a list of the whitelisted scopes that the user has access to
  const allowedUserScopes = scopeWhitelist.filter((scope) =>
    userScopes.includes(scope)
  )
  // final list of all allowed scopes
  const allowedScopes = applicationWhitelist.includes(context.clientID)
    ? // application on the whitelist, all user scopes allowed
      [...defaultScopes, ...userScopes]
    : // application not on the whitelist, only scopes on the scope whitelist allowed
      [...defaultScopes, ...allowedUserScopes]
  // final list of scopes to add to the access token
  const finalScopes = allowedScopes
    .filter((scope) => requestedScopes.includes(scope))
    .filter((a): a is string => !!a)
  // add scopes to the access token
  context.accessToken.scope = finalScopes
  // GTFO
  callback(null, user, context)
}
