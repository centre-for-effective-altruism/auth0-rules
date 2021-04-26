# Auth0 Rules

A utility for managing rule definitions on an Auth0 tenant.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Contents

- [Context](#context)
- [Installation](#installation)
- [Usage](#usage)
  - [Commands](#commands)
- [Environment and Permissions](#environment-and-permissions)
- [Structure and compilation](#structure-and-compilation)
- [Defining Rules](#defining-rules)
  - [Basic rule structure](#basic-rule-structure)
  - [External dependencies](#external-dependencies)
  - [The rule manifest](#the-rule-manifest)
  - [Rule ordering](#rule-ordering)
  - [Templating](#templating)
- [Automatic deploys (`TODO`)](#automatic-deploys-todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Context

[CEA](https://www.centreforeffectivealtruism.org) uses
[Auth0](https://auth0.com/) to provide authentication and authorization to a
number of services (e.g. [EA Funds](https://funds.effectivealtruism.org),
[Giving What We Can](https://www.givingwhatwecan.org), the
[EA Forum](https://forum.effectivealtruism.org) etc). When users log in, we run
a number of
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
     "abc123def456",
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

<!-- TODO; -->

You'll need to ensure that the Auth0 tenant has a client application set up to
work with the CLI. The application should be a **Machine-to-Machine**
application, and needs the following permissions on the `Auth0 Management API`.

**Base permissions (required to manage rules via the API)**

- `create:rules`
- `read:rules`
- `update:rules`
- `read:connections`
- `update:connections`

**Permissions used by specific rule generators**

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
rules as you are developing them. If instead you are editing the CLI itself
(including the manifest file), you should run `yarn build:cli:watch`.

If you're everything, just buildwatch everything (TODO;)

## Defining Rules

There are two steps to writing an Auth0 rule:

- Defining the rule itself (as a file in `./rules/src`)
- [Registering the rule in the manifest](#the-rule-manifest) (`./src/manifest`)

Rules are defined in the `./rules/src` directory. Each rule lives in its own
file. Rules are written as Typescript files (`.ts` extension).

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

### External dependencies

Because the rules will be executed in the context of the Auth0 WebTask
environment, they can't use imports from other files. This means that the only
`import` statements in a rule definition file should be TypeScript typings.

```ts
// These are type definitions, which will be removed at build time by the TS compiler
// This are fine to import in your rule file
import {
  IAuth0RuleCallback,
  IAuth0RuleContext,
  IAuth0RuleUser,
} from '@tepez/auth0-rules-types'
// This will not work when run on Auth0 🚨
import { doSomething } from 'my-lib'

async function myAwesomeRule(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  // doSomething() will not be available here 🚨
  const foo = doSomething(user.id)
  // ...
  return callback(null, user, context)
}
```

It _is_ possible to use external libraries, but they need to be dynamically
`require`d at runtime. For example:

```ts
// Only type definitions imported, so we're all OK here
import {
  IAuth0RuleUser,
  IAuth0RuleContext,
  IAuth0RuleCallback,
} from '@tepez/auth0-rules-types'

async function addDefaultRole(
  user: IAuth0RuleUser<unknown, unknown>,
  context: IAuth0RuleContext,
  callback: IAuth0RuleCallback<unknown, unknown>
): Promise<void> {
  // Dynamic require works fine 👍
  const ManagementClient = require('auth0@2.31.0').ManagementClient

  const management = new ManagementClient({
    domain: auth0.domain,
    clientId: configuration.AUTH0_CLIENT_ID,
    clientSecret: configuration.AUTH0_CLIENT_SECRET,
    scope: 'read:users update:users read:roles',
  })
  // ...
}
```

For a full list of modules that can be dynamically required, see the
[Auth0 Extensions 'Can I Require' tool](https://auth0-extensions.github.io/canirequire/).
Further discussion about using modules can be found
[in the Auth0 docs](https://auth0.com/docs/best-practices/rules-best-practices/rules-environment-best-practices).

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
tenant. For example, maybe you only want a rule to apply to certain
applications, so you want to use a list of these application IDs into your
function – obviously these IDs will be different on different tenants. Instead
of hard-coding these values into the rule code, you can instead inject a
`TEMPLATE_DATA` global, that will be populated by data from the `getData()`
function in the rule manifest.

The `TEMPLATE_DATA` variable is declared as a TypeScript global with type
`Record<string, any>`, so rule file will compile happily. It's a good idea to
type any assignments in your rule function:

```ts
function myGreatFunction() {
  const whitelist: string[] = TEMPLATE_DATA.whitelist
  // ... do stuff
}
```

When rules are compiled, any rule that has a `getData()` property on its
manifest will inject a `TEMPLATE_DATA` variable into the top of the function
declaration:

```js
function myGreatFunction() {
  // Template data
  const TEMPLATE_DATA = {
    whitelist: ['abc123def456'],
  }

  const whitelist = TEMPLATE_DATA.whitelist
  // ... do stuff
}
```

You can use any data type for the value of the keys in `TEMPLATE_DATA`. Values
are passed to `JSON.stringify()` for injection into the code.

#### Templating helpers

**`getCommentValue()`**

Injecting values is all well and good, but a simple list of random object IDs is
difficult to read. If you have an array of IDs and you want to include
additional data for better readability, you can use the `getCommentValue()`
function to build your array of input data.

`getCommentValue()` takes a single argument, which is an object that has a
`value` property. If you pass an array of these objects as a property of
`TEMPLATE_DATA`, it will be mapped into an array of just the values in each
object's respective `value` property.

So, instead of ...

```ts
const TEMPLATE_DATA = {
  whitelist: ['abc', 'def'],
}
```

... you instead see:

```ts
const TEMPLATE_DATA = {
  whitelist: [
    {
      name: 'Something descriptive',
      value: 'abc',
    },
    {
      name: 'Another item',
      value: 'def',
    },
  ].map((item) => item.value),
}
```

See the example below for a full demonstration of how this works end-to-end.

#### Templating example

Rule definition (e.g. `./rules/add-scopes-to-id-token.ts`).

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
  const requiredApplications: string[] = TEMPLATE_DATA.whitelist
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
      const applicationNames = ['Giving What We Can']
      const Clients = await getAllClients()
      const whitelist = Clients.filter(isValidClient)
        .filter((Client) => applicationNames.includes(Client.name))
        .map((Client) =>
          getCommentValue({
            applicationName: Client.name,
            value: Client.client_id,
          })
        )
      return { whitelist }
    },
  },
  // More rules...
]
```

The `getData` call will return the following object:

```js
{
  whitelist: [
    {
      applicationName: 'Giving What We Can',
      value: 'abc123def456',
    },
  ]
}
```

Which will be compiled into the following rule code:

```js
function addScopesToIdToken(user, context, callback) {
  // Template data
  const TEMPLATE_DATA = {
    whitelist: [
      {
        applicationName: 'Giving What We Can',
        value: 'abc123def456',
      },
    ].map((item) => item.value),
  }

  const requiredApplications = TEMPLATE_DATA.whitelist
  // only run if our application is on the list
  if (requiredApplications.includes(context.clientID)) {
    const namespace = 'https://parfit.effectivealtruism.org'
    context.idToken[`${namespace}/scope`] = context.accessToken.scope.join(' ')
  }
  callback(null, user, context)
}
```

## Automatic deploys (`TODO`)

_Coming soon: GitHub actions to auto-deploy these rules to the relevant Auth0
tenant when merging to `master` or `staging`_
