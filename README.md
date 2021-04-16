# Auth0 Rules

A utility for managing rule definitions on an Auth0 tenant.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Auth0 Rules](#auth0-rules)
  - [Context](#context)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Commands](#commands)
      - [`deploy`](#deploy)
      - [`diff`](#diff)
  - [Environment and Permissions](#environment-and-permissions)
  - [Structure and compilation](#structure-and-compilation)
  - [Defining Rules](#defining-rules)
    - [Basic rule structure](#basic-rule-structure)
    - [The rule manifest](#the-rule-manifest)
    - [Rule ordering](#rule-ordering)
    - [Templating](#templating)
      - [Templating example](#templating-example)
  - [Automatic deploys (`TODO`)](#automatic-deploys-todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Context

CEA uses [Auth0](https://auth0.com/) to provide authentication and authorization
to a number of services (e.g. EA Funds, Giving What We Can, the EA Forum etc).
When users log in, we run a number of
[rules (part of Auth0's login pipeline)](https://auth0.com/docs/rules) that
affect the final login state (e.g. what data is present in the user's access
token or ID token, which permissions they are allowed to request etc.). From
[the docs](https://auth0.com/docs/rules):

> Rules are JavaScript functions that execute when a user authenticates to your
> application. They run once the authentication process is complete, and you can
> use them to customize and extend Auth0's capabilities. For security reasons,
> your Rules code executes isolated from the code of other Auth0 tenants in a
> sandbox.

The default method of creating and editing rules is to use Auth0's web-based UI.
This makes it difficult to version rules, and to ensure that rules are kept in
sync between production, staging, and local Auth0 tenants.

This repo allows us to write our rules in an IDE, using TypeScript, and then
deploy them to an Auth0 tenant with a single command.

## Installation

- Clone the repository
  (`git clone https://github.com/centre-for-effective-altruism/auth0-rules.git`)
- `cd` into the directory (`cd auth0-rules`)
- Install dependencies (`yarn`)
- Build the CLI scripts and rule definitions (`yarn build`)

## Usage

Run the scripts with `yarn rules`

```
Usage: rules [options] [command]

Options:
  -h, --help      display help for command

Commands:
  deploy          Deploy rules to the Auth0 tenant
  diff            Diff locally defined rules against those on the
                  Auth0 tenant
  help [command]  display help for command
```

### Commands

#### `deploy`

```sh
yarn rules deploy
```

Deploys all rules in the manifest to Auth0. Rules that don't match with those
that are already on the Auth0 tenant will be created, those that do will be
updated. Rules that are defined on Auth0 but that aren't in the manifest will be
left alone, and will run before all rules that are in the manifest.

#### `diff`

```
yarn rules diff
```

Diffs locally defined rules against those defined on the Auth0 tenant.

The output will look something like:

```
[[ Changed rules ]]
- Add Scopes to ID Token:
-------------------------
 function addScopesToIdToken(user, context, callback) {
   const requiredApplications = [
-    // Something else
+    // Giving What We Can
     "9QlMQekWad0NT75NYx50VCgOKfJSN44T",
   ];
   // only run if our application is on the list
   if (requiredApplications.includes(context.clientID)) {
-    const namespace = "https://parfit-staging.effectivealtruism.org";
+    const namespace = "https://parfit.effectivealtruism.org";
     context.idToken[`${namespace}/scope`] = context.accessToken.scope;
   }
   callback(null, user, context);
 }

[[ Up-to-date rules ]]
3 rules defined in the manifest are identical to those that exist on the Auth0 tenant:
- Add Default Role To All Users
- Filter scopes
- Log Context

[[ Missing rules ]]
1 rules defined in the manifest do not exist on the Auth0 tenant:
- Add email to access token

[[ Extra rules ]]
2 rules exist on the Auth0 tenant that are not included in the manifest:
- Simulate Signup Missing-Scope Issue
- auth0-account-link-extension
```

## Environment and Permissions

You'll need to ensure that the Auth0 tenant has a client application set up to
work with the CLI. The application should be a **Machine-to-Machine**
application, and needs the following permissions on the `Auth0 Management API`.

- `create:rules`
- `read:rules`
- `update:rules`
- `read:clients`
- `read:roles`

_(Note that if you add additional scripts, for example in `getData()` calls in
the manifest, you might need to give the application additional permissions.)_

To connect to this application, the CLI expects you to have the following
variables in your shell environment. If you're developing locally, you can add
them to a `.env` file in the project root.

```
AUTH0_DOMAIN=<your Auth0 tenant domain>
AUTH0_CLIENT_ID=<client ID for the Rules Managment client application >
AUTH0_CLIENT_SECRET=<client secret for the Rules Management client application>
```

## Structure and compilation

This repo consists of two main folders:

- `./rules` – contains the actual rule definitions that will run on Auth0
- `./src` – contains the scripts that run the CLI, and the manifest file that
  tells these scripts which rules to deploy to Auth0.

These folders are independent TypeScript projects, due to them each requiring
different compilation options.

- The rule definitions are compiled as standalone `ES2020` scripts. This means
  that they will compile to Javascript that looks almost identical to the
  TypeScript source (though with type information removed)
- The CLI scripts are compiled to `ES5` Javascript, for easier consumption by
  Node.js, as Node doesn't currently support ESModules syntax (e.g. `import`).

Both the CLI and the rule definitions are compiled to the `./dist` folder. You
can build both at once by running `yarn build` (which is an alias for
`yarn build:cli && yarn build:rules`).

You can run `yarn build:rules:watch` to have TypeScript automatically compile
rules as you are developing them. If instead you are editing the CLI itself, you
should run `yarn build:cli:watch`.

## Defining Rules

There are two steps to writing an Auth0 rule:

- Defining the rule itself (as a file in `./rules/src`)
- [Registering the rule in the manifest](#the-rule-manifest) (`./src/manifest`)

Rules are defined in the `./rules/src` directory. Each rule lives in its own
file. Rules are written as Typescript files (`.ts` extension).

Because the rules will be executed in the context of the Auth0 WebTask
environment, they should not have any external dependencies. This means that the
only imports in a rule definition file should be TypeScript typings.

### Basic rule structure

A basic rule looks like this:

```ts
import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'

async function myAwesomeRule(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  // Do some fun things here

  // Return the updated user/context back to the rules pipeline
  callback(null, user, context)
}
```

### The rule manifest

The rule manifest declares the rules that will be deployed to Auth0. The
manifest is the default export of `./src/manifest.ts`.

The manifest exports an array of `RuleDefinitions`, which are objects with the
following properties:

- `name` (string): The name of the rule that will appear in the Auth0 UI. This
  is used to match against existing rules on Auth0 for the purpose of diffing
  and deploying, so it should be unique (and if you're adding a rule that
  already exists on Auth0 to this repo, you should use the name of the existing
  rule).
- `file` (string): The filename (without extension) of the rule definition file
  matching this rule, in `./rules/src`.
- `enabled` (boolean): Whether this rule is enabled or not
- `getData` (function): [optional] A function that gets data from the Auth0
  tenant that should be injected into the rule (see [Templating](#templating)
  below). Should return an object with keys corresponding to Handlebars template
  variables. Can be `async`.

### Rule ordering

Rules run in series. When deployed, the rules will be ordered as follows:

- Any rules that are on the Auth0 tenant, but that aren't defined in the
  manifest will run first, in their current order
- Rules defined in the manifest will run in the order that they are defined in
  the manifest

### Templating

Sometimes, we need to inject variables that will be different on each Auth0
tenant. In these cases, we can use an inline Handlebars template, that will be
replaced by data from the `getData()` function in the rule manifest.

In instances where you have a string that should be injected dynamically into
the template, you should use the following syntax: `{{{ myVar }}}` (where
`myVar` is a property of the object returned by `getData()`). Quotation marks
around the string will be automatically removed before the template data is
injected, so you don't need to double escape them.

While normal Handlebars templates typically use two braces for template
variables (e.g. `{{ myVar }} `), you probably want to use three (e.g.
`{{{ myVar }}}`), as the two-brace version will escape HTML characters like
quotes.

Note that you might have to get creative if you want to inject multiple
components (e.g. a number of array elements) into the rule. Handlebars is just
doing a dumb substitution, so you should format whatever you inject as you want
it to appear in the code (including string quoting etc.). For example:

```ts
// in getData()
const clientIds = ['foo', 'bar']
const whitelist = clientIds.map((id) => `'${id}'`).join(', ')
return { whitelist }
```

There is a utility function `getValueAndComment` which can help formatting pairs
of variables and comments (example below).

#### Templating example

Rule definition (e.g. `./rules/add-scopes-to-id-token.ts`). Note the string
`{{{ whitelist }}}`, which will be replaced by our injected data.

```ts
import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

function addScopesToIdToken(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
) {
  const requiredApplications = ['{{{ whitelist }}}']
  // only run if our application is on the list
  if (requiredApplications.includes(context.clientID)) {
    const namespace = 'https://parfit.effectivealtruism.org'
    context.idToken[`${namespace}/scope`] = context.accessToken.scope
  }

  callback(null, user, context)
}
```

Manifest entry:

```ts
const MANIFEST = [
  // Other rules...
  {
    name: 'Add Scopes to ID Token',
    file: 'add-scopes-to-id-token',
    enabled: true,
    getData: async () => {
      const applicationNames = ['My First Application', 'My Second Application']
      const Clients = await getAllClients()
      const whitelist = Clients.filter(
        (Client) => !!Client.name && applicationNames.includes(Client.name)
      )
        .map((Client) => getValueAndComment(Client.client_id, Client.name))
        .join(',\n')
      return { whitelist }
    },
  },
  // More rules...
]
```

The `getData` call will return the following object:

```js
{
  whitelist: `// My First Application\n'123abc456def',\n//My Second Application\n'987xyz654uvw'`
}
```

Which will be compiled into the following rule code:

```js
function addScopesToIdToken(user, context, callback) {
  const requiredApplications = [
    // My First Application
    '123abc456def',
    //My Second Application
    '987xyz654uvw',
  ]
  // only run if our application is on the list
  if (requiredApplications.includes(context.clientID)) {
    const namespace = 'https://parfit.effectivealtruism.org'
    context.idToken[`${namespace}/scope`] = context.accessToken.scope
  }

  callback(null, user, context)
}
```

## Automatic deploys (`TODO`)

_Coming soon: GitHub actions to auto-deploy these rules to the relevant Auth0
tenant when merging to `master` or `staging`_
