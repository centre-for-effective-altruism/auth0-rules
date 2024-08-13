import { PostLoginEvent, PostLoginApi, UserBase, Client } from 'auth0-actions'

export interface ActionsDefaultSecrets {
  AUTH0_DOMAIN: string
  AUTH0_CLIENT_ID: string
  AUTH0_CLIENT_SECRET: string
}

// auth0-actions doesn't have all the types completely correct, use the modified types below.
// TODO upgrade to an officially supported type package once one becomes available

// `client_id` is incorrectly typed as `clientId` (see https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/event-object)
interface CorrectlyTypedClient<T> extends Omit<Client<T>, 'clientId'> {
  client_id: string
}

export interface DefaultPostLoginEvent
  extends PostLoginEvent<ActionsDefaultSecrets, any, any, any> {
  secrets: ActionsDefaultSecrets
  // `user` and `client` are not optional according to https://auth0.com/docs/customize/actions/flows-and-triggers/login-flow/event-object
  user: UserBase<any, any>
  client: CorrectlyTypedClient<any>
}

export interface DefaultPostLoginApi extends PostLoginApi {
  rules: { wasExecuted: (ruleId: string) => boolean }
}
