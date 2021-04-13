import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

async function addDefaultRole(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  try {
    const ManagementClient = require('auth0@2.31.0').ManagementClient

    const DEFAULT_ROLE = 'rol_V2zfbEI2e6IvUHHh'

    const management = new ManagementClient({
      domain: auth0.domain,
      clientId: configuration.AUTH0_CLIENT_ID,
      clientSecret: configuration.AUTH0_CLIENT_SECRET,
      scope: 'read:users update:users read:roles',
    })

    const params = { id: user.user_id }
    const data = { roles: [DEFAULT_ROLE] }

    // If they're brand new there's no way that they have that role applied
    const count =
      context.stats && context.stats.loginsCount ? context.stats.loginsCount : 0
    if (count === 0) {
      await management.users.assignRoles(params, data)
      return callback(null, user, context)
    }
    // Otherwise we need to check
    const roles = await management.users.getRoles({ id: user.user_id })
    // If we start going crazy with roles will need to worry about pagination
    if (!roles.includes(DEFAULT_ROLE)) {
      await management.users.assignRoles(params, data)
    }

    callback(null, user, context)
  } catch (error) {
    callback(
      new Error(
        'Failed to set default role: ' +
          (error.message || JSON.stringify(error))
      )
    )
  }
}
