import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'
import { compare } from 'bcrypt'
// Unclear to me why we need to do this to avoid name collision, but it appears
// we do
import { createHash as createHash_ } from 'crypto'
import { MongoClient } from 'mongodb'

/** Authenticates a user against existing user databases */
async function login(
  email: string,
  password: string,
  callback: DbScriptCallback
) {
  try {
    /** Get required dependencies */
    const bcrypt = require('bcrypt@5.0.1') as { compare: typeof compare }
    const { createHash } = require('crypto') as {
      createHash: typeof createHash_
    }
    const { Client: PGClient } = require('pg@7.17.1')
    const { MongoClient } = require('mongodb@3.1.4')

    /**
     * Logic in this function tries to match:
     * EAForum/packages/lesswrong/server/vulcan-lib/apollo-server/authentication.tsx
     */
    async function loginForumUser(): Promise<CallbackUser | null> {
      // Connect to the Forum DB
      const mongoClient: MongoClient = new MongoClient(configuration.MONGO_URI)
      await mongoClient.connect()

      // Query the users collection for someone with our email
      const forumUser = await mongoClient
        .db(configuration.MONGO_DB_NAME)
        .collection<ForumUser>('users')
        .findOne({ 'emails.address': email })

      await mongoClient.close()

      if (!forumUser) {
        return null
      }

      // Check their password
      // Meteor hashed its passwords twice, once on the client and once again on
      // the server. To preserve backwards compatibility with Meteor passwords,
      // we do the same, but do it both on the server-side
      const meteorClientSideHash = createHash('sha256')
        .update(password)
        .digest('hex')
      const isValid = await bcrypt.compare(
        meteorClientSideHash,
        forumUser.services.password.bcrypt
      )
      if (!isValid) {
        return null
      }

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
      if (!isValid) {
        return null
      }

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
