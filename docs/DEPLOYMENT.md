# Voyara: step-by-step deployment using the MySQL (RDS) you already created

Region: **ap-south-1 (Mumbai)**. Do the steps in order. Every step ends with a ✅ check.
Items marked 💰 create or change billable resources. The RDS instance you created yesterday is **already billing**; Step 0 shows how to pause it while you work.

**Shortcut:** `bash scripts/setup_aws.sh` automates Steps 3 to 6 and the `.env.local` part of Step 7 (it is safe to re-run). Do Steps 0 to 2 first, then run it, then continue at Step 7.

Commands use bash. On Windows use Git Bash, or replace `\` line breaks with `` ` `` in PowerShell.

---

## Step 0. Gather facts about your existing RDS (5 min)

AWS Console → RDS → Databases → click your instance → note down:

| Fact | Where | Write it here |
|---|---|---|
| Endpoint (hostname) | Connectivity & security | `__________.ap-south-1.rds.amazonaws.com` |
| Port | same | 3306 |
| Master username | Configuration | |
| Master password | you set it | (keep in a password manager) |
| VPC | Connectivity & security → VPC | `vpc-...` |
| Subnet group → subnets | Connectivity & security | at least 2, different AZs |
| Security group | Connectivity & security → VPC security groups | `sg-...` (call it **RDS-SG**) |
| Publicly accessible | Connectivity & security | Yes / No |
| Multi-AZ | Configuration | should be **No** |

> You do **not** need a database called `voyara` to exist. The migration Lambda creates it.
> 💰 To save credits while you work offline: RDS → Actions → **Stop temporarily** (AWS restarts it automatically after 7 days). Start it again when you test. Storage is still billed while stopped.

✅ Check: you have the endpoint, the VPC id, at least two subnet ids and the RDS-SG id.

---

## Step 1. Install tools and log in to AWS

```bash
aws --version      # AWS CLI v2
sam --version      # AWS SAM CLI
node -v            # 20.x
python3 --version  # 3.12 recommended
aws configure --profile voyara      # access key, secret, region ap-south-1
export AWS_PROFILE=voyara           # PowerShell: $env:AWS_PROFILE="voyara"
aws sts get-caller-identity
```
✅ Check: the last command shows your IAM user (not root).

## Step 2. Billing protection (free, do before anything else)

Billing → Budgets → **Create budget** → Cost budget, monthly, **USD 25**, email alerts at 50 %, 80 %, 100 %. Also enable *Free Tier usage alerts* in Billing preferences.
✅ Check: confirmation email arrives.

---

## Step 3. Network pieces around your RDS

### 3.1 Lambda security group
EC2 → Security Groups → **Create security group**
* Name `voyara-lambda-sg`, VPC = **your RDS VPC**
* Inbound rules: none. Outbound: leave default (all).
* Note its id → **LAMBDA-SG**.

### 3.2 Let Lambda reach RDS (and nothing else)
EC2 → Security Groups → open **RDS-SG** → Inbound rules → Edit → *Add rule*:
Type **MySQL/Aurora (3306)**, Source = **LAMBDA-SG** (pick it from the list; do not type a CIDR).
Remove any `0.0.0.0/0` rule on port 3306.

> If the instance says *Publicly accessible: Yes*: after Step 8 works, switch it to **No** (RDS → Modify → Connectivity → Public access: No). Lambda keeps working because inside the VPC the endpoint resolves to the private IP.

### 3.3 S3 gateway endpoint (free; lets VPC Lambda write reports to S3 without a NAT)
VPC → Endpoints → **Create endpoint** → Service `com.amazonaws.ap-south-1.s3`, type **Gateway** → your VPC → select the **route tables of the subnets you will use** → Create.

> Do **not** create a NAT Gateway (≈ a fixed hourly charge plus data). Do not create interface endpoints unless Step 11 (SNS) says so.

✅ Check: the endpoint state is *Available* and lists your route tables.

---

## Step 4. Cognito (free-tier-sized for a demo; verify current pricing)

Cognito → **Create user pool**
1. Application type **Single-page application (SPA)**, name `voyara-web` (no client secret).
2. Sign-in identifier: **Email**. Self-registration: on. Required attributes: **email**, **name**.
3. Password policy default (8+, upper, lower, number, symbol). MFA: none for the demo.
4. Email: *Send email with Cognito*. Verification: **Send code**.
5. After creation: App clients → `voyara-web` → Edit → authentication flows: **ALLOW_USER_SRP_AUTH** and **ALLOW_REFRESH_TOKEN_AUTH**. Set *refresh token expiration* to **1 day** and *ID token* 1 hour.
6. User pool → Groups → **Create group** named exactly `admins`.
7. Write down **User pool ID** (`ap-south-1_XXXX`) and **App client ID**.

