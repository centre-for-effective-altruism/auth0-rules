import { compare } from 'bcrypt'
import { createHash as createHash_ } from 'crypto'
import { MongoClient } from 'mongodb'
import {
  CallbackUser,
  DbConfiguration,
  DbScriptCallback,
  ForumUser,
} from '../types/db-types'

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
    const { MongoClient } = require('mongodb@4.1.0')

    /**
     * `configuration` is declared a global by @typez/auth0-rules-types, and
     * there's no way to undo that. We must resort to a hack here to inform
     * typescript of the actual shape of `configuration`
     */
    const { MONGO_URI, MONGO_DB_NAME } =
      configuration as unknown as DbConfiguration

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

    /** Give priority to Forum users, as the integration is newer and it has more users */
    const forumUser = await loginForumUser()
    if (forumUser) {
      return callback(null, forumUser)
    }
    return callback(new WrongUsernameOrPasswordError(email))
  } catch (err) {
    return callback(err as Error)
  }
}
