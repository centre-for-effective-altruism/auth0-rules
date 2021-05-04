import { Client, ConnectionConfig } from 'pg'
import { compare } from 'bcrypt'
import { DbConfiguration, DbScriptCallback } from '../types/db-types'

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
