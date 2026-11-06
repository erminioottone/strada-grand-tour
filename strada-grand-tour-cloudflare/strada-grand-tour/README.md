# Strada — deploy to your GitHub and Cloudflare accounts

This standalone copy includes the full game, original artwork, touch controls, computer opponents and a two-player invitation API. It uses one Cloudflare Worker and a Cloudflare D1 database. It has no ChatGPT runtime dependency or login requirement. It is prepared for deployment; no resources have been created in your own GitHub or Cloudflare account.

GitHub stores the code. Cloudflare runs the game. A GitHub repository can stay private while the game URL is accessible to players.

## 1. Prepare your computer

Use a computer for the initial setup. Install Node.js 22.13 or later (Node 24 is suitable) and Git from their official sites:

- https://nodejs.org/en/download
- https://git-scm.com/downloads

You need a GitHub account and a Cloudflare account. Extract this ZIP. Open a terminal in the `strada-grand-tour` folder, which contains `package.json`, `wrangler.json`, `web/`, `worker/` and `drizzle/`. On Windows, Command Prompt is an easy choice; on macOS use Terminal. Reopen your terminal after installing Node and Git.

Check the installations and install project dependencies:

```sh
node --version
git --version
npm ci
```

The source ZIP contains no `node_modules/`, credentials, local databases, original Site identity, or Git history.

## 2. Create the multiplayer database

Log in to your Cloudflare account using Wrangler:

```sh
npx wrangler login
```

Your browser opens the Cloudflare authorisation page. Approve it in your own browser. Then run:

```sh
npx wrangler d1 create strada-races
```

Copy the returned database ID. If Wrangler offers to edit your configuration automatically, select No for this guide: the file already has the required DB binding.

Open `wrangler.json` in your editor and replace only the all-zero placeholder `database_id` with your new database ID. Keep the binding exactly `DB` and `migrations_dir` exactly `drizzle`:

```json
{
  "name": "strada-grand-tour",
  "main": "worker/index.js",
  "compatibility_date": "2026-05-01",
  "workers_dev": true,
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "strada-races",
      "database_id": "PASTE_YOUR_NEW_DATABASE_ID_HERE",
      "migrations_dir": "drizzle"
    }
  ]
}
```

The database ID is a resource identifier, not a login password. The default zero ID must be replaced before remote operations. If `strada-races` already exists in your account and belongs to this game, find its ID with `npx wrangler d1 list` instead of creating a second database.

Create the database tables by applying the included migration:

```sh
npx wrangler d1 migrations apply strada-races --remote
```

Approve the migration prompt. This must target the new database you just created. The existing SQL files are included; you do not need to generate another migration for initial deployment.

## 3. Check and deploy the game

The following command publishes the game at a publicly reachable Cloudflare URL. It does not carry over the ChatGPT sign-in gate from the original private Site. If family-only sign-in is desired, add Cloudflare Access before sharing the URL; see the privacy section below.

Run:

```sh
npm run build
npm test
npm run validate
npx wrangler deploy
```

Wrangler will display your actual deployed URL. It will normally resemble `https://strada-grand-tour.YOUR_SUBDOMAIN.workers.dev`, but copy the actual URL returned by your deployment. If Cloudflare asks you to set up a workers.dev subdomain, follow that prompt. No custom domain is required.

Open the URL on your computer and phone. Use a landscape phone/tablet and start with Explorer + Sunshine.

Before regular play, check:

- Car, stage, weather and difficulty choices change correctly.
- Time trial starts, pauses, resumes and shows a result.
- Steering and a pedal can be held at the same time on the tablet.
- Two separate devices can create/join a Friends room and start together.

Physical-tablet multi-touch and real network latency still need testing on your devices. The exported build and room API have been checked locally; this package has not been deployed to your own account by the assistant.

## 4. Store the source on GitHub

In GitHub, create a new repository named `strada-grand-tour`. Choose Private if you want the source code private. Leave the repository empty: do not select an initial README, licence or .gitignore, since the project already includes its files.

In the extracted project folder, run these commands. Replace `YOUR_GITHUB_USERNAME` with your actual username (or GitHub organisation name):

```sh
git init
git add .
git commit -m "Add Strada racing game"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/strada-grand-tour.git
git push -u origin main
```

Complete GitHub authentication if requested. Never use a Cloudflare API token as a GitHub password.

If Git asks for your commit identity, run these commands with your preferred name and GitHub email, then repeat the commit and push:

```sh
git config user.name "Your Name"
git config user.email "YOUR_GITHUB_EMAIL"
```

These settings apply to this repository. You can use the private noreply email shown in your GitHub email settings if preferred.

