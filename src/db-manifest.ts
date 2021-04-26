const { NODE_ENV } = process.env

// TODO;
// Only two of these allowed
const MANIFEST: DBActionScriptDefinition[] = [
  {
    name: 'login',
    file: 'login',
    getData: async () => {
      return {
        ssl: NODE_ENV !== 'development',
      }
    },
  },
  {
    name: 'get_user',
    file: 'get-user',
    getData: async () => {
      return {
        ssl: NODE_ENV !== 'development',
      }
    },
  },
]

export default MANIFEST
