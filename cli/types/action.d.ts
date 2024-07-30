export {}

declare global {
  /** Possible trigger for an action, based on the list here: https://auth0.com/docs/customize/actions/flows-and-triggers */
  type ActionTrigger =
    | 'post-login'
    | 'credentials-exchange'
    | 'post-challenge'
    | 'pre-user-registration'
    | 'post-user-registration'
    | 'post-change-password'
    | 'send-phone-message'

  interface ActionDefinition {
    /** The name of this action. Will appear in the UI. */
    name: string
    /** The filename (without extension) corresponding to this action, in the ./src directory */
    file: string
    /** Is the action enabled. */
    enabled: boolean
    /** Function to get any data required by this action */
    getData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
    /** The event this action is triggered by */
    trigger: ActionTrigger
  }
}
