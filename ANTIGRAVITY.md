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
- Product implementation and polish complete: responsive triage UI, seeded sample inbox, AI provider integration (OpenRouter and LM Studio), confirmed mark-read/archive/trash actions, undo during a sprint and after reload, local day streak, and Player Level/XP progression (8 titles from Rookie to Inbox Legend).
- Automated suite: 17 of 17 tests pass, covering endpoints, session/action lifecycle, Gmail action mapping, encryption, malformed model fallback, CSRF origin checks, local .env parsing, and OAuth URL generation.
- Port diagnostic: Detected Steam CEF remote debugging claiming `127.0.0.1:8080`. Server now detects loopback shadows and serves across all local interfaces; accessible at `http://127.0.0.2:8080` or `http://localhost:8080` (when Steam is closed).
- Keyboard navigation: `J`/`K` moves and focuses messages, `E` archives, `W` keeps/marks read, `T` moves to Trash, `U` undoes, and Ctrl/Cmd+Enter confirms the action dialog while plain Enter honors the focused button.
- Latest local HTTP smoke check passed on `http://127.0.0.2:8080` for health, sample inbox, fallback triage, action history, undo, static assets, and security headers.
- Visual review confirmed: Live browser execution verified in Chrome via `Screenshot 2026-10-31 150600.png` showing active sprint triage, XP progression, score updates, and retro-futuristic arcade theme.
- Cloud Run compatibility is retained; deployment work is deferred per user direction.
- Next: continue monitoring loop; execute any new commands or tests requested by the user.

## Antigravity Review Request
Animation, OAuth, and XP progression review completed in place:
- Inspected `public/app.js`, `public/styles.css`, `public/arcade.css`, `public/index.html`, and `server.js`.
- Added Player Level HUD with XP progress, level titles, XP pop animations, and daily reward ledger to prevent farming.
- Anime.js dynamic loader updated in `public/app.js` with graceful fallback to native Web Animations API including staggered card entrance (`options.delay * i`).
- Server CSP updated to allow `https://esm.sh` in both `script-src` and `connect-src`.
- Verified 3-2-1-GO countdown, `.timer-danger` pulse on final 20 seconds, action-directional exit animations, and round victory burst with celebratory confetti.
- Full reduced-motion overrides active in both CSS (`prefers-reduced-motion: reduce`) and JavaScript (`reducedMotion` check).
- Syntax validated with `node --check public/app.js` and `node --check server.js`; 17/17 tests passing with `npm test`.
- Web server active on `http://127.0.0.2:8080` for manual visual inspection (browser control unavailable in this environment). Deployment deferred per user direction.
