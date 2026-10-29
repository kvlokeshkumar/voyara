# Data and large files

Voyara has no training dataset. Application data is created by users and stored in an Amazon RDS MySQL database. The schema is in `database/migrations/V001__init.sql` and is applied by the migrate Lambda.

## Optional seed data

`database/seed/V900__seed_test_data.sql` contains fake users, trips, budgets, expenses and itinerary activities for testing. It is loaded only when the migrate function is invoked with `{"include_seed": true}`:

```bash
aws lambda invoke --function-name voyara-api-migrate \
  --payload '{"include_seed": true}' --cli-binary-format raw-in-base64-out out.json
```

Do not load it into a database used for a real demo.

## File kept out of Git

| File | Size | Used by | Why it is not in Git |
|---|---|---|---|
| `frontend/src/assets/screenrecord.mp4` | about 62 MB | `frontend/src/pages/LearnMore.js` (imported and played on the Learn More page) | Large binary file, listed in `.gitignore` |

Because the page imports the file, the frontend does not compile without it. Before running `npm start` or `npm run build`, do one of the following:

- Copy your own copy of `screenrecord.mp4` to `frontend/src/assets/`. Any short MP4 works.
- Or remove the `import screenrecord ...` line and the `<video>` block from `LearnMore.js`.

If you need to keep the original, store it in external storage (for example Google Drive or an S3 bucket) and download it to the path above.

## Values you must keep outside the repository

These are not committed. Save them separately (for example in a password manager):

- RDS master username and password
- The application database password passed to `sam deploy`
- AWS access keys for the CLI user
- `frontend/.env.local` (can be recreated from the stack output `ApiUrl` and the Cognito user pool and app client ids)
