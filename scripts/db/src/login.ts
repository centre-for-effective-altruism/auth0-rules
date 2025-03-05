import { compare } from 'bcrypt'
import { createHash as createHash_ } from 'crypto'
import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'
import { CallbackUser, DbScriptCallback, ForumUser } from '../types/db-types'

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

    const {
      POSTGRES_USERNAME,
      POSTGRES_PASSWORD,
      POSTGRES_HOST,
      POSTGRES_DATABASE,
      POSTGRES_PORT,
    } = configuration

    /**
     * Logic in this function tries to match:
     * EAForum/packages/lesswrong/server/vulcan-lib/apollo-server/authentication.tsx
     */
    async function loginForumUser(): Promise<CallbackUser | null> {
      const pgConnectionInfo: PGConnectionConfig = {
        user: POSTGRES_USERNAME,
        password: POSTGRES_PASSWORD,
        host: POSTGRES_HOST,
        database: POSTGRES_DATABASE,
        port: POSTGRES_PORT ? parseInt(POSTGRES_PORT) : 5432,
        ssl: TEMPLATE_DATA.pgShouldSsl,
      }

      /**
       * NOTE: Temporary fix for Auth0 bug August 2022
       * Should be reverted ASAP
       *
       * Update Nov 2022: Auth0 told me the bug is fixed so I tried
       * reverting and it broke - the bug is very much not fixed :(
       */
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

      /** Construct a postgres client and connect to the server */
      const pgClient: PGClient = new PGClient(pgConnectionInfo)
      await pgClient.connect()

      /** Query the users table for someone with our email */
      const forumQuery = `
        SELECT * FROM users 
        WHERE EXISTS (
          SELECT 1 FROM unnest(emails) AS email
          WHERE LOWER(email) = LOWER($1)
        )
      `
      const res = await pgClient.query<ForumUser>(forumQuery, [email])

      /** Close the connection */
      await pgClient.end()

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

      if (res.rows.length === 0) {
        return null
      }
      if (res.rows.length > 1) {
        throw new Error('More than one user with this email address')
      }
      const forumUser = res.rows[0]

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

      // Which email did we find?
      const emailInfo = forumUser.emails.find(
        (e) => e.address.toLowerCase() === email.toLowerCase()
      )
      if (!emailInfo) {
        // This should never happen, as they were returned because that field matched
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

    const forumUser = await loginForumUser()
    if (forumUser) {
      return callback(null, forumUser)
    }
    return callback(new WrongUsernameOrPasswordError(email))
  } catch (err) {
    return callback(err as Error)
  }
}
