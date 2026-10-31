# Inbox Sprint

Inbox Sprint makes email cleanup a quick, focused game. The app analyzes a batch of email, provides summaries and importance estimates, and waits for the player to confirm before archiving or moving a message to Trash.

## Run locally

Requires Node.js 20 or newer. The sample inbox and fallback scoring work without keys:

```powershell
npm start
```

Open http://localhost:8080. Optional settings can be copied from `.env.example` into your shell environment. The server reads environment variables directly and intentionally has no runtime dependency install step.

For local Gmail OAuth, create a Google OAuth web client, enable Gmail API, add `http://localhost:8080/auth/callback` as an authorized redirect URI, and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. The app requests the Gmail `gmail.modify` scope. Use test users in OAuth testing mode for the hackathon.

For hosted AI, set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL`. Set `AI_PROVIDER=lmstudio`, `LM_STUDIO_BASE_URL`, and `LM_STUDIO_MODEL` to use a reachable OpenAI-compatible LM Studio endpoint. If no provider is reachable or configured, sample mode uses local deterministic triage rules and tells the player.

When a connected Gmail account uses OpenRouter, the app shows a consent prompt before the first triage request because the selected sender, subject, and message text are sent to the configured model provider. Sample-mode messages do not need this consent. The app applies per-IP and per-instance request limits; the included hackathon Cloud Run setup limits the service to one instance. Set provider-side usage limits as an additional budget control.

## Google Cloud deployment

The included `Dockerfile` and `cloudbuild.yaml` deploy the app to Cloud Run. The runtime uses Firestore's REST API for small server-side sessions and encrypts Gmail OAuth tokens with AES-256-GCM. Supply a random 32-byte `SESSION_ENCRYPTION_KEY`, encoded as base64, and a separate `SESSION_SECRET`. Do not commit secret values.

### One-time Google Cloud setup

Choose a project and region, then run these commands from PowerShell after authenticating with `gcloud auth login` and selecting the project:

```powershell
$ProjectId = "YOUR_PROJECT_ID"
$Region = "us-central1"
gcloud config set project $ProjectId
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com firestore.googleapis.com gmail.googleapis.com
gcloud artifacts repositories create inbox-sprint --repository-format=docker --location=$Region
gcloud firestore databases create --location=$Region --type=firestore-native
gcloud iam service-accounts create inbox-sprint-runtime --display-name="Inbox Sprint runtime"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:inbox-sprint-runtime@$ProjectId.iam.gserviceaccount.com" --role="roles/datastore.user"
```

Create five Secret Manager secrets (`openrouter-api-key`, `google-client-id`, `google-client-secret`, `session-secret`, and `session-encryption-key`) and grant the runtime service account `roles/secretmanager.secretAccessor` on them. Add secret values using a secure prompt or secret manager interface; do not put values in shell history or source files. For the encryption key, generate 32 random bytes and base64-encode them.

Allow the Cloud Build service account to push to the Artifact Registry repository and deploy Cloud Run revisions. It also needs `roles/iam.serviceAccountUser` on `inbox-sprint-runtime` so it can attach the runtime identity.

### Build and deploy

```powershell
gcloud builds submit --config cloudbuild.yaml --region=$Region --substitutions="_REGION=$Region" .
```

The service is public so hackathon judges can load the sample inbox. Gmail access still requires Google OAuth. The first deployment prints the Cloud Run service URL. In Google Cloud's OAuth client settings, register `<SERVICE_URL>/auth/callback` as an authorized redirect URI and `<SERVICE_URL>` as an authorized JavaScript origin. Then set the app base URL and redirect URI on the Cloud Run service:

```powershell
$ServiceUrl = "PASTE_CLOUD_RUN_SERVICE_URL"
gcloud run services update inbox-sprint --region=$Region --update-env-vars="APP_BASE_URL=$ServiceUrl,GOOGLE_REDIRECT_URI=$ServiceUrl/auth/callback"
```

For later source deployments, pass both URL substitutions so `cloudbuild.yaml` keeps them on the new revision:

```powershell
gcloud builds submit --config cloudbuild.yaml --region=$Region --substitutions="_REGION=$Region,_APP_BASE_URL=$ServiceUrl,_GOOGLE_REDIRECT_URI=$ServiceUrl/auth/callback" .
```

Add teammate/tester accounts to the OAuth consent screen's test user list. Gmail body access through `gmail.modify` is a restricted scope; this setup is intended for the invited test audience, not an unrestricted public release. Review Google's [Gmail scope requirements](https://developers.google.com/workspace/gmail/api/auth/scopes) before a public launch.

## Antigravity coordination

See [`ANTIGRAVITY.md`](./ANTIGRAVITY.md) for the project brief, acceptance flow, and request to re-read the shared brief every 30 seconds while work is active. This workspace does not include a tool for waking or scheduling Antigravity; the polling instruction applies when that agent is active.
