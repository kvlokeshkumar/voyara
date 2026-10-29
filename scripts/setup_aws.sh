#!/usr/bin/env bash
# Voyara one-shot setup. Run from anywhere:  bash scripts/setup_aws.sh
# It asks a few questions, then: finds your RDS settings, creates the Lambda security group and
# the free S3 gateway endpoint, creates Cognito (user pool, app client, "admins" group),
# deploys the API with SAM, creates the database tables, and writes frontend/.env.local.
# Safe to run again: it reuses things it already created. It never creates RDS, NAT or CloudFront.
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
STACK="voyara-api"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export MSYS_NO_PATHCONV=1            # stop Git Bash rewriting arguments that start with /

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   OK: %s\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
awsq() { aws "$@" --region "$REGION" | tr -d '\r'; }      # strips Windows line endings

command -v aws >/dev/null || die "AWS CLI not found. Install AWS CLI v2 first."
command -v sam >/dev/null || die "SAM CLI not found. Install AWS SAM CLI first."

say "1/7 Checking your AWS login"
IDENT=$(aws sts get-caller-identity --query Arn --output text | tr -d '\r') || die "Not logged in. Run: aws configure --profile voyara  then: export AWS_PROFILE=voyara"
echo "   Logged in as: $IDENT"
case "$IDENT" in *":root") die "You are using the ROOT account. Use an IAM user instead.";; esac

say "2/7 A few questions"
echo "   Your RDS databases in $REGION:"
awsq rds describe-db-instances --query 'DBInstances[].[DBInstanceIdentifier,Engine,DBInstanceStatus]' --output text | sed 's/^/     /'
COUNT=$(awsq rds describe-db-instances --query 'length(DBInstances)' --output text)
[ "$COUNT" -ge 1 ] || die "No RDS database found in $REGION."
if [ "$COUNT" = "1" ]; then
  DBID=$(awsq rds describe-db-instances --query 'DBInstances[0].DBInstanceIdentifier' --output text)
  echo "   Using the only one: $DBID"
else
  read -r -p "   Type the DB identifier to use: " DBID
fi
read -r -p "   RDS master username (e.g. admin): " MASTER_USER
read -r -s -p "   RDS master password (typing is hidden): " MASTER_PASS; echo
read -r -p "   Your email (for alerts): " ALERT_EMAIL
APP_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || true)
[ -n "$MASTER_USER" ] && [ -n "$MASTER_PASS" ] || die "Username and password are required."
case "$MASTER_PASS$MASTER_USER" in *" "*|*"'"*|*'"'*) die "Master user/password must not contain spaces or quotes.";; esac
echo "   (A strong password for the app's own database user was generated automatically.)"

say "3/7 Reading your RDS settings"
read -r DBHOST VPC RDS_SG PUBLIC MULTIAZ STATUS < <(awsq rds describe-db-instances --db-instance-identifier "$DBID" \
  --query 'DBInstances[0].[Endpoint.Address,DBSubnetGroup.VpcId,VpcSecurityGroups[0].VpcSecurityGroupId,PubliclyAccessible,MultiAZ,DBInstanceStatus]' --output text)
SUBNETS=$(awsq rds describe-db-instances --db-instance-identifier "$DBID" \
  --query 'DBInstances[0].DBSubnetGroup.Subnets[].SubnetIdentifier' --output text | tr '\t' ',')
[ "$STATUS" = "available" ] || die "RDS status is '$STATUS'. Start it in the console (Actions > Start) and wait for 'Available', then run this again."
ok "endpoint $DBHOST"
ok "vpc $VPC | subnets $SUBNETS | security group $RDS_SG"
[ "$MULTIAZ" = "False" ] || echo "   NOTE: Multi-AZ is ON; that doubles RDS cost. Consider turning it off."
[ "$PUBLIC" = "False" ] || echo "   NOTE: RDS is publicly accessible. After everything works, set Public access to No."

say "4/7 Network: Lambda security group + S3 endpoint"
LSG=$(awsq ec2 describe-security-groups --filters "Name=group-name,Values=voyara-lambda-sg" "Name=vpc-id,Values=$VPC" --query 'SecurityGroups[0].GroupId' --output text)
if [ "$LSG" = "None" ]; then
  LSG=$(awsq ec2 create-security-group --group-name voyara-lambda-sg --description "Voyara Lambda" --vpc-id "$VPC" --query GroupId --output text)
  ok "created security group $LSG"
else ok "reusing security group $LSG"; fi
if OUT=$(aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$RDS_SG" --protocol tcp --port 3306 --source-group "$LSG" 2>&1); then
  ok "RDS now accepts MySQL (3306) from the Lambda security group only"
elif grep -q "Duplicate" <<<"$OUT"; then ok "RDS rule already present"
else die "Could not add the RDS security-group rule: $OUT"; fi

RTS=""
for s in ${SUBNETS//,/ }; do
  rt=$(awsq ec2 describe-route-tables --filters "Name=association.subnet-id,Values=$s" --query 'RouteTables[0].RouteTableId' --output text)
  if [ "$rt" = "None" ]; then
    rt=$(awsq ec2 describe-route-tables --filters "Name=vpc-id,Values=$VPC" "Name=association.main,Values=true" --query 'RouteTables[0].RouteTableId' --output text)
  fi
  case " $RTS " in *" $rt "*) ;; *) RTS="$RTS $rt";; esac
