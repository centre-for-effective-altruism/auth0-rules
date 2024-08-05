import { GetActions200ResponseActionsInnerSupportedTriggersInnerId } from 'auth0'
import type { SupportedActionTrigger } from '../lib/utils'

export {}

declare global {
  interface ActionDefinition {
    /** The name of this action. Will appear in the UI. */
    name: string
    /** The filename (without extension) corresponding to this action, in the ./src directory */
    file: string
    /** Is the action enabled. */
    enabled: boolean
    /** Function to get any data required by this action */
    getData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
    /** The event this action is triggered by */
    trigger: SupportedActionTrigger
    /** The version of the trigger to use (you can find the latest version with the getAllTriggers endpoint) */
    triggerVersion: string
  }
}
