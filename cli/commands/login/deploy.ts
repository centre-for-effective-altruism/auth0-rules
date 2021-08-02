import { fs } from 'mz'
import path from 'path'
import auth0 from '../../lib/client'

export default async function run() {
  const branding = auth0.branding
  try {
    const newTemplate = (
      await fs.readFile(path.join(__dirname, '../../../templates/login.liquid'))
    ).toString()
    const result = await branding.setUniversalLoginTemplate(undefined, {
      template: newTemplate,
    })
  } catch (err) {
    console.log('err', err)
  }
}
