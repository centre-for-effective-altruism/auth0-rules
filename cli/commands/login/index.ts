import program from 'commander'
import diff from './diff'
import deploy from './deploy'

program
  .command('deploy')
  .description('Deploy login page updates to the Auth0 tenant')
  .action(deploy)

program
  .command('diff')
  .description(
    'Diff locally defined login page text against those on the Auth0 tenant'
  )
  .action(diff)

program.parse(process.argv)
