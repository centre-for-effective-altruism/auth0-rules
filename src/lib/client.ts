import { ManagementClient } from 'auth0'

const {
  AUTH0_TENANT_DOMAIN,
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
} = process.env

const auth0 = new ManagementClient({
  // For some reason, the management client can't do a Machine-to-Machine credentials grant
  // using our custom domain, so in production environments we need to specify
  // the tenant domain (e.g. effectivealtruism.auth0.com) rather than our normal
  // custom domain (login.effectivealtruism.org)
  // if the var isn't set, it falls back to the regular domain, which means
  // dev environments don't need to set a duplicate variable
  // see https://github.com/auth0/node-auth0/issues/292
  domain: AUTH0_TENANT_DOMAIN || AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
})

export default auth0
