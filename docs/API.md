# API reference

Base URL: `https://touchlineintelligence.com`

All responses are JSON. Invalid inputs return a `400` response with an `error` field.

## Player valuation

`GET /api/predict` returns model metadata, feature order, training season, source, and held-out metrics.

`POST /api/predict` accepts:

```json
{
  "age": 23,
  "position": "Attack",
  "appearances": 31,
  "goals": 14,
  "assists": 8,
  "minutes": 2410,
  "internationalCaps": 12
}
```

```bash
curl -X POST https://touchlineintelligence.com/api/predict \
  -H 'content-type: application/json' \
  -d '{"age":23,"position":"Attack","appearances":31,"goals":14,"assists":8,"minutes":2410,"internationalCaps":12}'
```

The response contains `estimateEur`, `lowEur`, `highEur`, derived feature values, model version, and held-out metrics. Valid positions are `Attack`, `Midfield`, `Defender`, and `Goalkeeper`.

## Similarity scouting

`GET /api/scouting?q=saka&position=Attack` searches by player or club name and optionally filters by broad position.

`GET /api/scouting?player_id=433177&max_age=25&max_value_eur=50000000&club=different` retrieves up to five same-position comparables.

| Parameter | Meaning |
| --- | --- |
| `player_id` | Selected player identifier |
| `max_age` | Maximum comparable-player age |
| `max_value_eur` | Maximum market value |
| `club` | `any`, `different`, or an exact club name |

Matches include a 0–100 similarity score and the three closest shared feature signals.

## Match forecast

`GET /api/matches` lists teams, current model state, split metadata, and test metrics.

`GET /api/matches?home_id=31&away_id=11` returns calibrated home-win, draw, and away-win probabilities. The two identifiers must be valid and different.

`GET /api/status` returns safe production telemetry plus the promoted player-data refresh report: source freshness, season, coverage, detected transfer/value/performance changes, and every validation gate. Raw provider failures remain restricted to protected diagnostics.

`GET /api/player-history?ids=:playerId[,playerId]` returns up to three versioned, position-specific valuation trajectories with season-level bootstrap intervals and evidence-quality labels. Missing seasons are preserved as missing evidence rather than interpolated.

`POST /api/events` accepts a constrained product-stage event and a device-generated UUID. The identifier is immediately one-way hashed; only stage, source path, hash, and timestamp are retained for 30 days.

`POST /api/feedback` stores a category, 1–5 usefulness score, bounded message, source path, and hashed journey identifier. It never accepts names or email addresses and feedback expires after 90 days.

`GET` and `POST /api/workspace/plans`, plus `GET`, `PATCH`, and `DELETE /api/workspace/plans/:id`, require ChatGPT authentication. Every query is scoped to the authenticated user. Updates include `expectedVersion` and return `409` instead of overwriting a newer edit. New plans are private; owners may explicitly create or revoke a read-only `/shared/:slug` snapshot.

`GET`, `POST`, and `DELETE /api/workspace/plans/:id/collaboration` expose the room roster, comments, and activity ledger. Owners grant or revoke editor/viewer access by email; editors may update versioned plan content, viewers remain read-only, and every access decision is rechecked by the server.

`GET /api/operations` is restricted to authenticated emails configured in `OPS_ADMIN_EMAILS`. It returns aggregated route latency, application-error fingerprints, security denials, durable rate-limit pressure, scheduled-sync health, alerts, and product record counts. Raw IP addresses and request payloads are never returned or persisted.

`GET`, `PATCH`, and `DELETE /api/notifications` require ChatGPT authentication and scope all rows to the signed-in email. The API returns the inbox and queue summary, marks one or all notifications read, updates collaboration/weekly preferences, and deletes individual notifications. Delivery jobs are processed asynchronously with idempotency keys, expiring leases, bounded retries, and dead-letter capture.

The response also reports the four largest model factors and which side each factor favours.

## Production status

`GET /api/status` returns the public operational state, last successful fixture sync, expected next sync, fixture-ledger counts, recent safe run summaries, and deployed model artifact versions. It also exposes privacy-safe aggregate telemetry: seven-day request/error counts, median and p95 latency, daily traffic, usage by product route, 30-day sync reliability, and durable database record counts. Raw request data, client identifiers, and provider error details are intentionally excluded.

`POST /api/internal/fixture-sync` is the authenticated ingestion hook used by both manual operations and the redundant six-hour GitHub Actions scheduler. It fetches current fixtures, locks predictions before kickoff, grades completed matches, and records a durable success or failure run. Manual calls require `Authorization: Bearer <SYNC_SECRET>`. Scheduler calls use a short-lived GitHub Actions OIDC token whose signature, issuer, audience, repository, branch, workflow path, runner, event, and expiry are verified at the edge; no duplicated long-lived scheduler secret is stored.

`GET /api/internal/diagnostics` returns deeper sync and API-error diagnostics and requires the same bearer secret as the manual fixture-sync endpoint.
### `GET /api/performance`

Returns the public live-model ledger: locked upcoming predictions, recently graded results, cumulative accuracy, mean Brier score, and the model version used. Probabilities are inserted before kickoff and never updated afterward; postponements may update only the kickoff timestamp, while completed fixtures add outcome and grading fields.
