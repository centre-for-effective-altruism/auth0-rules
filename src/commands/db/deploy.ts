import { red, green } from 'chalk'
import auth0 from '../../lib/client'
import { generateScript, getAllConnections } from '../../lib/utils'
import MANIFEST from '../../db-manifest'
import { CONNECTION_NAME } from '../../lib/db-utils'

export default async function run() {
  try {
    // get all rules currently defined on the Auth0 tenant
    const connections = await getAllConnections()
    const dbConnection = connections.find(
      (conn) => conn.name === CONNECTION_NAME
    )
    if (!dbConnection) {
      throw new Error('Could not find requested Auth0 connection')
    }
    if (!dbConnection.id) {
      // Apparently Auth0 doesn't guarantee that a connection has an id??
      throw new Error('How the hell did we get a connection without an id')
    }
    const options = dbConnection.options
    // console.log('🚀 ~ file: deploy.ts ~ line 18 ~ run ~ options', options)
    const ourCustomScripts = Object.fromEntries(
      await Promise.all(
        MANIFEST.map(async (scriptDef) => [
          scriptDef.name,
          await generateScript(scriptDef, 'db'),
        ])
      )
    )
    const updatedCustomScripts = {
      ...options.customScripts,
      ...ourCustomScripts,
    }
    // It is crucial that the options object contains the previous options, as
    // the whole options object will be overriden in this update
    options.customScripts = updatedCustomScripts
    await auth0.updateConnection({ id: dbConnection.id }, { options })
    console.log(`Scripts updated ${green(`\u2713`)}`)
  } catch (err) {
    console.error(red(err.message))
  }
}
