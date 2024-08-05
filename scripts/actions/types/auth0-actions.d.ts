import { PostLoginEvent, PostLoginApi } from 'auth0-actions'

export interface ActionsDefaultSecrets {
  AUTH0_DOMAIN: string
  AUTH0_CLIENT_ID: string
  AUTH0_CLIENT_SECRET: string
}

// auth0-actions doesn't have all the types completely correct, use the modified types below.
// TODO upgrade to an officially supported type package once one becomes available

export interface DefaultPostLoginEvent
  extends PostLoginEvent<ActionsDefaultSecrets, any, any, any> {
  secrets: ActionsDefaultSecrets
}

export interface DefaultPostLoginApi extends PostLoginApi {
  rules: { wasExecuted: (ruleId: string) => boolean }
}
