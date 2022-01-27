/**
 * The Auth0 DefinitelyTyped typings don't include the BrandingClient, so we
 * shim their definitions (through module augmentation) to ensure that things
 * compile correctly
 */
export {}

declare module 'auth0' {
  interface ManagementClient<A = AppMetadata, U = UserMetadata> {
    prompts: {
      updateCustomTextByLanguage: (params: {
        prompt: string
        language: string
        body: { [screen: string]: { [key: string]: string } }
      }) => Promise<void>

      getCustomTextByLanguage: (params: {
        prompt: string
        language: string
      }) => Promise<{ [screen: string]: { [key: string]: string } }>
    }

    branding: {
      getUniversalLoginTemplate: () => Promise<{ body: string }>
      setUniversalLoginTemplate: (
        params: undefined,
        data: { template: string }
      ) => Promise<void>
    }
  }
}
