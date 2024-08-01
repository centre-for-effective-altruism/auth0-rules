import {
  DefaultPostLoginApi,
  DefaultPostLoginEvent,
} from '../types/auth0-actions'

const auth0Sdk = require('auth0')

exports.onExecutePostLogin = async (
  event: DefaultPostLoginEvent,
  api: DefaultPostLoginApi
) => {
  // Skip if the analogous Rule was executed first. You can get this ID from the Rules
  // page in the Auth0 dashboard (https://manage.auth0.com/#/rules)
  if (api.rules.wasExecuted('rul_bnNiRxFsMNMFESXI')) {
    return
  }

  try {
    const DEFAULT_ROLES: string[] = TEMPLATE_DATA.defaultRoles

    const ManagementClient = auth0Sdk.ManagementClient
    const management = new ManagementClient({
      domain: event.secrets.AUTH0_DOMAIN,
      clientId: event.secrets.AUTH0_CLIENT_ID,
      clientSecret: event.secrets.AUTH0_CLIENT_SECRET,
      scope: 'read:users update:users read:roles',
    })

    const params = { id: event.user!.user_id }
    const data = { roles: DEFAULT_ROLES }

    // If the user is brand new there's no way that they have that role applied,
    // so we always add the roles
    if (event.stats!.logins_count === 0) {
      await management.users.assignRoles(params, data)
      return
    }

    // Otherwise we need to check the roles currently assigned to the user
    const roles = await management.users.getRoles({ id: event.user!.user_id })

    if (!DEFAULT_ROLES.every((defaultRole) => roles.includes(defaultRole))) {
      await management.users.assignRoles(params, data)
    }
  } catch (error) {
    // @ts-ignore
    api.access.deny(`Failed to set default role: ${error?.message}`)
  }
}
