const { NODE_ENV } = process.env

const CONNECTION_NAMES = {
  // TODO; no development
  development: 'Forum-User-Migration',
  staging: 'Username-Password-Authentication',
  production: 'Username-Password-Authentication',
}
export const CONNECTION_NAME =
  CONNECTION_NAMES[NODE_ENV] || 'Username-Password-Authentication'
