import { IAuth0RuleUser } from '@tepez/auth0-rules-types'

// function login(email, password, callback) {
//   // This script should authenticate a user against the credentials stored in
//   // your database.
//   // It is executed when a user attempts to log in or immediately after signing
//   // up (as a verification that the user was successfully signed up).
//   //
//   // Everything returned by this script will be set as part of the user profile
//   // and will be visible by any of the tenant admins. Avoid adding attributes
//   // with values such as passwords, keys, secrets, etc.
//   //
//   // The `password` parameter of this function is in plain text. It must be
//   // hashed/salted to match whatever is stored in your database. For example:
//   //
//   //     var bcrypt = require('bcrypt@0.8.5');
//   //     bcrypt.compare(password, dbPasswordHash, function(err, res)) { ... }
//   //
//   // There are three ways this script can finish:
//   // 1. The user's credentials are valid. The returned user profile should be in
//   // the following format: https://auth0.com/docs/users/normalized/auth0/normalized-user-profile-schema
//   //     var profile = {
//   //       user_id: ..., // user_id is mandatory
//   //       email: ...,
//   //       [...]
//   //     };
//   //     callback(null, profile);
//   // 2. The user's credentials are invalid
//   //     callback(new WrongUsernameOrPasswordError(email, "my error message"));
//   // 3. Something went wrong while trying to reach your database
//   //     callback(new Error("my error message"));
//   //
//   // A list of Node.js modules which can be referenced is available here:
//   //
//   //    https://tehsis.github.io/webtaskio-canirequire/

//   const msg = 'Please implement the Login script for this database connection ' +
//     'at https://manage.auth0.com/#/connections/database';
//   return callback(new Error(msg));
// }

type LoginCallback = (error: Error, person?: IAuth0RuleUser<any, any>) => any

async function login(email: string, password: string, callback: LoginCallback) {
  //this example uses the "pg" library
  //more info here: https://github.com/brianc/node-postgres

  const bcrypt = require('bcrypt')
  // TODO; why won't this type?
  const postgres = require('pg')

  const connectionInfo = {
    user: configuration.POSTGRES_USERNAME,
    password: configuration.POSTGRES_PASSWORD,
    host: configuration.POSTGRES_HOST,
    database: configuration.POSTGRES_DATABASE,
    ssl: true,
  }
  const client = await postgres.connect(connectionInfo)

  const query = `
    select
      person.id, email, first_name, last_name, password
    from people.person
    join auth.password on password.person_id = person.id
    where person.email = $1
  `
  const result = await client.query(query, [email])
  await client.end()

  if (result.rows.length === 0) {
    return callback(new WrongUsernameOrPasswordError(email))
  }

  const Person = result.rows[0]

  bcrypt.compare(password, Person.password, function (err, isValid) {
    if (err || !isValid)
      return callback(err || new WrongUsernameOrPasswordError(email))

    return callback(null, {
      id: Person.id,
      given_name: Person.first_name,
      family_name: Person.last_name,
      email: Person.email,
    })
  })
}

// function login(email, password, callback) {
//   //this example uses the "pg" library
//   //more info here: https://github.com/brianc/node-postgres

//   const bcrypt = require('bcrypt')
//   const postgres = require('pg')

//   const connectionInfo = {
//     user: configuration.POSTGRES_USERNAME,
//     password: configuration.POSTGRES_PASSWORD,
//     host: configuration.POSTGRES_HOST,
//     database: configuration.POSTGRES_DATABASE,
//     ssl: true,
//   }

//   postgres.connect(connectionInfo, function (err, client, done) {
//     if (err) return callback(err)

//     const query = `
// 			select
// 				person.id, email, first_name, last_name, password
// 			from people.person
// 			join auth.password on password.person_id = person.id
// 			where person.email = $1
// 		`
//     client.query(query, [email], function (err, result) {
//       // NOTE: always call `done()` here to close
//       // the connection to the database
//       done()

//       if (err || result.rows.length === 0)
//         return callback(err || new WrongUsernameOrPasswordError(email))

//       const Person = result.rows[0]

//       bcrypt.compare(password, Person.password, function (err, isValid) {
//         if (err || !isValid)
//           return callback(err || new WrongUsernameOrPasswordError(email))

//         return callback(null, {
//           id: Person.id,
//           given_name: Person.first_name,
//           family_name: Person.last_name,
//           email: Person.email,
//         })
//       })
//     })
//   })
// }
