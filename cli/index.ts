import path from 'path'
import program from 'commander'

program.command('rules', 'manage Auth0 rules', {
  executableFile: path.join(__dirname, 'commands/rules/index.js'),
})
program.command('actions', 'manage Auth0 actions', {
  executableFile: path.join(__dirname, 'commands/actions/index.js'),
})
program.command('db', 'manage database action scripts', {
  executableFile: path.join(__dirname, 'commands/db/index.js'),
})
program.command('login', 'manage the custom login page', {
  executableFile: path.join(__dirname, 'commands/login/index.js'),
})

program.parse(process.argv)
