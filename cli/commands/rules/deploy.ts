import { Rule } from 'auth0'
import { red, blue, yellow, green } from 'chalk'
import { exit } from 'process'
import auth0 from '../../lib/client'
import {
  getAllRules,
  generateScript,
  formatUpdateRuleMessage,
} from '../../lib/utils'
import { RULE_MANIFEST } from '../../manifests'

function getLargestOrder(Rules: Rule[]): number {
  const ruleNames = RULE_MANIFEST.map((ruleDef) => ruleDef.name)
  const highestOrder = Rules.filter(
    (Rule) => Rule.name && !ruleNames.includes(Rule.name)
  ).reduce((prev, Rule) => {
    return Rule.order && Rule.order >= prev ? Rule.order + 1 : prev
  }, 1)
  return getNextOrder(highestOrder, Rules)
}

/** Avoid conflicts with existing rule orders */
function getNextOrder(order: number, Rules: Rule[]): number {
  const existingOrders = Rules.map((Rule) => Rule.order).filter(
    (a): a is number => !!a
  )
  order++
  if (existingOrders.includes(order)) {
    return getNextOrder(order, Rules)
  }
  return order
}

export default async function run() {
  try {
    // get all rules currently defined on the Auth0 tenant
    const Rules = await getAllRules()
    // Get the order of the last rule
    let order = getLargestOrder(Rules)
    for (const ruleDef of RULE_MANIFEST) {
      // generate the final script
      const script = await generateScript(ruleDef, 'rules')
      // check if the rule exists
      const existingRule = Rules.find((Rule) => Rule.name === ruleDef.name)
      if (existingRule?.id) {
        // Update an existing rule
        formatUpdateRuleMessage(ruleDef.name, true)
        await auth0.updateRule(
          { id: existingRule.id },
          { enabled: ruleDef.enabled, script, order }
        )
        console.log(`Rule updated ${green(`\u2713`)}`)
      } else {
        // Create a new rule
        formatUpdateRuleMessage(ruleDef.name, false)
        await auth0.createRule({
          name: ruleDef.name,
          enabled: ruleDef.enabled,
          script,
          order,
        })
        console.log(`Rule created ${green(`\u2713`)}`)
      }
      order = getNextOrder(order, Rules)
    }
  } catch (err) {
    console.error(red(err.message))
    exit(1)
  }
}
