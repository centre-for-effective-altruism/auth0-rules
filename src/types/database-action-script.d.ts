export {}

declare global {
  // TODO; can we do that here?
  /** Configured in Auth0 UI */
  interface IAuth0RuleConfiguration {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
  }
}
