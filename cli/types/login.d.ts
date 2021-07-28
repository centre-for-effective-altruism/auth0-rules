export {}

declare module 'auth0' {
  interface ManagementClient<A = AppMetadata, U = UserMetadata> {
    branding: {
      getUniversalLoginTemplate: () => Promise<{ body: string }>
      setUniversalLoginTemplate: (
        params: undefined,
        data: { template: string }
      ) => Promise<{ never: never } | void>
    }
  }
}