## 5. Connect GitHub for automatic deployments

The Worker already exists from step 3. In the Cloudflare dashboard:

1. Open Workers & Pages and select `strada-grand-tour`.
2. Open Settings, then Builds.
3. Select Connect and choose GitHub.
4. Authorise access to the `strada-grand-tour` repository and select it.
5. Configure these values:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root (leave empty, or `/` if required) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version, if configurable | 22.13+; Node 24 is suitable |

Cloudflare installs dependencies from the checked-in npm lockfile. Use Workers Builds; this package is a Worker application, rather than a static Pages output folder. There is no Pages build-output directory to select.

The Cloudflare Worker name must match `name` in `wrangler.json` (`strada-grand-tour`). Do not deploy a second Worker with a different name unless you also change the configuration intentionally. Disable non-production branch/preview builds initially unless you configure a separate test database; this guide sets up one production database.

Cloudflare handles build authentication through its Git integration. No manually copied Cloudflare token needs to be committed to GitHub.

Push a normal source update to confirm automatic deployment. For example, change a sentence in README.md, then run:

```sh
git add .
git commit -m "Verify automatic deployment"
git push
```

Check the Worker’s build history and Deployments page. The latest commit should build and become the active deployment. Future game changes pushed to `main` will deploy in the same way.

## Future changes

Edit the frontend in `web/` or API logic in `worker/backend.js`. The build embeds the frontend files and backend into `worker/index.js` and copies the Worker to `dist/server/index.js`. The Worker serves the game files directly; no external asset host is needed.

For ordinary game changes:

```sh
npm run build
npm test
npm run validate
git add .
git commit -m "Update Strada"
git push
```

If you change the database schema in `db/schema.ts`, generate and inspect a new migration with `npm run db:generate`. Apply it deliberately with `npx wrangler d1 migrations apply strada-races --remote` before deploying code that needs it. Automatic deployments in this guide do not apply database migrations. Keep applied migrations unchanged; add new ones for future changes.

## Optional local preview

After replacing the database ID in the configuration, initialise a separate local database:

```sh
npx wrangler d1 migrations apply strada-races --local
npm run build
npm run dev
```

Open the local URL printed by Wrangler. Local and cloud databases are separate.

## Access and privacy

The direct deployment has a publicly reachable game URL by default and does not request player names or have public matchmaking or chat. An invitation code is needed to join a two-driver race, but it does not restrict access to the game itself. A private GitHub repository protects the source, not the game URL.

To require sign-in for approved family members, configure Cloudflare Access for the Worker's workers.dev hostname and review the allowed identities before sharing. Official instructions: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

The friend-race service uses HTTPS position snapshots roughly every 350 ms. It is lightweight synchronisation for trusted friends, not a server-authoritative WebSocket game or a public competitive platform. Game rooms expire after 30 minutes and are deleted during the next room creation. Settings and best times stay on the device; infrastructure request logging is controlled by Cloudflare. This copy retains the original game’s features and modest-scale room design; it is not a separately hardened public service.

## Troubleshooting

| Problem | Check |
| --- | --- |
| `npm` or `git` is not recognised | Install Node/Git, reopen the terminal, and check their versions. |
| PowerShell blocks `npm.ps1` | Use Command Prompt (`cmd`) for the commands. |
| Migration cannot find the database | Check login/account and the exact `database_name`/`database_id` in `wrangler.json`. |
| Friends mode reports a busy/unavailable starting line | Verify binding `DB`, the database ID and that the remote migration succeeded; inspect Worker logs. |
| Build reports a Worker name mismatch | Keep the dashboard name and Wrangler `name` both `strada-grand-tour`. |
| Game updates do not appear | Check Cloudflare build logs and active commit, then refresh the browser. |
| GitHub repository not found during connection | Grant the Cloudflare GitHub app access to that exact private repository. |

Cloudflare account usage and billing depend on your plan. Check Workers and D1 usage in your dashboard; no price or unlimited allowance is assumed by this package.

## Reference documentation

Verified against official documentation on 6 November 2026:

- Cloudflare Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- Build configuration: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- D1 setup: https://developers.cloudflare.com/d1/get-started/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- GitHub import: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github

## About the game

Strada is an independent tribute to historic Italian road races, with original SVG/Canvas illustrations and simplified arcade handling. The Ferrari 250 GTO (1962) is a bonus-era car; the other drawings are inspired by Ferrari 166 MM, Mercedes 300 SLR, Alfa Romeo 6C 1750 and Porsche 356. Strada is not affiliated with the event organiser or manufacturers. All five cars and four stages are unlocked. There are no advertising, chat, payment or analytics integrations.
