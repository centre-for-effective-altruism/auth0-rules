import {
  DefaultPostLoginApi,
  DefaultPostLoginEvent,
} from '../types/auth0-actions'
import { ManagementClient, Permission } from 'auth0'

const auth0Sdk = require('auth0')

// basic OAuth 2.0 scopes that any client is allowed to request
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'offline_access']
// whitelist of scopes accessible to applications that aren't on the application whitelist
// (currently empty, but we may expand it in future...)
const SCOPE_WHITELIST: string[] = []

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
exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  // Skip if the analogous Rule was executed first. You can get these IDs from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules), separate values are for dev, staging and prod
  const rules = api.rules
  if (
    rules.wasExecuted('rul_iFouQc7sxIAebmG9') ||
    rules.wasExecuted('rul_ytSv3P9tcJqlXDLG') ||
    rules.wasExecuted('rul_Bwm6gas2fMgn02xq')
  ) {
    return
  }

  // Whitelist of applications that can access the full set of scopes
  const applicationWhitelist: string[] = TEMPLATE_DATA.whitelist

  // Set up a management client so that we can read the user's full set of permissions
  const ManagementClient = auth0Sdk.ManagementClient
  const management: ManagementClient = new ManagementClient({
    domain: event.secrets.AUTH0_DOMAIN,
    clientId: event.secrets.AUTH0_CLIENT_ID,
    clientSecret: event.secrets.AUTH0_CLIENT_SECRET,
    scope: 'read:roles',
  })

  // Function to page through all of a user's permissions
  const RESULTS_PER_PAGE = 20 // max is 25 (unconfirmed)
  async function getUserPermissions(
    userId: string,
    page = 0
  ): Promise<Permission[]> {
    const results = (
      await management.users.getPermissions({
        id: userId,
        page,
        per_page: RESULTS_PER_PAGE,
      })
    ).data
    // If we're on the last page, get out of here
    if (results.length < RESULTS_PER_PAGE) return results
    // Otherwise, get the next set of results too
    const nextResults = await getUserPermissions(userId, page + 1)
    return [...results, ...nextResults]
  }

  // get the user's canonical set of permissions
  const userPermissions = await getUserPermissions(event.user?.user_id!)

  const userScopes = userPermissions.map(
    (permissionObj) => permissionObj.permission_name!
  )

  // scopes that the client application has requested on behalf of the user
  const requestedScopes: string[] =
    event.transaction?.requested_scopes ||
    event.request?.body.scope.split(' ') ||
    []

  // get a list of the whitelisted scopes that the user has access to
  const allowedUserScopes = SCOPE_WHITELIST.filter((scope) =>
    userScopes.includes(scope)
  )

  // final list of all allowed scopes
  const allowedScopes = applicationWhitelist.includes(event.client?.clientId!)
    ? [...DEFAULT_SCOPES, ...userScopes]
    : [...DEFAULT_SCOPES, ...allowedUserScopes]

  const removedScopes = requestedScopes.filter(
    (s) => !allowedScopes.includes(s)
  )

  for (const scope of removedScopes) {
    api.accessToken.removeScope(scope)
  }
}
