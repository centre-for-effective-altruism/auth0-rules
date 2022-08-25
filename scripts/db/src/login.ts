import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'
import { compare } from 'bcrypt'
import { createHash as createHash_ } from 'crypto'
import { MongoClient } from 'mongodb'
import {
  CallbackUser,
  DbConfiguration,
  DbScriptCallback,
  ForumUser,
} from '../types/db-types'

/**
 * Parfit DB Person, as returned by the written query
 *
 * It is up to the programmer to keep this up to date if the query changes
 */
type PersonResult = {
  id: string
  email: string
  first_name: string
  last_name: string
  password: string
}

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
    const { Client: PGClient } = require('pg@8.7.1')
    const { MongoClient } = require('mongodb@3.1.4')

    /**
     * `configuration` is declared a global by @typez/auth0-rules-types, and
     * there's no way to undo that. We must resort to a hack here to inform
     * typescript of the actual shape of `configuration`
     */
    const {
      POSTGRES_USERNAME,
      POSTGRES_PASSWORD,
      POSTGRES_HOST,
      POSTGRES_DATABASE,
      POSTGRES_PORT,
      MONGO_URI,
      MONGO_DB_NAME,
    } = configuration as unknown as DbConfiguration

    /**
     * Logic in this function tries to match:
     * EAForum/packages/lesswrong/server/vulcan-lib/apollo-server/authentication.tsx
     */
    async function loginForumUser(): Promise<CallbackUser | null> {
      // Connect to the Forum DB
      const mongoClient: MongoClient = new MongoClient(MONGO_URI)
      await mongoClient.connect()

      // Query the users collection for someone with our email
      const matchingUsers = await mongoClient
        .db(MONGO_DB_NAME)
        .collection<ForumUser>('users')
        .find({ 'emails.address': email })
        .collation({ locale: 'en', strength: 2 })
        .toArray()

      await mongoClient.close()

      if (!matchingUsers.length) {
        return null
      }
      if (matchingUsers.length > 1) {
        throw new Error('More than one user with this email address')
      }
      const forumUser = matchingUsers[0]

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

      // Just in case we were dumb and did a stupid manual operation in our
      // overly-flexible database
      if (!Array.isArray(forumUser.emails)) {
        throw new Error('Expected emails field to be an array')
      }

      // Which email did we find?
      const emailInfo = forumUser.emails.find(
        (e) => e.address.toLowerCase() === email.toLowerCase()
      )
      if (!emailInfo) {
        // This should never happen, as they were returned by mongo because that
        // field matched
        throw new Error(
          `User found by email ${email}, does not have that email`
        )
      }

      return {
        id: forumUser._id,
        nickname: forumUser.displayName,
        email: emailInfo.address,
        email_verified: emailInfo.verified,
      }
    }

    async function loginParfitUser(): Promise<CallbackUser | null> {
      /** Declare connection info */
      const pgConnectionInfo: PGConnectionConfig = {
        user: POSTGRES_USERNAME,
        password: POSTGRES_PASSWORD,
        host: POSTGRES_HOST,
        database: POSTGRES_DATABASE,
        port: POSTGRES_PORT ? parseInt(POSTGRES_PORT) : 5432,
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
      const Person = await pgClient
        .query<PersonResult>(parfitQuery, [email])
        .then((res) => res.rows[0])

      /** Close the connection */
      await pgClient.end()

      if (!Person) {
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

    /** Give priority to Forum users, as the integration is newer and it has more users */
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
    return callback(err as Error)
  }
}
