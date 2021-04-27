import { Client, ConnectionConfig } from 'pg'
import { compare } from 'bcrypt'

// TODO; move to only two different builds

/** Authenticates a user against the Parfit postgres database */
async function login(
  email: string,
  password: string,
  callback: DbScriptCallback
) {
  try {
    /** Get required dependencies */
    const bcrypt = require('bcrypt@5.0.1') as { compare: typeof compare }
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
      return callback(new WrongUsernameOrPasswordError(email))
    }

    const Person = result.rows[0]

    /** Check that the supplied password matches the one in the database */
    const isValid = await bcrypt.compare(password, Person.password)
    if (!isValid) return callback(new WrongUsernameOrPasswordError(email))

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
