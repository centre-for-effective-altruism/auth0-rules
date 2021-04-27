import { Client, ConnectionConfig } from 'pg'

// TODO: This is pretty copy-pasta-y from login. We should fix this by building
// good code-sharing functionality into this repo. But notice that we can't just
// naively import and run a function. So we'll need to write code that takes
// function definitions and inserts them into the top of the function. It is my
// (JP's) opinion that we should wait until there's one more instance of code
// re-use before making that refactor.

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

    /** Declare connection info */
    const connectionInfo: ConnectionConfig = {
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
    const client: Client = new Client(connectionInfo)
    await client.connect()

    /** Get the person based on their email, joining on the password table */
    const query = `
      select
        person.id, email, first_name, last_name, password
      from people.person
      join auth.password on password.person_id = person.id
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
