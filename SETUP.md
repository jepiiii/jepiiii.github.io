# Web Deployment Setup

This project can be hosted entirely by GitHub Pages. Supabase supplies authentication and the database, so no custom web server is required.

## 1. Upload the project to GitHub

For your repository:

`https://github.com/jepiiii/jepiiii.github.io`

replace the repository-root files with the contents of the deployment ZIP.

The important files must remain at the repository root:

```text
index.html
cloud.js
supabase-config.js
README.md
SETUP.md
supabase/
  schema.sql
```

Because this is a GitHub user-site repository named `jepiiii.github.io`, the expected site address is:

`https://jepiiii.github.io/`

## 2. Create a Supabase project

1. Create a new Supabase project.
2. Wait for the database to finish provisioning.
3. Open **SQL Editor**.
4. Paste the entire contents of `supabase/schema.sql`.
5. Run the script once.

The script creates:

- user profiles and public usernames
- banks
- bank entries
- ownership and visibility rules
- Row Level Security policies
- automatic profile creation after sign-up
- the public bank search function

## 3. Configure Authentication URLs

In Supabase, open the Authentication URL configuration.

Set the Site URL to:

```text
https://jepiiii.github.io/
```

Add the same URL to the allowed redirect URLs if your project configuration requires it.

Email/password sign-up is the only login method the current frontend requires. Email confirmation can remain enabled.

## 4. Configure the browser client

Open `supabase-config.js` and replace:

```js
SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
```

with your project's values.

The first value is the Supabase Project URL.

For the key, use the project's **Publishable key** if shown in your dashboard, or the legacy **anon/public key**. This value is intentionally used by browser applications and can be committed when Row Level Security is configured correctly.

Do **not** use any secret or server-only Supabase key.

## 5. Deploy with GitHub Pages

For a `username.github.io` repository, GitHub normally serves the root `index.html` automatically after Pages is enabled for the repository.

If necessary:

1. Open the repository **Settings**.
2. Open **Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save.

After deployment, open:

`https://jepiiii.github.io/`

## 6. Verify the site

Without signing in, confirm that you can:

- run the existing reviewer
- import and export local banks
- open Community Banks
- search public banks
- add a community bank locally

Create an account and confirm that you can:

- sign in
- see your username in the header
- update your username
- select a local bank in Bank Manager
- publish that bank from Account & Publishing
- find the published bank in Community Banks
- see `uploaded by @your_username`
- delete your own published bank

## How publishing works

The site keeps the original local-first workflow.

A local bank stays in browser storage. Publishing makes a separate cloud copy containing the bank name, subject, description, visibility, terms, and definitions.

Public banks can be searched and imported by anyone. Private banks remain visible only to their owner at the database level.

## Search behavior

Community search checks:

- bank name
- subject
- description
- uploader username
- terms
- definitions

Results are ordered by most recently updated.

## Security model

Supabase Row Level Security is enabled on every browser-facing table.

- Everyone may read public profile usernames.
- Everyone may read public banks and their entries.
- Signed-in users may read their own private banks.
- Only the owner may create, update, or delete their banks and entries.
- Only the account owner may change their username.

The browser application does not contain privileged database credentials.

## Updating later

You can keep editing the normal GitHub Pages files. No frontend build command is required.

If you later add moderation, ratings, favorites, bank versioning, or cloud-synced review history, add those as new database tables/policies rather than weakening the existing ownership rules.
