# Voyara API reference

Base URL: the `ApiUrl` stack output. All routes need `Authorization: Bearer <Cognito ID token>`.
Identity is taken **only** from the verified token. Any `userId`/`user_id`/`role` field in a body is ignored.
Money is INR with 2 decimals. Dates are `YYYY-MM-DD`. Unknown body fields are ignored.

## Error format
```json
{ "error": { "code": "validation_error", "message": "amount must be greater than 0", "field": "amount" } }
```
| Status | Meaning |
|---|---|
| 400 | Validation error (`validation_error`) |
| 401 | Missing/invalid/expired token (rejected by API Gateway or the handler) |
| 403 | Authenticated but not an administrator |
| 404 | Not found **or not yours** (the API never reveals other users' ids) |
| 405 | Method not allowed for that path |
| 503 | Database unavailable or report storage not configured |
| 500 | Unexpected error (details only in CloudWatch) |

## Routes
| Method & path | Purpose | Success |
|---|---|---|
| GET `/me` | Caller identity and admin flag | 200 |
| GET `/dashboard` | Totals across the caller's trips | 200 |
| GET `/trips` | List trips (with budget and spent) | 200 |
| POST `/trips` | Create trip (+ empty budget) | 201 |
| GET `/trips/{tripId}` | One trip | 200 |
| PUT `/trips/{tripId}` | Update trip (`budget` optional) | 200 |
| DELETE `/trips/{tripId}` | Delete trip and everything under it | 204 |
| GET `/trips/{tripId}/budget` | Budget record | 200 |
| PUT `/trips/{tripId}/budget` | Create/replace budget (upsert) | 200 |
| GET `/trips/{tripId}/expenses` | List expenses | 200 |
| POST `/trips/{tripId}/expenses` | Add expense | 201 |
| PUT `/expenses/{expenseId}` | Edit expense | 200 |
| DELETE `/expenses/{expenseId}` | Delete expense | 204 |
| GET `/trips/{tripId}/itinerary` | Activities by day + planned total | 200 |
| PUT `/trips/{tripId}/itinerary` | Replace all activities atomically | 200 |
| GET `/trips/{tripId}/summary` | Totals, per-category, planned vs actual | 200 |
| GET `/trips/{tripId}/threshold` | 80 % / 100 % status | 200 |
| POST `/trips/{tripId}/reports` | Build CSV/PDF, store in S3, return a 5-minute URL | 201 |
| GET `/admin/analytics` | Aggregate analytics (**admins group only**) | 200 |

## Examples

### POST /trips
```json
{ "from": "Chennai", "to": "Bali", "startDate": "2026-12-10", "endDate": "2026-12-14",
  "travelers": 2, "budget": 50000, "notes": "Beach trip" }
```
→ 201
```json
{ "id": 12, "from": "Chennai", "to": "Bali", "startDate": "2026-12-10", "endDate": "2026-12-14", "days": 5,
  "travelers": 2, "notes": "Beach trip", "createdAt": "2026-10-21T08:15:00", "budget": 50000, "spent": 0 }
```

### PUT /trips/12/budget
```json
{ "totalBudget": 50000, "transportation": 20000, "accommodation": 15000, "meals": 8000,
  "activities": 5000, "miscellaneous": 2000, "alertsEnabled": true }
```

### POST /trips/12/expenses
```json
{ "category": "meals", "description": "Welcome dinner", "amount": 3500.50, "date": "2026-12-10" }
```
→ 201
```json
{ "expense": { "id": 40, "category": "meals", "description": "Welcome dinner", "amount": 3500.5, "date": "2026-12-10" },
  "threshold": { "status": "ok", "percentUsed": 7.0, "totalSpent": 3500.5, "remaining": 46499.5 } }
```
`category` ∈ transportation, accommodation, meals, activities, miscellaneous. `status` ∈ no_budget, ok, warning (≥ 80 %), exceeded (≥ 100 %).

### PUT /trips/12/itinerary
```json
{ "days": { "day1": [ { "time": "09:00", "activity": "Temple tour", "cost": 500 } ],
            "day2": [ { "time": "10:00", "activity": "Surf lesson", "cost": 4500 } ] } }
```
→ 200 `{ "tripId": 12, "totalDays": 5, "days": { "day1": [ {"id": 1, "time": "09:00", "activity": "Temple tour", "cost": 500} ], ... }, "totalPlanned": 5000 }`

### GET /trips/12/summary
```json
{ "tripId": 12, "destination": "Bali", "currency": "INR", "totalBudget": 50000, "totalSpent": 38000,
  "remaining": 12000, "percentUsed": 76.0, "status": "ok", "expenseCount": 4,
  "byCategory": { "transportation": { "budget": 20000, "spent": 18000, "percentUsed": 90.0, "over": false }, "...": {} },
  "plannedVsActual": { "planned": 5000, "actual": 38000, "difference": -33000 } }
```

### POST /trips/12/reports
`{ "format": "csv" }` or `{ "format": "pdf" }` → 201
```json
{ "format": "csv", "bucket": "voyara-api-reportsbucket-abc", "key": "reports/<cognito-sub>/12/trip-12-20261021T081500Z.csv",
  "size": 912, "downloadUrl": "https://...presigned...", "expiresInSeconds": 300 }
```
Reports are stored under the caller's own prefix, encrypted (SSE-S3), and expire after 30 days. CSV cells beginning with `= + - @` are neutralised against spreadsheet formula injection.

### GET /admin/analytics (admins only)
```json
{ "totalUsers": 5, "totalTrips": 9, "totalBudget": 310000, "totalSpent": 120500, "totalExpenses": 37,
  "avgTripsPerUser": 1.8, "tripsByMonth": [ {"month": "2026-10", "trips": 9} ],
  "topDestinations": [ {"destination": "Bali", "trips": 3} ],
  "recentTrips": [ {"id": 12, "from": "Chennai", "to": "Bali", "travelers": 2, "startDate": "2026-12-10", "budget": 50000} ] }
```
Contains aggregates only (no emails, expenses or notes). Non-admins receive 403.
