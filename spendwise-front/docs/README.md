# Frontend documentation (JSDoc)

This folder hosts the technical documentation for the SpendWise React
frontend, generated with [JSDoc](https://jsdoc.app/). The documentation
is extracted directly from the JSDoc comments in the `src/` source code
and rendered into `docs/_build/` (which is git-ignored).

## Building the documentation locally

1. From the frontend root, install the project dependencies (they
   already include JSDoc as a dev dependency):

   ```bash
   cd spendwise-front
   npm install
   ```

2. Build the HTML documentation:

   ```bash
   npm run docs
   ```

3. Open the result in your browser:

   ```text
   spendwise-front/docs/_build/index.html
   ```

To wipe the previous build before regenerating, use:

```bash
npm run docs:clean
```

## How the documentation is organised

JSDoc walks every `.js` and `.jsx` file under `src/` (configured in
`jsdoc.json` at the frontend root) and produces a single HTML site with
one page per module/class plus an alphabetical global index.

Conventions used in the source:

- A short module-level comment (`@file`) at the top of every source
  file describes what the module is for.
- React components are documented as functions that return `JSX.Element`,
  with a description of their props and any meaningful side effects
  (network calls, navigation, local storage writes, etc.).
- The two service modules (`authService.js` and `expenseService.js`)
  share `@typedef` definitions for the common API shapes (User,
  Category, Expense, ...) so other files can reuse them without
  redefining the schemas.
