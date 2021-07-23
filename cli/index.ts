import path from 'path'
import program from 'commander'

program.command('rules', 'manage Auth0 rules', {
  executableFile: path.join(__dirname, 'commands/rules/index.js'),
})
program.command('db', 'manage database action scripts', {
  executableFile: path.join(__dirname, 'commands/db/index.js'),
})
// TODO; change a bunch of text
program.command('login', 'manage custom text on the login page', {
  executableFile: path.join(__dirname, 'commands/login/index.js'),
})

program.parse(process.argv)
