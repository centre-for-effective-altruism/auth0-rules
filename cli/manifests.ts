import {
  getAllClients,
  getAllRoles,
  getCommentValue,
  isValidClient,
  isValidRole,
} from './lib/utils'
const { NODE_ENV } = process.env

/**
 * List of actions that should exist on the Auth0 tenant.
 *
 * Actions will be executed in the order they are defined
 */
export const ACTION_MANIFEST: ActionDefinition[] = [
  {
    name: 'Add email to access token',
    file: 'email-to-access-token',
    enabled: true,
    trigger: 'post-login',
    triggerVersion: 'v3',
    getData: () => {
      const namespace = process.env.TOKEN_NAMESPACE
      return { namespace }
    },
  },
  {
    name: 'Add Default Role To All Users',
    file: 'add-default-roles',
    enabled: true,
    trigger: 'post-login',
    triggerVersion: 'v3',
    getData: async () => {
      const defaultRoleNames = ['User-Basic-Role', 'EA Funds User']
      const Roles = await getAllRoles()
      const defaultRoles = Roles.filter(isValidRole)
        .filter((Role) => defaultRoleNames.includes(Role.name))
        .map((Role) => getCommentValue({ value: Role.id, roleName: Role.name }))
      return { defaultRoles }
    },
  },
  {
    name: 'Manage scopes',
    file: 'manage-scopes',
    enabled: true,
    trigger: 'post-login',
    triggerVersion: 'v3',
    getData: async () => {
      // Get token namespace
      const namespace = process.env.TOKEN_NAMESPACE

      const allowAllScopesApplicationNames = ['EA Funds']

      const Clients = await getAllClients()
      const validClients = Clients.filter(isValidClient)
      const allowAllScopesWhitelist = validClients
        .filter((Client) =>
          allowAllScopesApplicationNames.includes(Client.name)
        )
        .map((Client) =>
          getCommentValue({
            applicationName: Client.name,
            value: Client.client_id,
          })
        )

      return {
        allowAllScopesWhitelist,
        namespace,
      }
    },
  },
  {
    name: 'Log Context',
    file: 'log-context',
    enabled: false,
    trigger: 'post-login',
    triggerVersion: 'v3',
  },
]

/**
 * List of Database Action Scripts to Deploy.
 *
 * Should contain `login`, `get_user`, and nothing else.
 */
export const DB_MANIFEST: DBActionScriptDefinition[] = [
  {
    name: 'login',
    file: 'login',
    getData: async () => {
      return {
        pgShouldSsl: NODE_ENV !== 'development',
      }
    },
  },
  {
    name: 'get_user',
    file: 'get-user',
    getData: async () => {
      return {
        pgShouldSsl: NODE_ENV !== 'development',
      }
    },
  },
]
