export {}

declare global {
  interface DBActionScriptDefinition {
    // TODO;
    /** The name of this rule. Will appear in the UI. */
    name: 'login' | 'get_user'
    /** The filename (without extension) corresponding to this rule, in the ./src directory */
    file: string
    /** Function to get any data required by this rule */
    getData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
  }
}
