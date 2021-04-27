import { Change, diffLines } from 'diff'
import { DB_MANIFEST } from '../../manifests'
import { CONNECTION_NAME } from '../../lib/db-utils'
import {
  generateScript,
  getAllConnections,
  printScriptDiff,
} from '../../lib/utils'

export default async function run() {
  // NB: Connection is a term-of-art in Auth0 for an identity provider,
  // including the username/password database
  const connections = await getAllConnections()
  const dbConnection = connections.find((conn) => conn.name === CONNECTION_NAME)
  if (!dbConnection) {
    throw new Error('Could not find requested Auth0 connection')
  }
  const diffs: [DBActionScriptDefinition, Change[]][] = []
  for (const scriptDef of DB_MANIFEST) {
    const our_script = await generateScript(scriptDef, 'db')
    const existing_script = dbConnection.options.customScripts?.[scriptDef.name]
    if (!existing_script) {
      throw new Error(
        [
          'Could not find specified database action script on connection.',
          'Are you sure you have the correct name of your script, and that the connection supports a custom database?',
          `Script name: ${scriptDef.name}`,
        ].join('\n')
      )
    }
    diffs.push([scriptDef, diffLines(existing_script, our_script)])
  }
  const upToDateScripts = printScriptDiff(diffs, 'db scripts')
  if (DB_MANIFEST.length === upToDateScripts.length) {
    console.log('Database action scripts are up-to-date')
  }
}
