# AI Mystery Room

AI Mystery Room turns a fictional premise into an investigation. The repository currently contains the React + Vite frontend, Tailwind design system, Express API, environment validation, Mongoose models, Zod case contracts, deterministic development fixtures, and backend Gemini case generation.

Generated cases are validated before they are returned. MongoDB persistence is wired for cases, private solutions, and investigation sessions, but still needs verification against a real MongoDB instance. The deterministic development fixtures provide playable investigations without Gemini. When MongoDB is unavailable, fixtures and their sessions use process memory and session progress is lost on server restart. Generated cases return `persisted: false` when there is no database connection.

## Requirements

- Node.js 22.19+ (the backend uses Node's system CA store for TLS verification; Node 20.19+ is required by the configured Vite 7 toolchain)
- npm 10+
- A Gemini API key and model name to use case generation
- MongoDB is optional for the in-memory fixture and generation routes

## Setup

1. Install dependencies from the repository root:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `GEMINI_MODEL` in the server environment to enable generation. Keep the key in `.env`; never use a `VITE_` variable for secrets. Leave `MONGODB_URI` blank if you do not need a database connection.

   ```sh
   cp .env.example .env
   ```

   In PowerShell, use `Copy-Item .env.example .env`.

3. Start the frontend and backend together:

   ```sh
   npm run dev
   ```

   The Vite frontend runs at <http://localhost:5173> and proxies `/api` requests to Express at <http://localhost:5000>.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start frontend and backend in parallel |
| `npm run dev:client` | Start Vite only |
| `npm run dev:server` | Start Express only |
| `npm run build` | Build the production frontend |
| `npm test` | Run backend and frontend tests (Gemini is mocked; no key or API credits required) |

The MongoDB restart-persistence integration test is disabled unless `MONGODB_INTEGRATION_TEST=1`. When enabled, it requires `MONGODB_TEST_URI` and refuses to connect unless the URI names a database marked `test`, `testing`, `integration`, or `disposable` (for example, `ai-mystery-room-test`). It never reads or uses `MONGODB_URI`. The test writes a uniquely named case, solution, and session, disconnects and reconnects with a fresh store, verifies the completed verdict and score, then deletes only those unique records.

To use it later, create a separate disposable database in Atlas, configure `MONGODB_TEST_URI` in your local environment with that database's URI, and explicitly opt in for that test run:

```powershell
$env:MONGODB_TEST_URI = 'mongodb+srv://<test-user>:<test-password>@<cluster-host>/ai-mystery-room-test?retryWrites=true&w=majority'
$env:MONGODB_INTEGRATION_TEST = '1'
npm test
Remove-Item Env:\MONGODB_TEST_URI
Remove-Item Env:\MONGODB_INTEGRATION_TEST
```

Use a test-only database user with access limited to the disposable database. Keep the real URI in your local environment and never substitute the normal project database URI.

The health endpoint is `GET http://localhost:5000/api/v1/health`. It reports API liveness and database and Gemini configuration status. `generation: "configured"` means both Gemini environment values are present; it does not test a live Gemini connection.

After configuring the server variables and starting the project, manually try generation with:

```sh
curl -X POST http://localhost:5000/api/v1/cases \
  -H "Content-Type: application/json" \
  -d '{"scenario":"A rare map vanishes from a locked archive overnight.","difficulty":"easy","category":"historical_mystery"}'
```

The response should have `success: true` and a public `data.case`. `data.persisted` is true only when MongoDB storage succeeds; it is false without a database connection. `data.generation.method` identifies whether Gemini generated the case or a validated prebuilt fixture was selected. A temporary provider-unavailable or timeout error selects the fixture matching the requested difficulty; missing configuration, quota errors, and invalid model output remain errors. The creation page labels the fallback and links directly to its playable investigation. Without either Gemini setting, the endpoint returns `503 GENERATION_NOT_CONFIGURED`.

## Case API

- `POST /api/v1/cases` — generate a case from `{ "scenario": "...", "difficulty": "easy|medium|hard", "category": "any" }`. Scenario length must be 10–3,000 characters; category is optional and defaults to `any`. Returns `201` with the strict public case DTO and a `persisted` flag that reflects MongoDB storage. A live call requires `GEMINI_API_KEY` and `GEMINI_MODEL`.
- `GET /api/v1/cases` — list the Easy, Medium, and Hard development fixtures.
- `GET /api/v1/cases/:caseId` — retrieve a public fixture DTO.
- `GET /api/v1/cases/:caseId/suspects/:suspectId` — retrieve one public suspect profile.
- `GET /api/v1/cases/:caseId/evidence` — list public evidence; optional `?type=chat|image|cctv|witness|document|timeline` filter.
- `GET /api/v1/cases/:caseId/evidence/:evidenceId` — retrieve one public evidence item.
- `POST /api/v1/cases/:caseId/sessions` — create an investigation session and return its opaque session ID and bearer credential.
- `GET /api/v1/cases/:caseId/session?sessionId=...` — retrieve session progress with the session bearer credential.
- `POST /api/v1/cases/:caseId/clues/:clueId/discover` — record a clue once and return its public clue details and updated progress. Requires `{ "sessionId": "..." }` and `Authorization: Bearer <sessionToken>`.
- `POST /api/v1/cases/:caseId/hints` — request a difficulty-limited hint. Requires `{ "sessionId": "...", "requestId": "..." }` and the bearer credential. Reusing a request ID replays the same hint without consuming another.
- `POST /api/v1/cases/:caseId/accuse` — submit `{ "sessionId": "...", "suspectId": "..." }`. Requires the bearer credential. The backend validates the suspect, finalizes one accusation, and calculates the score.
- `GET /api/v1/cases/:caseId/result?sessionId=...` — retrieve a completed verdict and score breakdown. Requires the bearer credential.

Generated cases use the exact difficulty counts: Easy has 3 suspects, 5 clues, and 2 hints; Medium has 4 suspects, 7 clues, and 3 hints; Hard has 5 suspects, 9 clues, and 3 hints. All model output is checked with the Zod case contracts, including clue/evidence/suspect references, evidence structure, chronological timeline ordering, hint count, and solution references. Invalid output is rejected with a safe API error; it is not silently repaired. Canonical solutions and hints are not included in public case responses. The returned generated case is not saved and cannot be fetched again after the response.

Mock cases are deterministic development fixtures marked `development_fixture`; they do not require Gemini or MongoDB. Open `/cases` from the landing page or navigation to select one, then discover clues, request hints, and submit an accusation. If Gemini is temporarily unavailable or times out while creating a case, the page offers the matching prebuilt fixture with a direct **Play this fallback case** link. Easy, Medium, and Hard use their specified suspect, clue, hint, and base-score counts. Each unique discovered clue is worth 5 points, each hint costs 10 points, incorrect accusations receive clue points less hint penalties, and the score cannot fall below zero. The server derives all score inputs.

The persistence path seeds fixture cases into `cases` and `caseSolutions`; generated cases and their private solutions are saved before the API reports `persisted: true`. It writes investigation sessions, discovered clue IDs, hint request snapshots, completed accusations, verdict explanations, and score breakdowns to `investigationSessions`. These MongoDB writes have not been exercised against a real instance in this environment. Without a connection, the deterministic fixtures still work using process memory, but sessions are lost when Express restarts. The browser keeps the session credential in `sessionStorage` for page reloads. Image items are text-only placeholders and CCTV items are labeled storyboards.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Express port; defaults to `5000` |
| `CLIENT_ORIGIN` | Allowed browser origin; defaults to Vite at `http://localhost:5173` |
| `MONGODB_URI` | Optional connection string; fixtures and generated response flow do not require it |
| `GEMINI_API_KEY` | Server-only Google AI Studio API key; never sent to the frontend |
| `GEMINI_MODEL` | Server-side Gemini model name to use for case generation |
| `GEMINI_REQUEST_TIMEOUT_MS` | Gemini client/server timeout; defaults to `120000` (allowed range: 1,000–180,000) |
| `VITE_API_BASE_URL` | Optional browser-visible API base URL; leave empty to use the Vite proxy |

Never commit `.env` or place secrets in variables prefixed with `VITE_`. The generation endpoint returns a clear `503` when either Gemini setting is missing. Rate limits, timeouts, and invalid model output return safe error codes without provider response details.

## Implemented scope and remaining work

Implemented: landing and scenario-creation pages, responsive base design, loading/error/empty states, API health, optional MongoDB connection, Mongoose case/solution/session/media models, Zod validation, strict public serializers, three validated development fixtures, fixture read routes, backend-only Gemini case generation with exact difficulty counts, playable fixture investigations, and MongoDB persistence code for cases, private solutions, sessions, clue discovery, hints, accusations, verdicts, and score breakdowns. Real-database verification remains outstanding.

Not implemented: user accounts, image generation, and playable CCTV video. Real MongoDB integration is covered by an opt-in automated test and has not yet completed successfully in this environment; the active DNS resolver refuses the Atlas SRV lookup. A live Gemini request was not run as part of automated tests; automated tests use a mocked SDK and consume no API credits.
