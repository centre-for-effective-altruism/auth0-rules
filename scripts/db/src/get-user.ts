import { CallbackUser, DbScriptCallback, ForumUser } from '../types/db-types'
import { Client as PGClient, ConnectionConfig as PGConnectionConfig } from 'pg'

// TODO: This is pretty copy-pasta-y from login. We should fix this by building
// good code-sharing functionality into this repo. But notice that we can't just
// naively import and run a function. So we'll need to write code that takes
// function definitions and inserts them into the top of the function. It is my
// (JP's) opinion that we should wait until there's one more instance of code
// re-use before making that refactor.

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
    async function getForumUser(): Promise<CallbackUser | null> {
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

      const pgClient: PGClient = new PGClient(pgConnectionInfo)
      await pgClient.connect()

      const forumQuery = `
        SELECT * FROM "Users"
        WHERE EXISTS (
          SELECT 1 FROM unnest(emails) AS email
          WHERE LOWER(email->>'address') = LOWER($1)
        )
      `
      const res = await pgClient.query<ForumUser>(forumQuery, [email])

      await pgClient.end()

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

      if (res.rows.length === 0) {
        return null
      }
      if (res.rows.length > 1) {
        throw new Error('More than one user with this email address')
      }
      const forumUser = res.rows[0]

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

    const forumUser = await getForumUser()
    if (forumUser) {
      return callback(null, forumUser)
    }
    return callback(null)
  } catch (err) {
    return callback(err as Error)
  }
}
