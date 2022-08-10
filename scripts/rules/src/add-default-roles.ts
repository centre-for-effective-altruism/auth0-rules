import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

/**
 * There are some roles that every API user should have access to. This rule
 * ensures that if a user is missing their default roles, they are added automatically.
 */
async function addDefaultRoles(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  try {
    const DEFAULT_ROLES: string[] = TEMPLATE_DATA.defaultRoles

    const ManagementClient = require('auth0@2.31.0').ManagementClient

    const management = new ManagementClient({
      domain: auth0.domain,
      clientId: configuration.AUTH0_CLIENT_ID,
      clientSecret: configuration.AUTH0_CLIENT_SECRET,
      scope: 'read:users update:users read:roles',
    })

    // Parameters passed to the Management Client for the update request
    const params = { id: user.user_id }
    const data = { roles: DEFAULT_ROLES }

    // If the user is brand new there's no way that they have that role applied,
    // so we always add the roles
    const count =
      context.stats && context.stats.loginsCount ? context.stats.loginsCount : 0
    if (count === 0) {
      await management.users.assignRoles(params, data)
      return callback(null, user, context)
    }
    // Otherwise we need to check the roles currently assigned to the user
    // If we start going crazy with roles we'll need to worry about pagination
    const roles = await management.users.getRoles({ id: user.user_id })

    // check that the user has all of the required roles assigned,
    // and if not, update them
    if (!DEFAULT_ROLES.every((defaultRole) => roles.includes(defaultRole))) {
      await management.users.assignRoles(params, data)
    }

    // GTFO
    callback(null, user, context)
  } catch (error) {
    const err = error as Error
    callback(
      new Error(
        `Failed to set default role: ${err.message || JSON.stringify(error)}`
      )
    )
  }
}
