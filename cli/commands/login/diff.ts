import auth0 from '../../lib/client'
import { fs } from 'mz'
import path from 'path'
import { printCodeDiff } from '../../lib/utils'
import { diffLines } from 'diff'

export default async function run() {
  try {
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
    const upToDateTemplates = printCodeDiff(
      [[{ name: 'Login' }, diff]],
      'login'
    )
    if (upToDateTemplates.length) {
      console.log('Login template is up-to-date')
    }
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}
