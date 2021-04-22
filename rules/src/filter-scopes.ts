import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'
import { Permission } from 'auth0'

/**
 * Filters the scopes available on a user's access token, based on the
 * application they are using to log in.
 *
 * For applications on the whitelist, all scopes are allowed. Otherwise, the
 * rule only allows a restricted subset. This makes it easy for third party
 * applications to use our Auth0 system for authentication, without allowing
 * them to authorize resources that shouldn't be accessible outside of
 * first-party applications.
 *
 * Because we're manually editing the `accessToken.scopes` property, Auth0 will
 * no longer check that the user actually has the permissions that they are
 * requesting. Instead, we need to use the Management Client to get the
 * permissions attached to the user, and only include the union of <allowed
 * permissions> and <requested permissions> in the access token.
 */
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

  // basic OAuth 2.0 scopes that any client is allowed to request
  const defaultScopes = ['openid', 'profile', 'email', 'offline_access']

  // scopes that the client application has requested on behalf of the user
  const requestedScopes = (
    context.request.body.scope ||
    context.request.query.scope ||
    ''
  ).split(' ')

  // whitelist of scopes accessible to applications that aren't on the application whitelist
  // (currently empty, but we may expand it in future...)
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

  // final list of scopes to add to the access token, built by diffing
  // the list of allowed scopes against the requested scopes
  const finalScopes = allowedScopes
    .filter((scope) => requestedScopes.includes(scope))
    .filter((a): a is string => !!a)

  // add scopes to the access token
  context.accessToken.scope = finalScopes

  // GTFO
  callback(null, user, context)
}
