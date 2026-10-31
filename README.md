# Inbox Sprint

Inbox Sprint turns inbox cleanup into a short, focused game. AI estimates what matters, explains its reasoning, and summarizes each message. Players choose to keep important messages in the inbox and mark them read, archive low-value messages, or move unwanted mail to Trash. Every Gmail change requires confirmation and can be undone.

## Try the demo

Requires Node.js 20 or newer. The seeded sample inbox works without OAuth or model credentials:

```powershell
npm start
```

Open http://localhost:8080 and choose **Start your sprint**. The three-minute round shows priority, reasoning, summaries, suggested actions, progress, points, and an undo option. Recent confirmed actions also appear after a reload so they can still be undone. Completing a round updates the local day streak.

Keyboard shortcuts: **J/K** move between messages, **E** archives, **W** keeps, **T** moves to Trash, and **U** undoes the last action. Archive and Trash still require confirmation.

## Connect AI

The server reads settings from environment variables; see `.env.example` for all options.

- OpenRouter: set `OPENROUTER_API_KEY`; optionally set `OPENROUTER_MODEL`.
- LM Studio: set `AI_PROVIDER=lmstudio`, `LM_STUDIO_BASE_URL`, and `LM_STUDIO_MODEL` to a reachable OpenAI-compatible endpoint.
- Without a working model, sample mode uses local triage rules and displays a notice.

For connected Gmail, the first OpenRouter triage asks permission before sending sender, subject, and message text to the configured model. This disclosure is enforced by the server as well as the UI.

## Connect Gmail

Enable Gmail API and configure a Google OAuth web client with the local callback `http://localhost:8080/auth/callback`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`; then add your account as an OAuth test user. The app reads up to 12 unread messages per round. It requests `gmail.modify` so confirmed mark-read, Archive, and Trash actions can be applied; each has an Undo path.

## Project shape

The app uses a dependency-free Node.js HTTP server and responsive HTML/CSS/JavaScript. Gmail and model credentials stay on the server. In Cloud Run mode, Firestore stores minimal session/action history and Gmail tokens are encrypted before storage. Cloud Run deployment configuration remains available in `Dockerfile` and `cloudbuild.yaml`; see [DEPLOYMENT.md](./DEPLOYMENT.md) when deployment work begins.


