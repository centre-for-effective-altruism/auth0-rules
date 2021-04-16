import { getAllClients, getCommentValue, isValidClient } from './lib/utils'

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
  },
  {
    name: 'Filter scopes',
    file: 'filter-scopes',
    enabled: true,
    getData: async () => {
      const applicationNames = ['EA Funds', 'Giving What We Can']
      const Clients = await getAllClients()
      const whitelist = Clients.filter(isValidClient)
        .filter((Client) => applicationNames.includes(Client.name))
        .map((Client) =>
          getCommentValue({
            applicationName: Client.name,
            value: Client.client_id,
          })
        )
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
      const whitelist = Clients.filter(isValidClient)
        .filter((Client) => applicationNames.includes(Client.name))
        .map((Client) =>
          getCommentValue({
            applicationName: Client.name,
            value: Client.client_id,
          })
        )
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
