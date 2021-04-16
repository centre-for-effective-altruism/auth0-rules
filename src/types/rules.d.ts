export {}

declare global {
  interface RuleDefinition {
    /** The name of this rule. Will appear in the UI. */
    name: string
    /** The filename (without extension) corresponding to this rule, in the ./src directory */
    file: string
    /** Is the rule enabled. */
    enabled: boolean
    /** Function to get any data required by this rule */
    getData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
  }

  const TEMPLATE_DATA: Record<string, any>
}
