// Keep TS happy - global declarations need to occur in modules
export {}

declare global {
  namespace NodeJS {
    interface Global {
      CACHE_KEY: string
    }
  }
}

declare global {
  interface IAuth0RuleConfiguration {
    AUTH0_CLIENT_ID: string
    AUTH0_CLIENT_SECRET: string
  }
}
