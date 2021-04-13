declare namespace NodeJS {
  import crypto from 'crypto'

  export interface ProcessEnv {
    NODE_ENV: 'development' | 'staging' | 'production'
    /** Primary domain of Auth0 tenant */
    AUTH0_DOMAIN: string
    /**
     * Base domain of Auth0 tenant, used for applications that can't connect to
     * custom domains (should be <domain>.auth0.com)
     */
    AUTH0_TENANT_DOMAIN?: string
    /** Auth0 audience */
    AUTH0_AUDIENCE: string
    /**
     * Client ID of connected Auth0 application (should be a machine-to-machine
     * application with access to the Parfit API)
     */
    AUTH0_CLIENT_ID: string
    /** Client secret of connected Auth0 application */
    AUTH0_CLIENT_SECRET: string
  }
}
