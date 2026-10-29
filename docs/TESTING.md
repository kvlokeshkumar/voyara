# Testing checklist and results

## A. Automated tests already run (local, real MySQL 8.0 and real Node build)

| Suite | Command | Result (21 Oct 2026) |
|---|---|---|
| Backend (Python): calculations, validation, report builder, API + SQL integration, authorisation, migrations | `cd backend && pip install -r requirements-dev.txt && pytest -q` (needs a local MySQL, see below) | **67 passed** |
| Frontend (Jest): budget maths, API client, pages, route guards | `cd frontend && CI=true npm test -- --watchAll=false` | **23 passed** |
| Frontend production build, warnings treated as errors | `CI=true npm run build` | **Compiled successfully** |
| CloudFormation/SAM template lint | `cfn-lint infra/template.yaml` | **no findings** |
| PDF report opens in a real PDF reader (pypdf), multi-page | ad-hoc script | **passed** |
| Seed data loads through the migrator | `{"include_seed": true}` | **3 trips, 8 expenses, 4 activities loaded; second run applies nothing** |
| Optional EC2 report script against the seeded DB | `export_summary.py --local-only` | **CSV produced with correct totals (76 %, 105 %, 12 %)** |

Run the backend tests yourself with a local MySQL:
```bash
docker run -d --name voyara-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=localdev mysql:8.0
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
TEST_DB_PASSWORD=localdev pytest -v
```
(The tests create and drop a throwaway database `voyara_test`; they never touch other databases.)

### What the backend tests prove
* Totals/remaining/percent with exact decimal money; thresholds at 79.9 % (ok), 80 % (warning), 100 % (exceeded), zero budget.
* Trip, budget, expense and itinerary CRUD against real tables; cascade delete removes budget, expenses, itinerary and activities.
* **User B gets 404 for every trip, budget, expense, itinerary, summary, threshold and report route of user A**, and cannot edit/delete A's expense.
* A `user_id` / `role` / `groups` value in a request body has no effect; no token → 401; unknown route 404; wrong method 405.
* SQL-injection text is stored literally; bad amounts/dates/categories/times/JSON are rejected with 400; a failed itinerary save leaves the old data intact (transaction).
* SNS alert is sent once per threshold crossing, only when the user enabled alerts, and an SNS failure never breaks the expense request (fake SNS client).
* Reports: CSV/PDF are stored under `reports/<cognito-sub>/<trip>/…` with SSE, formula-injection characters neutralised (fake S3 client).
* Admin analytics: 403 for normal users, 200 for the `admins` group, contains no e-mail addresses.
* The migrator creates the database, applies versions once, and creates an app user that **can read/write but cannot `DROP TABLE`**.

## B. Not yet verifiable without your AWS account (do these and tick them)

These need real Cognito, API Gateway, VPC and S3. Record date and attach a screenshot.

| # | Cloud test | Expected | Done / date | Evidence |
|---|---|---|---|---|
| 1 | `curl <ApiUrl>/trips` without token | 401 | ☐ | |
| 2 | Sign up, verify code, log in | lands on Dashboard | ☐ | |
| 3 | Create trip, refresh browser | trip still listed (from MySQL) | ☐ | |
| 4 | Local Storage inspection | no `voyara_*` keys, no password | ☐ | |
| 5 | Account B opens A's `?tripId=` | "Trip not found" | ☐ | |
| 6 | Normal user opens `/admin` | "Not authorized"; API returns 403 | ☐ | |
| 7 | User in `admins` group opens `/admin` | analytics load | ☐ | |
| 8 | Add expenses to 80 % and 100 % | amber then red banner | ☐ | |
| 9 | Download CSV and PDF | files download; objects exist in reports bucket under your sub | ☐ | |
| 10 | Direct URL + refresh on `/budget`, `/dashboard`, `/itinerary`, `/planner`, `/trip-created`, `/admin` via CloudFront | app loads (login if signed out), never an XML error | ☐ | |
| 11 | Expired session (sign out in another tab / wait for token expiry, then act) | redirected to `/login` with "session expired" | ☐ | |
| 12 | Migrate Lambda twice | second run `applied: []` | ☐ | |
| 13 | RDS settings | Public access No, Multi-AZ No, RDS-SG one inbound rule from Lambda SG | ☐ | |
| 14 | SNS alert (if enabled) | exactly one e-mail at 80 %, one at 100 % | ☐ | |
| 15 | CloudWatch | request log lines visible; alarm test | ☐ | |
| 16 | Cleanup checklist completed; next-day billing check | no new charges | ☐ | |

## C. Known limitations (documented, not hidden)
* The old "destinations manager" in the Admin page used browser storage and has no table in the required schema, so it was replaced by real analytics (top destinations, trips per month, recent trips).
* Cognito tokens live in `sessionStorage` (cleared when the tab closes) so you sign in again in a new tab/session. Passwords are never stored.
* SNS from a private Lambda needs an interface endpoint (hourly cost) or the optional EC2 path; without either, alerts are skipped gracefully and the on-screen warnings still work.
* DB credentials are passed to Lambda as encrypted environment variables to avoid the cost of Secrets Manager endpoints; the app uses a separate low-privilege DB user.
* The API uses one Lambda with a router behind one proxy route. IAM is therefore per-function, not per-route.
* The seed file is optional test data; do not load it into a database used for your final demo unless you want sample users.
