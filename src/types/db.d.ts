export {}

declare global {
  interface DBActionScriptDefinition {
    /** Which script would you like to update */
    name: 'login' | 'get_user'
    /**
     * The filename (without extension) corresponding to this script, in the
     * db/src directory
     */
    file: string
    /**
     * Function to get any data required by this script
     *
     * The return value is injected to the top of the script's function as TEMPLATE_DATA
     */
    getData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
  }
}
