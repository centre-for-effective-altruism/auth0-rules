// Keep TS happy - global declarations need to occur in modules
export {}

declare global {
  namespace NodeJS {
    interface Global {
      CACHE_KEY: string
    }
  }
}
