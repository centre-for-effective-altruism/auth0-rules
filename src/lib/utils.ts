import { Client, Rule } from 'auth0'
import { fs } from 'mz'
import path from 'path'
import auth0 from './client'
import prettier from 'prettier'
import { padEnd, truncate } from 'lodash'
import { cyan, green, yellow } from 'chalk'

const RESULTS_PER_PAGE = 20
/** Paginate through an Auth0 record set */
export function paginateQuery<T>(
  method: ({
    page,
    per_page,
  }: {
    page: number
    per_page: number
  }) => Promise<T[]>
): (page?: number) => Promise<T[]> {
  const fn = async (page = 0): Promise<T[]> => {
    const res = await method({ page, per_page: RESULTS_PER_PAGE })
    if (res.length < RESULTS_PER_PAGE) {
      return res
    }
    return [...res, ...(await fn(page + 1))]
  }
  return fn
}

/** Recursively page through all rules on the Auth0 tenant */
export const getAllRules = paginateQuery<Rule>(auth0.getRules)

/** Recursively page through all clients (applications) on the Auth0 tenant */
export const getAllClients = paginateQuery<Client>(auth0.getClients)

const SCRIPTS_DIRECTORY = path.join(__dirname, '../rules')

/** Generate the role script text */
export async function generateRuleScript(ruleDef: RuleDefinition) {
  const { file, getData } = ruleDef
  const data = getData ? await getData() : {}
  const filedata = await fs.readFile(
    path.join(SCRIPTS_DIRECTORY, 'src', `${file}.js`)
  )
  const scriptBase = filedata
    .toString()
    // remove the export that TS adds
    .replace(/^\s*export\s+\{\}.*$/m, '')
    // Add a comment to the top of the file
    .replace(
      /(^.*?function.*?\{\n)/m,
      `
        /**
         * THIS RULE IS AUTOMATICALLY GENERATED -
         * DON'T EDIT IT DIRECTLY!!!
         *
         * Instead, update it in the Auth0 Rules
         * repository and deploy your changes.
         */
      $1
      `
    )
    .trim()

  // Inject template variables into the template if they exist
  const template = getData
    ? /**
       * It's not possible to add code outside of the single function in a rule
       * declaration, so we can't just prepend the data to the top of the file. This
       * injects our template data as the first line of the function
       */
      scriptBase.replace(
        /(function.*?\{\n)/m,
        `$1
        // Template data
        const TEMPLATE_DATA = ${formatData(data)}\n\n
        `
      )
    : scriptBase

  // compile the template and format
  const script = prettier.format(template, { parser: 'babel' })
  return script
}

/** Add nice coloured log output to log messages */
export function formatUpdateRuleMessage(ruleName: string, exists: boolean) {
  const action = exists ? yellow('(updating)') : green('(creating)')
  const msg = `${padEnd(
    `Rule ${cyan(truncate(ruleName, { length: 30 }))} ${
      exists ? `exists` : `doesnt exist`
    } `,
    60,
    '.'
  )}`
  const str = `${msg} ${action}`

  console.info(str)
}

type CommentValueBase = {
  value: string
  [x: string]: any
}

type CommentValue = CommentValueBase & {
  kind: 'commentValue'
}

/** Add a kind = commentValue prop to an object */
export function getCommentValue(data: CommentValueBase) {
  return {
    kind: 'commentValue',
    ...data,
  }
}

/** Check that an input is a `CommentValue` */
function isCommentValue(input: any): input is CommentValue {
  return (
    typeof input === 'object' &&
    typeof input.value !== 'undefined' &&
    input.kind === 'commentValue'
  )
}

/** Format template data for injection into a template */
export function formatData(data: Record<string, unknown>) {
  const output = []
  for (const key in data) {
    const value = data[key]
    /**
     * If our value is a `CommentValue` array, format it so that it ends up just
     * being an array of all the `values` props
     */
    if (Array.isArray(value) && value.every(isCommentValue)) {
      output.push([
        key,
        `${JSON.stringify(
          value.map(({ kind, ...rest }) => ({ ...rest }))
        )}.map(item => item.value)`,
      ])
    } else {
      output.push([key, JSON.stringify(value)])
    }
  }
  return `{ ${output.map(([key, value]) => `${key}: ${value},`)} }`
}

/** Guard to assert that a Client has a name and id */
export function isValidClient(
  Client: Client
): Client is Client & { client_id: string; name: string } {
  return !!Client.name && !!Client.client_id
}
