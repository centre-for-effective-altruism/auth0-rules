// Keep TS happy - global declarations need to occur in modules
export {}

declare global {
  /** Extend this interface, it will appear as the type of the global configuration object */
  interface IAuth0RuleConfiguration {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
    POSTGRES_PORT?: string
    AUTH0_CLIENT_ID: string
    AUTH0_CLIENT_SECRET: string
  }
}
