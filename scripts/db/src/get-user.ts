import { Client, ConnectionConfig } from 'pg'
import { DbConfiguration, DbScriptCallback } from '../types/db-types'

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
    /** Get required dependency */
    const { Client } = require('pg@7.17.1')

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
    } = (configuration as unknown) as DbConfiguration

    /** Declare connection info */
    const connectionInfo: ConnectionConfig = {
      user: POSTGRES_USERNAME,
      password: POSTGRES_PASSWORD,
      host: POSTGRES_HOST,
      database: POSTGRES_DATABASE,
      port: POSTGRES_PORT ? parseInt(POSTGRES_PORT) : 5432,
      ssl: TEMPLATE_DATA.pgShouldSsl,
    }

    /** Construct a postgres client and connect to the server */
    const client: Client = new Client(connectionInfo)
    await client.connect()

    /** Get the person based on their email, joining on the password table */
    const query = `
      select
        person.id, email, first_name, last_name
      from people.person
      where person.email = $1
    `
    const result = await client.query<PersonResult>(query, [email])

    /** Close the connection */
    await client.end()

    if (result.rows.length === 0) {
      return callback(null)
    }

    const Person = result.rows[0]

    /** Return the valid user back to Auth0 */
    return callback(null, {
      id: Person.id,
      given_name: Person.first_name,
      family_name: Person.last_name,
      email: Person.email,
    })
  } catch (err) {
    return callback(err)
  }
}
