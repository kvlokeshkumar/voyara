# Cost control and cleanup

**Rule:** do not trust a "free" label. Before creating or keeping anything, check the current ap-south-1 price on the service pricing page and your account's Billing → Free Tier / Credits pages. Prices and free-tier terms change and differ by account type.

## What costs money (by how it bills)
| Resource | Bills by | Notes for this project |
|---|---|---|
| **RDS MySQL instance** | instance-hours + storage GB-month + backup beyond the free allotment | The main cost. Single-AZ, `db.t4g.micro`, 20 GB gp3, backup retention 1 day, no Performance Insights, no Multi-AZ. **Stop it when not working** (auto-restarts after 7 days). |
| Public IPv4 addresses | per hour per address | Avoid: keep RDS private; only the optional EC2 and CloudFront-less paths use one. |
| VPC interface endpoint (SNS only) | per hour per AZ + data | Only for Step 11-A, delete after the demo. |
| NAT Gateway | per hour + data | **Not used.** Do not create one. |
| Optional EC2 `t4g.nano` | per second while running + EBS | Stop/terminate when idle. |
| Lambda, API Gateway HTTP API | per request / GB-second | Tiny at demo scale; check your free tier. |
| Cognito | monthly active users | A few test users; check your free tier. |
| S3, CloudFront | storage, requests, data transfer | A few MB; check your free tier. |
| CloudWatch Logs | ingestion + storage | Retention set to 7 days. |
| SNS email | per notification | Check your free tier. |

## Estimating before you spend
`cost ≈ (RDS hourly price × hours running) + (storage GB × GB-month price × fraction of month) + optional extras`.
Look up each unit price, write it with the date next to it, add 20 % margin and compare with your credits. Keep AWS Budgets alerts on (Step 2 of the deployment guide).

## Cost-control habits
1. Stop RDS (and EC2) whenever you stop working.
2. Never create a NAT Gateway, load balancer, RDS Proxy or Multi-AZ.
3. Keep log retention at 7 days; reports expire after 30 days.
4. Check Billing → Cost Explorer daily during the project.
5. Delete the SNS endpoint (if created) right after the demo.

## Cleanup checklist (do right after submission and recording)
Tick each box and note the time.
- [ ] Screenshots / evidence saved; any reports you want to keep downloaded
- [ ] EC2 instance terminated, its volume deleted, any Elastic IP released
- [ ] SNS interface endpoint deleted (if created); S3 gateway endpoint can stay (free) or be deleted
- [ ] Empty both S3 buckets: `aws s3 rm s3://<bucket> --recursive` (reports bucket and website bucket)
- [ ] CloudFront: **Disable** → wait until deployed → **Delete**; delete the Origin Access Control
- [ ] `sam delete --stack-name voyara-api --region ap-south-1` (API, Lambdas, roles, log groups, alarms, topic, reports bucket)
- [ ] RDS: delete the instance (choose *no final snapshot* unless you want one; **delete any snapshot afterward**, snapshots bill too); delete the DB subnet group if you created it for this project
- [ ] Cognito user pool deleted
- [ ] Security group `voyara-lambda-sg` deleted (after the stack is gone); remove the RDS-SG rule referencing it
- [ ] CloudWatch: any leftover log groups `/aws/lambda/voyara-*` deleted
- [ ] Regions check: EC2, RDS, VPC (endpoints, NAT, EIPs) dashboards empty in ap-south-1 (and us-east-1 if CloudFront/ACM were used)
- [ ] Next day and after 3 days: Billing → Bills / Cost Explorer shows ~0 new charges
- [ ] Keep the AWS Budget alert a few more days
