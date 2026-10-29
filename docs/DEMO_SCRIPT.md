# Five-minute demo script (DA3)

Prepare: CloudFront site open, two accounts (A normal, B normal) + your admin account, AWS Console tabs for API Gateway, Lambda, RDS, S3, CloudWatch, Cognito. RDS started. Optional: SNS endpoint created.

| Time | Say / do |
|---|---|
| 0:00 | "Voyara is a travel-budget app moved from browser storage to AWS." Show `docs/architecture.svg`: CloudFront+S3, Cognito, API Gateway, Lambda (Python) in VPC, private RDS MySQL, S3 reports, CloudWatch, SNS, IAM. |
| 0:30 | Open the CloudFront URL. **Sign up** a new user, enter the email code, **log in**. Mention Cognito (no passwords stored by the app). |
| 1:15 | **Planner**: create *Chennai → Bali*, ₹20,000. Show **Dashboard** (trips, planned budget). |
| 1:45 | **Budget**: set categories, add expenses until the amber **80 %** banner, then the red **100 %** banner. Show the category chart and planned-vs-actual (add one itinerary activity first if time allows). Mention the SNS email. |
| 3:00 | Click **Download CSV report** → open it → show the object in the S3 console under `reports/<user>/…`. |
| 3:30 | **Security**: refresh the page (data persists: it is in MySQL). As account B open A's `?tripId=` → "not found". As B open `/admin` → "Not authorized". Then admin account → `/admin` analytics. |
| 4:15 | Console: RDS (private, single-AZ), Lambda in VPC, CloudWatch log line for a request, AWS Budgets. |
| 4:45 | "Everything is IaC (SAM), least-privilege IAM, and I tear it down with the cleanup checklist to protect credits." |

Backup: record this run once as a video.
