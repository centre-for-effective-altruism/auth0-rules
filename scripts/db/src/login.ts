import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'
import { compare } from 'bcrypt'
import { MongoClient } from 'mongodb'

/** Authenticates a user against the Parfit postgres database */
async function login(
  email: string,
  password: string,
  callback: DbScriptCallback
) {
  try {
    /** Get required dependencies */
    const bcrypt = require('bcrypt@5.0.1') as { compare: typeof compare }
    const { Client: PGClient } = require('pg@7.17.1')
    const { MongoClient } = require('mongodb@3.1.4')

    async function loginForumUser(): Promise<CallbackUser | null> {
      /** TODO; Doc everywhere */
      const mongoClient: MongoClient = new MongoClient(configuration.MONGO_URI)
      await mongoClient.connect()

      const forumResult = await mongoClient
        .db(configuration.MONGO_DB_NAME)
        .collection<ForumUser>('users')
        .find({ email })
        .toArray()

      await mongoClient.close()

      if (forumResult.length === 0) {
        return null
      }

      // TODO; which one?
      const forumUser = forumResult[0]

      return {
        id: forumUser._id,
        nickname: forumUser.displayName,
        email: forumUser.email,
      }
    }

    async function loginParfitUser(): Promise<CallbackUser | null> {
      /** Declare connection info */
      const pgConnectionInfo: PGConnectionConfig = {
        user: configuration.POSTGRES_USERNAME,
        password: configuration.POSTGRES_PASSWORD,
        host: configuration.POSTGRES_HOST,
        database: configuration.POSTGRES_DATABASE,
        port: configuration.POSTGRES_PORT
          ? parseInt(configuration.POSTGRES_PORT)
          : 5432,
        ssl: TEMPLATE_DATA.pgShouldSsl,
      }
      /** Construct a postgres client and connect to the server */
      const pgClient: PGClient = new PGClient(pgConnectionInfo)
      await pgClient.connect()

      /** Get the person based on their email, joining on the password table */
      const parfitQuery = `
      select
        person.id, email, first_name, last_name, password
      from people.person
      join auth.password on password.person_id = person.id
      where person.email = $1
    `
      const parfitResult = await pgClient.query<PersonResult>(parfitQuery, [
        email,
      ])

      /** Close the connection */
      await pgClient.end()

      const Person = parfitResult.rows[0]

      if (parfitResult.rows.length === 0) {
        return null
      }

      /** Check that the supplied password matches the one in the database */
      const isValid = await bcrypt.compare(password, Person.password)
      if (!isValid) return callback(new WrongUsernameOrPasswordError(email))

      /** Return the valid user back to Auth0 */
      return {
        id: Person.id,
        given_name: Person.first_name,
        family_name: Person.last_name,
        email: Person.email,
      }
    }

    /** Give priority to Forum users, as the integration is newer */
    const forumUser = await loginForumUser()
    if (forumUser) {
      return callback(null, forumUser)
    }
    const parfitUser = await loginParfitUser()
    if (parfitUser) {
      return callback(null, parfitUser)
    }
    return callback(new WrongUsernameOrPasswordError(email))
  } catch (err) {
    return callback(err)
  }
}