done
RTS="${RTS# }"
EP=$(awsq ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=$VPC" "Name=service-name,Values=com.amazonaws.$REGION.s3" --query 'VpcEndpoints[0].VpcEndpointId' --output text)
if [ "$EP" = "None" ]; then
  EP=$(awsq ec2 create-vpc-endpoint --vpc-id "$VPC" --service-name "com.amazonaws.$REGION.s3" --vpc-endpoint-type Gateway --route-table-ids $RTS --query VpcEndpoint.VpcEndpointId --output text)
  ok "created free S3 gateway endpoint $EP"
else
  aws ec2 modify-vpc-endpoint --region "$REGION" --vpc-endpoint-id "$EP" --add-route-table-ids $RTS >/dev/null 2>&1 || true
  ok "S3 gateway endpoint $EP already exists (route tables ensured)"
fi

say "5/7 Cognito (login system)"
POOL=$(awsq cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='voyara-users'].Id | [0]" --output text)
if [ "$POOL" = "None" ]; then
  POOL=$(awsq cognito-idp create-user-pool --pool-name voyara-users --username-attributes email --auto-verified-attributes email \
    --schema Name=email,AttributeDataType=String,Required=true,Mutable=true Name=name,AttributeDataType=String,Required=true,Mutable=true \
    --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}' \
    --mfa-configuration OFF --query UserPool.Id --output text)
  ok "created user pool $POOL"
else ok "reusing user pool $POOL"; fi
CLIENT=$(awsq cognito-idp list-user-pool-clients --user-pool-id "$POOL" --query "UserPoolClients[?ClientName=='voyara-web'].ClientId | [0]" --output text)
if [ "$CLIENT" = "None" ]; then
  CLIENT=$(awsq cognito-idp create-user-pool-client --user-pool-id "$POOL" --client-name voyara-web --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --access-token-validity 1 --id-token-validity 1 --refresh-token-validity 1 \
    --token-validity-units AccessToken=hours,IdToken=hours,RefreshToken=days \
    --prevent-user-existence-errors ENABLED --query UserPoolClient.ClientId --output text)
  ok "created app client $CLIENT"
else ok "reusing app client $CLIENT"; fi
if OUT=$(aws cognito-idp create-group --region "$REGION" --user-pool-id "$POOL" --group-name admins 2>&1); then ok "created group 'admins'"
elif grep -q "GroupExistsException" <<<"$OUT"; then ok "group 'admins' already exists"
else die "Could not create the admins group: $OUT"; fi

say "6/7 Deploying the API (takes 3-6 minutes)"
cd "$ROOT/infra"
sam build -t template.yaml
sam deploy --stack-name "$STACK" --region "$REGION" --capabilities CAPABILITY_IAM \
  --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset \
  --parameter-overrides \
    "DbHost=$DBHOST" "DbName=voyara" "DbUser=voyara_app" "DbPassword=$APP_PASS" \
    "MigrateDbUser=$MASTER_USER" "MigrateDbPassword=$MASTER_PASS" \
    "UserPoolId=$POOL" "UserPoolClientId=$CLIENT" \
    "SubnetIds=$SUBNETS" "LambdaSecurityGroupId=$LSG" \
    "AllowedOrigins=${ALLOWED_ORIGINS:-http://localhost:3000}" "AlertEmail=$ALERT_EMAIL"
API_URL=$(awsq cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
REPORTS=$(awsq cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='ReportsBucketName'].OutputValue" --output text)
ok "API: $API_URL"

say "7/7 Creating the database tables, then writing frontend/.env.local"
TMP=$(mktemp)
aws lambda invoke --region "$REGION" --function-name "$STACK-migrate" --cli-binary-format raw-in-base64-out --payload '{}' "$TMP" >/dev/null \
  || die "Could not start the migrate function."
cat "$TMP"; echo
grep -q '"errorMessage"' "$TMP" && die "Migration failed. Open CloudWatch > Log groups > /aws/lambda/$STACK-migrate. Usually: wrong master password, or RDS is not reachable from the subnets."
rm -f "$TMP"
ENVFILE="$ROOT/frontend/.env.local"
[ -f "$ENVFILE" ] && cp "$ENVFILE" "$ENVFILE.bak"
cat > "$ENVFILE" <<ENV
REACT_APP_API_URL=$API_URL
REACT_APP_COGNITO_USER_POOL_ID=$POOL
REACT_APP_COGNITO_CLIENT_ID=$CLIENT
ENV
ok "wrote $ENVFILE"

cat <<DONE

==================== ALL DONE ====================
1. Open your email and click "Confirm subscription" (SNS) - optional but needed for alerts.
2. Start the website:   cd "$ROOT/frontend" && npm install && npm start
3. Sign up in the browser, enter the emailed code, log in.
4. To become admin: Cognito console > user pool voyara-users > your user > Add user to group > admins.
Reports bucket: $REPORTS
Save these (you will need them for CloudFront later): pool=$POOL client=$CLIENT api=$API_URL
==================================================
DONE
