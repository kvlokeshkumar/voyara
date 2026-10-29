# Voyara: cloud travel and budget assistant (AWS)

React app (original UI preserved) + Amazon Cognito + API Gateway HTTP API + Python Lambda + RDS MySQL + S3 reports + SNS + CloudWatch.

```
frontend/   React app (Create React App). Config via .env.local (see .env.example)
backend/    Python Lambda source (src/), tests (tests/)
database/   Versioned SQL (migrations/), optional seed data (seed/), app-user template
infra/      SAM/CloudFormation template
reporting/  Optional EC2 reporting utility
docs/       DEPLOYMENT.md (start here), API.md, TESTING.md, COST_AND_CLEANUP.md, DEMO_SCRIPT.md, architecture.svg
```

## Easiest way to deploy (recommended)
```bash
aws configure --profile voyara && export AWS_PROFILE=voyara     # once
bash scripts/setup_aws.sh
```
It asks 4 questions (RDS master user, password, your email) and then reads your RDS settings, creates the Lambda security group,
the free S3 endpoint and Cognito, deploys the API, creates the tables and writes `frontend/.env.local`. Safe to re-run.
Then: `cd frontend && npm install && npm start`.

**Manual alternative:** `cd infra && sam build && sam deploy --guided` (it asks for each parameter one by one), or follow `docs/DEPLOYMENT.md`.

**Full step-by-step reference: `docs/DEPLOYMENT.md`.** It walks through every step using the MySQL (RDS) you already created.

Quick local checks (no AWS needed):
```bash
cd backend && pip install -r requirements-dev.txt && TEST_DB_PASSWORD=<local mysql root pw> pytest -q
cd frontend && npm install && CI=true npm test -- --watchAll=false && CI=true npm run build
```

Keep in sync: the SQL in `database/migrations` is copied into `backend/src/migrations` (a test fails if they differ).
After editing a migration run: `cp database/migrations/*.sql backend/src/migrations/`
