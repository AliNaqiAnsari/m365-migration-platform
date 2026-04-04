#!/bin/bash
# ============================================================
# Setup OIDC Service Principal for GitHub Actions → Azure
# Run once after creating the GitHub repository.
#
# Prerequisites:
#   - az CLI logged in
#   - gh CLI logged in
#   - Terraform resources already created (or resource groups exist)
#
# Usage: ./infrastructure/setup-oidc.sh
# ============================================================
set -euo pipefail

APP="m365-migration"
SUBSCRIPTION_ID="46f745ed-5e15-4b02-bd50-1d4a64a25e86"
GITHUB_ORG="AliNaqiAnsari"
GITHUB_REPO="m365-migration-platform"
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "=== M365 Migration Platform — OIDC Setup ==="
echo "Subscription: $SUBSCRIPTION_ID"
echo "Tenant:       $TENANT_ID"
echo "GitHub:       $GITHUB_ORG/$GITHUB_REPO"
echo ""

# 1. Create service principal with Contributor on both resource groups
echo "1. Creating service principal..."
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "sp-${APP}-cicd" \
  --role Contributor \
  --scopes \
    "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-${APP}-stg" \
    "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-${APP}-prd" \
  2>/dev/null || true)

SP_APP_ID=$(az ad sp list --display-name "sp-${APP}-cicd" --query "[0].appId" -o tsv)
echo "   Service Principal App ID: $SP_APP_ID"

# 2. Grant ACR push access
echo "2. Granting ACR push access..."
ACR_ID=$(az acr show --name acrm365migr3li --query id -o tsv 2>/dev/null || echo "")
if [ -n "$ACR_ID" ]; then
  az role assignment create --assignee "$SP_APP_ID" --role AcrPush --scope "$ACR_ID" 2>/dev/null || true
  echo "   ACR push granted"
else
  echo "   ACR not found — run 'terraform apply' first, then re-run this script"
fi

# 3. Create federated credentials for OIDC
echo "3. Creating federated credentials..."

# Staging environment
az ad app federated-credential create --id "$SP_APP_ID" --parameters "{
  \"name\": \"github-staging\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:staging\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" 2>/dev/null || echo "   (staging credential already exists)"

# Production environment
az ad app federated-credential create --id "$SP_APP_ID" --parameters "{
  \"name\": \"github-production\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:production\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" 2>/dev/null || echo "   (production credential already exists)"

# Main branch (for push trigger)
az ad app federated-credential create --id "$SP_APP_ID" --parameters "{
  \"name\": \"github-main-branch\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" 2>/dev/null || echo "   (main branch credential already exists)"

echo "   Federated credentials configured"

# 4. Set GitHub secrets
echo "4. Setting GitHub repository secrets..."

gh secret set AZURE_CLIENT_ID --repo "$GITHUB_ORG/$GITHUB_REPO" --body "$SP_APP_ID"
gh secret set AZURE_TENANT_ID --repo "$GITHUB_ORG/$GITHUB_REPO" --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$GITHUB_ORG/$GITHUB_REPO" --body "$SUBSCRIPTION_ID"

echo "   GitHub secrets set (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID)"

# 5. Create GitHub environments
echo "5. Creating GitHub environments..."
gh api repos/$GITHUB_ORG/$GITHUB_REPO/environments/staging --method PUT --silent 2>/dev/null || true
gh api repos/$GITHUB_ORG/$GITHUB_REPO/environments/production --method PUT --silent 2>/dev/null || true
echo "   Environments created: staging, production"

echo ""
echo "=== OIDC Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Run 'terraform apply' with environment=stg to create staging resources"
echo "  2. Set per-environment secrets in GitHub (DATABASE_URL, JWT_SECRET, etc.)"
echo "  3. Push to main branch to trigger staging deployment"
echo ""
echo "Per-environment secrets to set manually:"
echo "  gh secret set DATABASE_URL --env staging --repo $GITHUB_ORG/$GITHUB_REPO --body '<staging-db-url>'"
echo "  gh secret set JWT_SECRET --env staging --repo $GITHUB_ORG/$GITHUB_REPO --body '<jwt-secret>'"
echo "  gh secret set ENCRYPTION_KEY --env staging --repo $GITHUB_ORG/$GITHUB_REPO --body '<32-char-key>'"
echo "  gh secret set STRIPE_SECRET_KEY --env staging --repo $GITHUB_ORG/$GITHUB_REPO --body '<stripe-test-key>'"
echo "  gh secret set STRIPE_WEBHOOK_SECRET --env staging --repo $GITHUB_ORG/$GITHUB_REPO --body '<stripe-webhook-secret>'"
