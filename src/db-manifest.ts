import auth0 from './lib/client'

// TODO;
// Only two of these allowed
const MANIFEST: DBActionScriptDefinition[] = [
  {
    name: 'login',
    file: 'login',
  },
]

export default MANIFEST
