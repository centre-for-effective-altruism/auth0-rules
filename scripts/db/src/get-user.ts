import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'
import { MongoClient } from 'mongodb'
import { CallbackUser, DbScriptCallback } from '../../types/db-types'

// TODO: This is pretty copy-pasta-y from login. We should fix this by building
// good code-sharing functionality into this repo. But notice that we can't just
// naively import and run a function. So we'll need to write code that takes
// function definitions and inserts them into the top of the function. It is my
// (JP's) opinion that we should wait until there's one more instance of code
// re-use before making that refactor.

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
}
/** Forum user */
type ForumUser = {
  _id: string
  email: string
  displayName: string
}

/** Authenticates a user against existing user databases */
async function getByEmail(email: string, callback: DbScriptCallback) {
  // Auth0 comment:
  // This script should retrieve a user profile from your existing database,
  // without authenticating the user.
  // It is used to check if a user exists before executing flows that do not
  // require authentication (signup and password reset).
  //
  // There are three ways this script can finish:
  // 1. A user was successfully found. The profile should be in the following
  // format: https://auth0.com/docs/users/normalized/auth0/normalized-user-profile-schema.
  //     callback(null, profile);
  // 2. A user was not found
  //     callback(null);
  // 3. Something went wrong while trying to reach your database:
  //     callback(new Error("my error message"));
  try {
    /** Get required dependencies */
    const { Client: PGClient } = require('pg@7.17.1')
    const { MongoClient } = require('mongodb@3.1.4')

    /**
     * Logic in this function tries to match:
     * EAForum/packages/lesswrong/server/vulcan-lib/apollo-server/authentication.tsx
     */
    async function getForumUser(): Promise<CallbackUser | null> {
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
      return {
        id: forumUser._id,
        nickname: forumUser.displayName,
        email: forumUser.email,
      }
    }

    async function getParfitUser(): Promise<CallbackUser | null> {
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
        SELECT
          id, email, first_name, last_name
        FROM people.person
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
      return {
        id: Person.id,
        given_name: Person.first_name,
        family_name: Person.last_name,
        email: Person.email,
      }
    }

    /** Give priority to Forum users, as the integration is newer */
    const forumUser = await getForumUser()
    if (forumUser) {
      return callback(null, forumUser)
    }
    const parfitUser = await getParfitUser()
    if (parfitUser) {
      return callback(null, parfitUser)
    }
    return callback(null)
  } catch (err) {
    return callback(err)
  }
}
