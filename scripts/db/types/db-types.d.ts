import { User } from 'auth0'

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

/** Configuration available from connection environment variables */
interface DbConfiguration {
  POSTGRES_USERNAME: string
  POSTGRES_PASSWORD: string
  POSTGRES_HOST: string
  POSTGRES_DATABASE: string
  POSTGRES_PORT?: string
  MONGO_URI: string
  MONGO_DB_NAME: string
}

/** Forum user */
type ForumUser = {
  _id: string
  displayName: string
  services: {
    password: {
      bcrypt: string
    }
  }
  /**
   * Email address is also stored in an email field, but as far as
   * authentication is concerned, this is how we store emails
   */
  emails: { address: string; verified: boolean }[]
}
