# Inbox Sprint

Inbox Sprint turns inbox cleanup into a short, focused game. AI estimates what matters, explains its reasoning, and summarizes each message. Players choose to keep important messages in the inbox and mark them read, archive low-value messages, or move unwanted mail to Trash. Every Gmail change requires confirmation and can be undone.

## Try the demo

Requires Node.js 20 or newer. The seeded sample inbox works without OAuth or model credentials:

```powershell
npm start
```

Open http://localhost:8080 and choose **Start your sprint**. The three-minute round shows priority, reasoning, summaries, suggested actions, progress, points, and an undo option. Read a new message in the round for 5 XP and confirm an action for 10 XP; titles unlock as your level rises. XP and titles persist in that browser, and reading/action XP is awarded once per message per local day. Recent confirmed actions also appear after a reload so they can still be undone. Completing a round updates the local day streak.

Keyboard shortcuts: **J/K** move between messages, **E** archives, **W** keeps, **T** moves to Trash, and **U** undoes the last action. Archive and Trash still require confirmation.

## Connect AI

The server reads settings from environment variables; see `.env.example` for all options.

- OpenRouter: set `OPENROUTER_API_KEY`; optionally set `OPENROUTER_MODEL`.
- LM Studio: set `AI_PROVIDER=lmstudio`, `LM_STUDIO_BASE_URL`, and `LM_STUDIO_MODEL` to a reachable OpenAI-compatible endpoint.
- Without a working model, sample mode uses local triage rules and displays a notice.

After startup, open **AI settings** from a message review to choose an installed LM Studio model or enter a model ID. The selection is saved in that browser and applies to future reviews.

For connected Gmail, the first OpenRouter triage asks permission before sending sender, subject, and message text to the configured model. This disclosure is enforced by the server as well as the UI.

## Connect Gmail

The server reads a local `.env` file on startup without overriding environment variables that are already set. `.env` is git-ignored. If it does not exist yet, create it from the example and edit it locally:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

In Google Cloud Console, select a project and enable the **Gmail API**. In **Google Auth Platform**, configure Branding and Audience, then add yourself under Test users. Create an OAuth client of type **Web application** and add this exact authorized redirect URI:

```text
http://localhost:8080/auth/callback
```

In Data Access, add `https://www.googleapis.com/auth/gmail.modify`. Put the OAuth client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, and set `GOOGLE_REDIRECT_URI` to the same exact URI above. Keep the client secret private; never paste it into chat or commit `.env`.

Run `npm start`, open `http://localhost:8080`, and select **Connect Gmail**. Google redirects back to the local callback after consent. The app then loads up to 12 unread messages per round. It requests `gmail.modify` so the player's confirmed mark-read, Archive, and Trash actions can be applied and undone.

`gmail.modify` is a restricted Gmail scope. Google limits testing-mode apps to listed test users, and test-user grants expire after seven days. A public production app using restricted Gmail scopes needs Google's verification; apps that store or transmit restricted-scope data on their servers must also complete an independent security assessment. See Google's [Gmail scope guidance](https://developers.google.com/workspace/gmail/api/auth/scopes) and [restricted-scope verification requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

## Project shape

The app uses a Node.js HTTP server and responsive HTML/CSS/JavaScript. The browser loads Anime.js 4.1.3 from esm.sh for the sprint motion; built-in Web Animations and CSS effects keep interactions working if the module cannot load. Gmail and model credentials stay on the server. In Cloud Run mode, Firestore stores minimal session/action history and Gmail tokens are encrypted before storage. Cloud Run deployment configuration remains available in `Dockerfile` and `cloudbuild.yaml`; see [DEPLOYMENT.md](./DEPLOYMENT.md) when deployment work begins.