✅ Check: both values copied. The group `admins` exists.

---

## Step 5. Deploy the API (SAM) 💰

From the project root:

```bash
cd infra
sam build -t template.yaml
sam deploy --guided --stack-name voyara-api --region ap-south-1 --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    DbHost="<RDS endpoint>" \
    DbName="voyara" \
    DbUser="voyara_app" \
    DbPassword="<choose a strong password for the app user>" \
    MigrateDbUser="<RDS master username>" \
    MigrateDbPassword="<RDS master password>" \
    UserPoolId="ap-south-1_XXXX" \
    UserPoolClientId="<app client id>" \
    SubnetIds="subnet-aaa,subnet-bbb" \
    LambdaSecurityGroupId="<LAMBDA-SG id>" \
    AllowedOrigins="http://localhost:3000" \
    AlertEmail="you@example.com"
```
Answer *y* to creating IAM roles. When asked, *Save arguments to samconfig.toml*: **n** (it would store passwords).

`DbPassword` is the password for the **new** low-privilege user `voyara_app` that the migration step creates; it is not your master password.

✅ Check: the stack ends with `CREATE_COMPLETE` and prints **ApiUrl**, **ReportsBucketName**, **MigrateFunctionName**. Copy `ApiUrl`.
You will get an SNS subscription email; click **Confirm subscription**.

```bash
curl -i "<ApiUrl>/trips"        # expect HTTP 401 (no token). That proves the JWT authorizer is active.
```

---

## Step 6. Create the tables in your MySQL 💰 (tiny)

The migration Lambda runs *inside* the VPC, so RDS can stay private:

```bash
aws lambda invoke --function-name voyara-api-migrate --region ap-south-1 \
  --cli-binary-format raw-in-base64-out --payload '{}' out.json && cat out.json
```
Expected: `{"applied": ["V001"], "alreadyApplied": [], "appUser": "voyara_app"}`.
Run it again: `applied` is now `[]` (idempotent).

Optional demo data (fake users and trips; **skip for the real demo account**):
`--payload '{"include_seed": true}'`

If it fails, open CloudWatch → Log groups → `/aws/lambda/voyara-api-migrate`. Typical causes:
* `Can't connect ... timed out`: wrong subnets (not the RDS VPC) or RDS-SG lacks the 3306 rule from LAMBDA-SG (Step 3.2).
* `Access denied`: wrong `MigrateDbUser` / `MigrateDbPassword`.

Inspect with MySQL Workbench only if you temporarily allow your own IP (RDS-SG inbound 3306 from *My IP*, and public access on). Remove both afterwards.

✅ Check (optional, Workbench): `SHOW TABLES;` lists users, trips, budgets, expenses, itineraries, itinerary_activities, schema_migrations.

---

## Step 7. Run the React app locally against AWS

```bash
cd frontend
cp .env.example .env.local        # then edit the three values
npm install
npm start                         # http://localhost:3000
```
`.env.local`:
```
REACT_APP_API_URL=<ApiUrl from Step 5, no trailing slash>
REACT_APP_COGNITO_USER_POOL_ID=ap-south-1_XXXX
REACT_APP_COGNITO_CLIENT_ID=<app client id>
```
Test: Sign Up → check email for the code → Verify → Log In → Planner → create a trip → Dashboard shows it → Budget: set budget, add expenses → refresh the browser: data is still there (it is in MySQL, not the browser).

DevTools → Application → Local Storage must contain **no** `voyara_*` keys and no passwords.

Make yourself admin: Cognito → Users → your user → **Add user to group → admins**. Log out and in again (the group is in the new token). The *Admin* link appears.

✅ Check: Dashboard totals update; `/admin` loads for you and shows "Not authorized" for a second, normal account.

---

## Step 8. Verify security (5 min, take screenshots)

1. Create a second account B. Copy a trip id from account A (URL `?tripId=…`) and open `/budget?tripId=<A's id>` as B → error "Trip not found".
2. As B open `/admin` → "Not authorized". (The API also returns 403.)
3. Sign out, then visit `/dashboard` → redirected to `/login`.
4. RDS console → Public access **No**, Multi-AZ **No**; RDS-SG has exactly one inbound rule (from LAMBDA-SG).

---

## Step 9. Host the frontend on S3 + CloudFront 💰 (pennies for a demo)

```bash
cd frontend
npm run build              # uses .env.local values; run `CI=true npm run build` to mimic a strict pipeline
```
1. S3 → **Create bucket** `voyara-web-<unique>`, ap-south-1, **Block all public access = ON**.
2. Upload: `aws s3 sync build/ s3://voyara-web-<unique>/ --delete`
3. CloudFront → **Create distribution**
   * Origin: the S3 bucket (REST endpoint). Origin access: **Origin access control** → create new → *Sign requests*.
   * Viewer protocol policy: **Redirect HTTP to HTTPS**. Default root object `index.html`.
   * Web Application Firewall: **Do not enable** (extra cost). Price class: cheapest that covers your audience.
   * After creation click **Copy policy** and paste it into the bucket's *Permissions → Bucket policy*.
