set -euo pipefail
cd /Users/dextermorgan/Desktop/gigzmanapp
export AWS_REGION=ap-south-1 AWS_PROFILE=dhando-dev
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
exec npx tsx --env-file=.env.local "$@"
