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
 * 1. Filters the scopes available on a user's access token, based on the
 * application they are using to log in.
 * 2. Adds the requested scopes to the `idToken` so they are readable by applications
 *
 * 1. Filtering scopes:
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
 *
 * 2. Adding scopes to id token
 *
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
exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  const userId = event.user.user_id
  const clientId = event.client.client_id

  // Whitelist of applications that can access the full set of scopes
  const allowAllScopesWhitelist: string[] =
    TEMPLATE_DATA.allowAllScopesWhitelist

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
  const userPermissions = await getUserPermissions(userId)

  const userScopes = userPermissions
    .map((permissionObj) => permissionObj.permission_name)
    .filter((name): name is string => !!name)

  // scopes that the client application has requested on behalf of the user
  const requestedScopes: string[] =
    event.transaction?.requested_scopes ||
    // requested_scopes isn't given for certain login flows, such as embedded username/password forms.
    // See here for more info: https://community.auth0.com/t/knowledge-find-requested-scopes-in-actions-for-refresh-token-client-credential-exchange-or-ropg/126154
    event.request?.body.scope.split(' ') ||
    // event.request?.query.scope included to match previous Rule version, I'm not sure if it will ever fall back this far
    event.request?.query.scope.split(' ') ||
    []

  // get a list of the whitelisted scopes that the user has access to
  const allowedUserScopes = SCOPE_WHITELIST.filter((scope) =>
    userScopes.includes(scope)
  )

  // final list of all allowed scopes
  const allowedScopes = allowAllScopesWhitelist.includes(clientId)
    ? [...DEFAULT_SCOPES, ...userScopes]
    : [...DEFAULT_SCOPES, ...allowedUserScopes]

  const removedScopes = requestedScopes.filter(
    (s) => !allowedScopes.includes(s)
  )

  for (const scope of removedScopes) {
    api.accessToken.removeScope(scope)
  }
}
