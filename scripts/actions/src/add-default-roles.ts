import type { ManagementClient } from 'auth0'
import {
  DefaultPostLoginApi,
  DefaultPostLoginEvent,
} from '../types/auth0-actions'

const auth0Sdk = require('auth0')

exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  try {
    const DEFAULT_ROLES: string[] = TEMPLATE_DATA.defaultRoles

    const ManagementClient = auth0Sdk.ManagementClient
    const management: ManagementClient = new ManagementClient({
      domain: event.secrets.AUTH0_DOMAIN,
      clientId: event.secrets.AUTH0_CLIENT_ID,
      clientSecret: event.secrets.AUTH0_CLIENT_SECRET,
      scope: 'read:users update:users read:roles',
    })

    const params = { id: event.user.user_id }
    const data = { roles: DEFAULT_ROLES }

    // If the user is brand new there's no way that they have that role applied,
    // so we always add the roles
    if (event.stats!.logins_count === 0) {
      await management.users.assignRoles(params, data)
      return
    }

    // Otherwise we need to check the roles currently assigned to the user
    const roles = await management.users.getRoles({ id: event.user.user_id })
    const roleIds = roles.data.map((role: { id: string }) => role.id)

    if (!DEFAULT_ROLES.every((defaultRole) => roleIds.includes(defaultRole))) {
      await management.users.assignRoles(params, data)
    }
  } catch (error) {
    // @ts-ignore `error` is assumed to have type `unknown`, when actually it will always be an `Error`. Casting isn't sufficient because the types annotations are dropped in the deployed version
    api.access.deny(`Failed to set default role: ${error?.message}`)
  }
}
