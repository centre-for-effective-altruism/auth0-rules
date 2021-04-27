const { NODE_ENV } = process.env

// TODO; only one manifest

/**
 * List of Database Action Scripts to Deploy.
 *
 * Should contain `login`, `get_user`, and nothing else.
 */
const MANIFEST: DBActionScriptDefinition[] = [
  {
    name: 'login',
    file: 'login',
    getData: async () => {
      return {
        pgShouldSsl: NODE_ENV !== 'development',
      }
    },
  },
  {
    name: 'get_user',
    file: 'get-user',
    getData: async () => {
      return {
        pgShouldSsl: NODE_ENV !== 'development',
      }
    },
  },
]

export default MANIFEST
