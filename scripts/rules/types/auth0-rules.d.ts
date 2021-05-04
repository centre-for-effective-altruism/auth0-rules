// Keep TS happy - global declarations need to occur in modules
export {}

declare global {
  /** Extend this interface, it will appear as the type of the global configuration object */
  interface IAuth0RuleConfiguration {
    AUTH0_CLIENT_ID: string
    AUTH0_CLIENT_SECRET: string
  }
  namespace NodeJS {
    /**
     * Unused currently, but would be used if we wanted to cache expensive resources
     *
     * https://auth0.com/docs/rules/cache-resources
     */
    interface Global {
      CACHE_KEY: string
    }
  }
}
