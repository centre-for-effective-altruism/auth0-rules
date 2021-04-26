import { User } from 'auth0'

// TODO; why so much stuff in globals
declare global {
  // TODO; doc
  type PersonResult = {
    id: string
    email: string
    first_name: string
    last_name: string
    password: string
  }

  interface CallbackUser extends User {
    // TODO; This appears to be necessary
    id: string
  }
  type DbScriptCallback = (error: Error | null, person?: CallbackUser) => any
  // TODO; can we have a local .env file that we push to Auth0
  /** Configured in Auth0 UI */
  const configuration: {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
    POSTGRES_PORT?: string
  }
  /** Global error class */
  class WrongUsernameOrPasswordError extends Error {}
  const WrongUsernameOrPasswordError: WrongUsernameOrPasswordError
  // TODO;
  const TEMPLATE_DATA: Record<string, any>
}

export {}
