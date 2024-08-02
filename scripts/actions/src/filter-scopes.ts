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

exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  // Skip if the analogous Rule was executed first. You can get this ID from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules)
  if (api.rules.wasExecuted('rul_iFouQc7sxIAebmG9')) {
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
  const requestedScopes: string[] = event.transaction?.requested_scopes || []

  // get a list of the whitelisted scopes that the user has access to
  const allowedUserScopes = SCOPE_WHITELIST.filter((scope) =>
    userScopes.includes(scope)
  )

  // final list of all allowed scopes
  const allowedScopes = applicationWhitelist.includes(event.client?.clientId!)
    ? [...DEFAULT_SCOPES, ...userScopes]
    : [...DEFAULT_SCOPES, ...allowedUserScopes]

  // final list of scopes to add to the access token, built by diffing
  // the list of allowed scopes against the requested scopes
  const finalScopes = allowedScopes.filter((scope) =>
    requestedScopes.includes(scope)
  )

  const removedScopes = requestedScopes.filter((s) => !finalScopes.includes(s))

  for (const scope of removedScopes) {
    api.accessToken.removeScope(scope)
  }
}
