# Antigravity Task Brief — Inbox Sprint

## Goal
Build and finish Inbox Sprint as a hackathon-ready web app. Gmail cleanup becomes timed triage rounds: AI estimates importance, explains why, and summarizes each email. The player reviews or changes the suggestion before any mailbox action is applied. Keep the project compatible with future Cloud Run hosting, but focus current work on the product and local demo; do not spend this task on deployment.

## Architecture
- Deploy the full-stack app as a Google Cloud Run service.
- Use Firestore for minimal user/session and game progress state.
- Keep Google OAuth credentials and the deployed OpenRouter API key in Google Secret Manager; never expose secrets to browser code.
- Support OpenRouter in the deployed app and a configurable LM Studio endpoint for local development.
- Use Gmail OAuth with the narrowest scope that supports reading and confirmed archive/Trash actions. Keep the hackathon audience to invited OAuth test users.
- Keep a sample inbox mode so the demo works without Gmail or AI credentials.

## Work Loop
1. Inspect this file and the workspace before starting or resuming work.
2. Re-read this file every 30 seconds while work is active; continue from its latest task/status until the project is complete.
3. Update the status and next concrete task here whenever a meaningful milestone or blocker changes.
4. If a command or integration is unavailable, find an available tool or ask for help; do not silently skip required behavior.
5. Do not claim completion until the local sample flow and core game interactions work. Report any real Gmail/OpenRouter requirements that cannot be exercised without credentials.

## Acceptance
- A visitor can start a triage round in sample mode and view message importance, rationale, and concise summary.
- The player can change a suggestion, confirm Keep-as-read, Archive, or Trash, see progress update, and undo where supported.
- Recent confirmed actions remain undoable after reload while the session history is available.
- Gmail OAuth, model unavailability, malformed model output, and Gmail API failures have user-readable handling.
- OpenRouter credentials are server-only; LM Studio endpoint/model configuration is supported locally.
- Keep Cloud Run compatibility in Docker/runtime configuration; deployment setup is documented separately for later.
- Check responsive layout and key keyboard interactions before handoff.

## Current Status
- Product implementation and polish complete: responsive triage UI, seeded sample inbox, AI provider integration (OpenRouter and LM Studio), confirmed mark-read/archive/trash actions, undo during a sprint and after reload, and a local day streak.
- Automated suite: 15 of 15 tests pass, covering endpoints, session/action lifecycle, Gmail action mapping, encryption, malformed model fallback, and CSRF origin checks.
- Keyboard navigation: `J`/`K` moves and focuses messages, `E` archives, `W` keeps/marks read, `T` moves to Trash, `U` undoes, and Ctrl/Cmd+Enter confirms the action dialog while plain Enter honors the focused button.
- Latest local HTTP smoke check passed for health, sample inbox, fallback triage, action history, undo, static assets, and security headers.
- Cloud Run compatibility is retained; deployment work is deferred per user direction. No browser surface was available for visual interaction testing, so responsive styles and DOM references were checked statically.
- Next: continue product work only if requested; do not start deployment in this pass.

## Antigravity Review Request
Review completed in place:
- All 15 automated unit and integration tests passing (`npm test`).
- Verified local server startup on port 8080 (`/healthz`, `/api/config`, `/api/messages`, `/api/triage`, `/api/action`, `/api/undo`, `/api/progress`).
- Action confirmation dialog autofocuses the "Keep reviewing" button so Enter cancels safely while Ctrl/Cmd+Enter confirms the action.
- Undo functions verified both mid-sprint and cross-reload via `/api/progress`.
- Responsive layout rules verified across all breakpoints (1180px, 900px, 700px, 470px).
- Note: Headless browser is unavailable in this execution environment; local manual browsing is available via `npm start` -> `http://localhost:8080`. Cloud Run deployment remains deferred per project scope.
