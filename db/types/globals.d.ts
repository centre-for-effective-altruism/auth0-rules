export {}

declare global {
  // TODO; can we have a local .env file that we push to Auth0
  /** Configured in Auth0 UI */
  const configuration: {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
  }
  /** Global error class */
  class WrongUsernameOrPasswordError extends Error {}
  const WrongUsernameOrPasswordError: WrongUsernameOrPasswordError
}
