import { User } from 'auth0'

declare global {
  /** We inject this into the top of functions, so it will be present */
  const TEMPLATE_DATA: Record<string, any>

  // --- DB Globals ---
  /** Parfit DB Person */
  type PersonResult = {
    id: string
    email: string
    first_name: string
    last_name: string
    password: string
  }

  /** Shape of user object that Database Action Scripts expect to be returned */
  interface CallbackUser extends User {
    /**
     * This appears to be necessary, despite no documentation I could find in a
     * cursory inspection
     */
    id: string
  }
  /** Signature of Database Action Script callback */
  type DbScriptCallback = (error: Error | null, person?: CallbackUser) => void
  /** Configured in Auth0 UI */
  const configuration: {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
    POSTGRES_PORT?: string
    AUTH0_CLIENT_ID: string
    AUTH0_CLIENT_SECRET: string
  }
  /** Global error class */
  class WrongUsernameOrPasswordError extends Error {}
  /** Return this in `login` if user authentication fails. Auth0 provides this as a global. */
  const WrongUsernameOrPasswordError: WrongUsernameOrPasswordError
}

export {}
