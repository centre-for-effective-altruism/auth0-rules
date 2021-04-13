import { Client, Rule } from 'auth0'
import { fs } from 'mz'
import path from 'path'
import auth0 from './client'
import Handlebars from 'handlebars'
import prettier from 'prettier'
import { padEnd, truncate } from 'lodash'
import { blue, cyan, green, yellow } from 'chalk'

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
export async function generateRuleScript<T>(ruleDef: RuleDefinition) {
  const { file, getData } = ruleDef
  const data = getData ? await getData() : {}
  const filedata = await fs.readFile(
    path.join(SCRIPTS_DIRECTORY, 'src', `${file}.js`)
  )
  const scriptBase = filedata
    .toString()
    // remove the export that TS adds
    .replace(/^\s*export\s+\{\}.*$/m, '')
    .trim()
    // Remove any quotes surrounding Handlebars variables
    .replace(/['"`]{{/g, '{{')
    .replace(/}}['"`]/g, '}}')

  // build a handlebars template
  const template = Handlebars.compile(scriptBase)

  // compile the template and format
  const script = prettier.format(template(data), { parser: 'babel' })
  return script
}

/** Format a comment/value pair for insertion into a template */
export function getValueAndComment(value?: string, comment?: string): string {
  return [
    '\n',
    comment ? `// ${comment}` : null,
    '\n',
    value ? `'${value}'` : null,
    '\n',
  ]
    .filter((a) => a)
    .join('')
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
