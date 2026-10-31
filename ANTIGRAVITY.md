# Antigravity Task Brief — Inbox Sprint

## Goal
Build and finish Inbox Sprint, a hackathon web app that turns Gmail cleanup into timed triage rounds. AI estimates importance, explains why, and summarizes each email. The player reviews or changes the suggestion before any mailbox action is applied.

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
5. Do not claim completion until the demo flow works and deployment is verified, or clearly report the exact external blocker.

## Acceptance
- A visitor can start a triage round in sample mode and view message importance, rationale, and concise summary.
- The player can change a suggestion, confirm an action, and see progress update; undo is offered where supported.
- Gmail OAuth, model unavailability, malformed model output, and Gmail API failures have user-readable handling.
- OpenRouter credentials are server-only; LM Studio endpoint/model configuration is supported locally.
- Cloud Run deployment files and setup/deployment instructions are included. Use Firestore and Secret Manager when configured.
- Check responsive layout and key keyboard interactions before handoff.

## Current Status
- App implementation is complete and verified: responsive triage UI, seeded sample inbox, AI scoring/provider integration (OpenRouter and LM Studio), Gmail OAuth/API actions, privacy consent, session handling, Cloud Run configuration, and keyboard navigation shortcuts.
- Automated test suite added in `test/server.test.js` (11/11 tests passing) covering endpoints, session lifecycles, CSRF protection, and error handling.
- Server hardened for malformed URI/cookie edge cases and AI response markdown fence stripping.
- Blocker for deployment: Google Cloud CLI requires interactive authentication (`gcloud auth login`) and project configuration before `gcloud builds submit` can run.
- Next: Stand by to deploy when Cloud credentials/project are authenticated.
