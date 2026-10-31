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
- The player can change a suggestion, confirm an action, and see progress update; undo is offered where supported.
- Gmail OAuth, model unavailability, malformed model output, and Gmail API failures have user-readable handling.
- OpenRouter credentials are server-only; LM Studio endpoint/model configuration is supported locally.
- Keep Cloud Run compatibility in Docker/runtime configuration; deployment setup is documented separately for later.
- Check responsive layout and key keyboard interactions before handoff.

## Current Status
- Product implementation and polish complete: responsive triage UI, seeded sample inbox, AI scoring/provider integration (OpenRouter and LM Studio), confirmation dialogs for keep/archive/trash, and full undo functionality.
- Automated test suite expanded and verified in `test/server.test.js`: 14 of 14 unit and integration tests passing, including encryption roundtrips, malformed model fallbacks, CSRF origin checks, and action lifecycles.
- Keyboard navigation active (`J`/`K` navigation, `E` archive, `W` keep, `T` trash, `U` undo, `Enter` confirm).
- Deployment instructions documented in `DEPLOYMENT.md`. Deployment to Cloud Run deferred until Google Cloud CLI authentication (`gcloud auth login`) and secrets are provided.
- Next: Maintain monitor loop and verify any new user requirements or credentials as they arrive.
