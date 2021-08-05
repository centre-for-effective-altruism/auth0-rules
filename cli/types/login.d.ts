/**
 * The Auth0 DefinitelyTyped typings don't include the BrandingClient, so we
 * shim their definitions (through module augmentation) to ensure that things
 * compile correctly
 */
export {}

declare module 'auth0' {
  interface ManagementClient<A = AppMetadata, U = UserMetadata> {
    branding: {
      getUniversalLoginTemplate: () => Promise<{ body: string }>
      setUniversalLoginTemplate: (
        params: undefined,
        data: { template: string }
      ) => Promise<void>
    }
  }
}
