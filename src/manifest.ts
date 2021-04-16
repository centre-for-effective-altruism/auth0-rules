import { getAllClients, getAllRoles, getValueAndComment } from './lib/utils'

/**
 * List of rules that should exist on the Auth0 tenant.
 *
 * Rules will be executed in the order they are defined
 */
const MANIFEST: RuleDefinition[] = [
  {
    name: 'Add email to access token',
    file: 'email-to-access-token',
    enabled: true,
  },
  {
    name: 'Add Default Role To All Users',
    file: 'add-default-roles',
    enabled: true,
    getData: async () => {
      const defaultRoleNames = [
        'User-Basic-Role',
        'Parfit User',
        'EA Funds User',
        'Giving What We Can User',
      ]
      const Roles = await getAllRoles()
      const defaultRoles = Roles.filter(
        (Role) => Role.name && defaultRoleNames.includes(Role.name)
      )
        .map((Role) => getValueAndComment(Role.id, Role.name))
        .join(',\n')
      return { defaultRoles }
    },
  },
  {
    name: 'Filter scopes',
    file: 'filter-scopes',
    enabled: true,
    getData: async () => {
      const applicationNames = ['EA Funds', 'Giving What We Can']
      const Clients = await getAllClients()
      const whitelist = Clients.filter(
        (Client) => !!Client.name && applicationNames.includes(Client.name)
      )
        .map((Client) => getValueAndComment(Client.client_id, Client.name))
        .join(',\n')
      return { whitelist }
    },
  },
  {
    name: 'Add Scopes to ID Token',
    file: 'add-scopes-to-id-token',
    enabled: true,
    getData: async () => {
      const applicationNames = ['Giving What We Can']
      const Clients = await getAllClients()
      const whitelist = Clients.filter(
        (Client) => !!Client.name && applicationNames.includes(Client.name)
      )
        .map((Client) => getValueAndComment(Client.client_id, Client.name))
        .join(',\n')
      return { whitelist }
    },
  },
  {
    name: 'Log Context',
    file: 'log-context',
    enabled: false,
  },
]

export default MANIFEST
