declare namespace NodeJS {
  import crypto from 'crypto'

  export interface ProcessEnv {
    NODE_ENV: 'development' | 'staging' | 'production'
    /** Primary domain of Auth0 tenant */
    AUTH0_DOMAIN: string
    /** Auth0 audience */
    AUTH0_AUDIENCE: string
    /**
     * Client ID of connected Auth0 application (should be a machine-to-machine
     * application with access to the Parfit API)
     */
    AUTH0_CLIENT_ID: string
    /** Client secret of connected Auth0 application */
    AUTH0_CLIENT_SECRET: string
    /**
     * Namespace for custom claims on JWTs. Should be in the form of a
     * fully-qualified domain name, and should not include a trailing slash
     * (e.g. `https://my-api.example.com`). See more at
     * https://auth0.com/docs/tokens/create-namespaced-custom-claims
     */
    TOKEN_NAMESPACE: string
  }
}
