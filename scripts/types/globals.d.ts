import { User } from 'auth0'

declare global {
  /** We inject this into the top of functions, so it will be present */
  const TEMPLATE_DATA: Record<string, any>
  /** @tepez/auth0-rules-types declares that the global configuration object is of this type, so we extend it for all uses of configuration, including those in db scripts */
  interface IAuth0RuleConfiguration {
    POSTGRES_USERNAME: string
    POSTGRES_PASSWORD: string
    POSTGRES_HOST: string
    POSTGRES_DATABASE: string
    POSTGRES_PORT?: string
    AUTH0_CLIENT_ID: string
    AUTH0_CLIENT_SECRET: string
    MONGO_URI: string
    MONGO_DB_NAME: string
  }

  // --- DB Globals ---
  /** Parfit DB Person */
  type PersonResult = {
    id: string
    email: string
    first_name: string
    last_name: string
    password: string
  }
  type ForumUser = {
    _id: string
    email: string
    displayName: string
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
  type DbScriptCallback = (error: Error | null, person?: CallbackUser) => any
  /** Global error class */
  class WrongUsernameOrPasswordError extends Error {}
  /** Return this in `login` if user authentication fails. Auth0 provides this as a global. */
  const WrongUsernameOrPasswordError: WrongUsernameOrPasswordError
}

export {}
