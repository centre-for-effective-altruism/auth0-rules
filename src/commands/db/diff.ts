import { Change, diffLines } from 'diff'
import MANIFEST from '../../db-manifest'
import {
  generateScript,
  getAllConnections,
  printScriptDiff,
} from '../../lib/utils'
const { NODE_ENV } = process.env

const CONNECTION_NAMES = {
  development: 'Forum-User-Migration',
  staging: 'Username-Password-Authentication',
  production: 'Username-Password-Authentication',
}
const CONNECTION_NAME =
  CONNECTION_NAMES[NODE_ENV] || 'Username-Password-Authentication'

// TODO;
export default async function run() {
  // NB: Connection is a term-of-art in Auth0 for an identity provider,
  // including the username/password database
  const connections = await getAllConnections()
  const db_connection = connections.find(
    (conn) => conn.name === CONNECTION_NAME
  )
  if (!db_connection) {
    throw new Error('Could not find requested Auth0 connection')
  }
  // console.log('🚀 ~ file: diff.ts ~ line 14 ~ run ~ connection', db_connection)
  const diffs: [DBActionScriptDefinition, Change[]][] = []
  for (const scriptDef of MANIFEST) {
    const our_script = await generateScript(scriptDef, 'db')
    const existing_script = db_connection.options.customScripts[scriptDef.name]
    if (!existing_script) {
      throw new Error(
        'Could not find specified database action script on connection.\nAre you sure you have the correct name of your script, and that the connection supports a custom database?'
      )
    }
    diffs.push([scriptDef, diffLines(existing_script, our_script)])
  }
  const upToDateScripts = printScriptDiff(diffs, 'db scripts')
  if (MANIFEST.length === upToDateScripts.length) {
    console.log('Database action scripts are up-to-date')
  }
}
