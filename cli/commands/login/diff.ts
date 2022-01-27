import auth0 from '../../lib/client'
import { fs } from 'mz'
import path from 'path'
import { printCodeDiff, deepSortObject } from '../../lib/utils'
import { diffLines } from 'diff'

export default async function run() {
  try {
    await diffLoginTemplate()
    await diffCustomText()
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

async function diffLoginTemplate() {
  const branding = auth0.branding
  let existingTemplate
  try {
    existingTemplate = (await branding.getUniversalLoginTemplate()).body
  } catch (err) {
    if (err.statusCode === 404) {
      existingTemplate = ''
    } else {
      throw err
    }
  }
  const newTemplate = (
    await fs.readFile(path.join(__dirname, '../../../templates/login.liquid'))
  ).toString()
  const diff = diffLines(existingTemplate, newTemplate)
  const upToDateTemplates = printCodeDiff([[{ name: 'Login' }, diff]], 'login')
  if (upToDateTemplates.length) {
    console.log('✔ Login template is up-to-date')
  }
}

async function diffCustomText() {
  const existingCustomText = await auth0.prompts.getCustomTextByLanguage({
    prompt: 'signup',
    language: 'en',
  })
  const sortedExistingCustomText = deepSortObject(existingCustomText)

  const newCustomText = JSON.parse(
    (
      await fs.readFile(
        path.join(__dirname, '../../../templates/custom-text.json')
      )
    ).toString()
  )
  const sortedNewCustomText = deepSortObject(newCustomText)
  const textDiff = diffLines(
    JSON.stringify(sortedExistingCustomText),
    JSON.stringify(sortedNewCustomText)
  )
  const upToDateCustomText = printCodeDiff(
    [[{ name: 'CustomText' }, textDiff]],
    'login'
  )
  if (upToDateCustomText.length) {
    console.log('✔ Login custom text is up-to-date')
  }
}