4. CloudFront → your distribution → **Error pages** → create **two** custom responses: HTTP **403** and **404** → response page `/index.html`, status **200**. *Without this, refreshing `/budget` breaks.*
5. Note the domain `dxxxxxxxxxxxx.cloudfront.net`.

Allow the site to call the API (CORS): redeploy with the CloudFront origin added:
```bash
cd infra && sam deploy --stack-name voyara-api --region ap-south-1 --capabilities CAPABILITY_IAM \
  --parameter-overrides <same list as Step 5, but> AllowedOrigins="http://localhost:3000,https://dxxxxxxxxxxxx.cloudfront.net"
```
(`sam deploy` without `--guided` reuses the built template; re-run `sam build` first if code changed.)

Each time you change the frontend:
```bash
npm run build && aws s3 sync build/ s3://voyara-web-<unique>/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```
✅ Check: open `https://dxxxxxxxxxxxx.cloudfront.net/budget` directly and press refresh: the app loads (login page if signed out).

---

## Step 10. CloudWatch (logs and alarms are already created by the template)

* Logs: CloudWatch → Log groups → `/aws/lambda/voyara-api-api` (retention 7 days). Each request is one JSON line: method, path, status, ms.
* Logs Insights query for the demo:
  `fields @timestamp, method, path, status, ms | filter msg = "request" | sort @timestamp desc | limit 20`
* Alarms: `LambdaErrorsAlarm`, `Api5xxAlarm` notify your SNS email.
* Trigger one on purpose (optional): stop RDS, call the API, watch the 503 and the alarm.

## Step 11. SNS spending alerts (optional feature)

The Lambda is in a private subnet with no internet, so it **cannot reach SNS** unless you provide a route. Choose one:
* **A. Demo-day interface endpoint 💰 (hourly charge):** VPC → Endpoints → Create → `com.amazonaws.ap-south-1.sns`, type Interface, your VPC, **one** subnet, security group allowing 443 from LAMBDA-SG, *Enable private DNS*. **Delete it right after the demo.**
* **B. No endpoint:** leave SNS from the API disabled. The app still works (a failed publish is logged and ignored). Use the optional EC2 reporting script (below) to send threshold alerts.

To test A: Budget page → tick *Email me at 80 % and 100 %* → Save Budget → add expenses past 80 % → you get **one** email, then another at 100 %.

## Step 12. Optional EC2 reporting utility 💰

Only if you want it for the marks; it is the first thing to skip when short of time or credits.
1. EC2 → Launch `t4g.nano`, Amazon Linux 2023, in a **public subnet** of the same VPC (needs internet to reach S3/SNS APIs), auto-assign public IP. Key pair or Session Manager.
2. IAM role for the instance: `s3:PutObject` on `<ReportsBucket>/reports/admin/*` and `sns:Publish` on the topic. No access keys on the box.
3. RDS-SG: add inbound 3306 from the instance's security group.
4. On the instance: `sudo dnf install -y python3-pip && pip3 install -r requirements.txt`, copy `reporting/export_summary.py`, then
   `DB_HOST=... DB_USER=voyara_app DB_PASSWORD=... DB_NAME=voyara REPORT_BUCKET=... ALERT_TOPIC_ARN=... python3 export_summary.py`
5. **Stop or terminate it when finished.**

## Step 13. Before submitting

* Fill in `docs/TESTING.md` (section "Cloud tests") with dates and screenshots.
* Rehearse `docs/DEMO_SCRIPT.md` twice and record a backup video.
* After submitting, run `docs/COST_AND_CLEANUP.md` immediately.

## Troubleshooting

| Symptom | Fix |
|---|---|
| API 401 with a valid login | Using the access token, or `UserPoolClientId` differs from the app client used by the frontend. The frontend sends the **ID** token. |
| Lambda timeout reaching RDS | Subnets not in the RDS VPC, or missing RDS-SG rule from LAMBDA-SG. |
| Reports fail with timeout | S3 gateway endpoint missing or not attached to the Lambda subnets' route tables (Step 3.3). |
| Browser CORS error | `AllowedOrigins` must exactly match the page origin (scheme + host, no trailing slash). Redeploy after changing. |
| Refresh on `/budget` shows XML error | Missing CloudFront 403/404 → `/index.html` responses (Step 9.4). |
| No verification email | Check spam; Cognito's default sender has a daily limit. |
| `sam deploy` fails on bucket | Re-run; names are generated. If a failed stack exists, `sam delete` it first. |
