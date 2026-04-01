#!/bin/bash
set -euo pipefail

# ============================================================
# M365 Migration Platform — Azure Deployment
# ============================================================
# Deploys: ACR, PostgreSQL, Redis, Blob Storage, Container Apps
# Auto-scaling: API scales on HTTP requests, Worker scales on
# Redis queue depth (more pending jobs = more workers).
#
# Usage:
#   ./infrastructure/deploy.sh
# ============================================================

PROJECT="m365migrate"
LOCATION="${AZURE_LOCATION:-eastus}"
RG="${PROJECT}-rg"
ACR_NAME="${PROJECT}acr"
PG_SERVER="${PROJECT}-pg"
PG_DB="m365_migration"
PG_ADMIN="pgadmin"
REDIS_NAME="${PROJECT}-redis"
STORAGE_NAME="${PROJECT}sa"
ENV_NAME="${PROJECT}-env"
LOG_NAME="${PROJECT}-logs"

# Resolve to project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Check prerequisites
command -v az >/dev/null 2>&1 || { echo "Error: Azure CLI (az) is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required"; exit 1; }

# Verify Azure login
az account show >/dev/null 2>&1 || { echo "Error: Run 'az login' first"; exit 1; }

SUBSCRIPTION=$(az account show --query name -o tsv)
echo ""
echo "============================================"
echo " M365 Migration Platform — Azure Deployment"
echo "============================================"
echo " Subscription: $SUBSCRIPTION"
echo " Location:     $LOCATION"
echo " RG:           $RG"
echo "============================================"
echo ""

# Generate secrets
PG_PASSWORD=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | head -c 64)
ENCRYPTION_KEY=$(openssl rand -base64 24 | head -c 32)

# ---- Step 1: Resource Group ----
echo "[1/10] Creating resource group..."
az group create --name "$RG" --location "$LOCATION" -o none

# ---- Step 2: Container Registry ----
echo "[2/10] Creating Container Registry..."
az acr create --name "$ACR_NAME" --resource-group "$RG" --sku Basic --admin-enabled true -o none
ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
echo "  -> $ACR_SERVER"

# ---- Step 3: PostgreSQL ----
echo "[3/10] Creating PostgreSQL Flexible Server (~3 min)..."
az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --location "$LOCATION" \
  --admin-user "$PG_ADMIN" \
  --admin-password "$PG_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --yes \
  --public-access 0.0.0.0 \
  -o none

az postgres flexible-server db create \
  --resource-group "$RG" --server-name "$PG_SERVER" --database-name "$PG_DB" -o none

PG_HOST=$(az postgres flexible-server show --resource-group "$RG" --name "$PG_SERVER" --query fullyQualifiedDomainName -o tsv)
DATABASE_URL="postgresql://${PG_ADMIN}:${PG_PASSWORD}@${PG_HOST}:5432/${PG_DB}?sslmode=require"
echo "  -> $PG_HOST"

# ---- Step 4: Redis ----
echo "[4/10] Creating Redis Cache (~5 min)..."
az redis create \
  --resource-group "$RG" \
  --name "$REDIS_NAME" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  -o none

REDIS_HOST=$(az redis show --resource-group "$RG" --name "$REDIS_NAME" --query hostName -o tsv)
REDIS_PORT=$(az redis show --resource-group "$RG" --name "$REDIS_NAME" --query sslPort -o tsv)
REDIS_KEY=$(az redis list-keys --resource-group "$RG" --name "$REDIS_NAME" --query primaryKey -o tsv)
echo "  -> $REDIS_HOST:$REDIS_PORT"

# ---- Step 5: Storage Account ----
echo "[5/10] Creating Storage Account..."
az storage account create \
  --resource-group "$RG" --name "$STORAGE_NAME" --location "$LOCATION" --sku Standard_LRS -o none
az storage container create --account-name "$STORAGE_NAME" --name migration-staging -o none
echo "  -> $STORAGE_NAME"

# ---- Step 6: Build and Push Docker Images ----
echo "[6/10] Building Docker images..."
az acr login --name "$ACR_NAME"

echo "  Building API..."
docker build -t "${ACR_SERVER}/m365-api:latest" -f apps/api/Dockerfile .
echo "  Building Worker..."
docker build -t "${ACR_SERVER}/m365-worker:latest" -f apps/worker/Dockerfile .

echo "  Pushing images..."
docker push "${ACR_SERVER}/m365-api:latest"
docker push "${ACR_SERVER}/m365-worker:latest"
echo "  -> Images pushed to $ACR_SERVER"

# ---- Step 7: Push Database Schema ----
echo "[7/10] Pushing database schema..."
DATABASE_URL="$DATABASE_URL" npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss --skip-generate
echo "  -> Schema applied"

# ---- Step 8: Container Apps Environment ----
echo "[8/10] Creating Container Apps environment..."
az monitor log-analytics workspace create \
  --resource-group "$RG" --workspace-name "$LOG_NAME" -o none
LOG_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RG" --workspace-name "$LOG_NAME" --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RG" --workspace-name "$LOG_NAME" --query primarySharedKey -o tsv)

az containerapp env create \
  --resource-group "$RG" \
  --name "$ENV_NAME" \
  --location "$LOCATION" \
  --logs-workspace-id "$LOG_ID" \
  --logs-workspace-key "$LOG_KEY" \
  -o none
echo "  -> $ENV_NAME"

# ---- Step 9: Deploy API (auto-scales 1-10 on HTTP traffic) ----
echo "[9/10] Deploying API container app..."
az containerapp create \
  --resource-group "$RG" \
  --name "${PROJECT}-api" \
  --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/m365-api:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1 \
  --memory 2Gi \
  --scale-rule-name "http-scaling" \
  --scale-rule-type "http" \
  --scale-rule-http-concurrency 50 \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3001" \
    "DATABASE_URL=${DATABASE_URL}" \
    "REDIS_HOST=${REDIS_HOST}" \
    "REDIS_PORT=${REDIS_PORT}" \
    "REDIS_PASSWORD=${REDIS_KEY}" \
    "REDIS_TLS=true" \
    "JWT_SECRET=${JWT_SECRET}" \
    "ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
  -o none

# Add health probes
az containerapp update \
  --resource-group "$RG" \
  --name "${PROJECT}-api" \
  --set-env-vars "FRONTEND_URL=*" \
  -o none

API_FQDN=$(az containerapp show --resource-group "$RG" --name "${PROJECT}-api" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "  -> https://${API_FQDN}"

# ---- Step 10: Deploy Worker (auto-scales 0-20 on queue depth) ----
echo "[10/10] Deploying Worker container app..."

# Worker uses a custom KEDA scaler that checks Redis queue depth.
# When queues are empty, it scales to 0 (no cost).
# When jobs appear, it scales up — one replica per ~50 pending jobs, up to 20.
az containerapp create \
  --resource-group "$RG" \
  --name "${PROJECT}-worker" \
  --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/m365-worker:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --min-replicas 0 \
  --max-replicas 20 \
  --cpu 2 \
  --memory 4Gi \
  --env-vars \
    "NODE_ENV=production" \
    "DATABASE_URL=${DATABASE_URL}" \
    "REDIS_HOST=${REDIS_HOST}" \
    "REDIS_PORT=${REDIS_PORT}" \
    "REDIS_PASSWORD=${REDIS_KEY}" \
    "REDIS_TLS=true" \
    "ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
    "HEALTH_PORT=8080" \
  -o none

echo "  -> Worker deployed (scales 0-20 based on load)"

# ---- Summary ----
echo ""
echo "============================================"
echo " DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo " API:           https://${API_FQDN}"
echo " Health check:  https://${API_FQDN}/api/v1/health"
echo ""
echo " Infrastructure:"
echo "   PostgreSQL:   $PG_HOST"
echo "   Redis:        $REDIS_HOST:$REDIS_PORT"
echo "   Storage:      $STORAGE_NAME"
echo "   Registry:     $ACR_SERVER"
echo ""
echo " Auto-scaling:"
echo "   API:    1-10 replicas (scales on HTTP concurrency > 50)"
echo "   Worker: 0-20 replicas (scales on queue depth)"
echo ""
echo " Credentials (save to 1Password):"
echo "   PG_PASSWORD:    $PG_PASSWORD"
echo "   REDIS_KEY:      $(echo "$REDIS_KEY" | head -c 8)..."
echo "   JWT_SECRET:     $(echo "$JWT_SECRET" | head -c 8)..."
echo "   ENCRYPTION_KEY: $(echo "$ENCRYPTION_KEY" | head -c 8)..."
echo "   DATABASE_URL:   postgresql://${PG_ADMIN}:***@${PG_HOST}:5432/${PG_DB}?sslmode=require"
echo ""
echo " Estimated monthly cost:"
echo "   PostgreSQL B1ms:     ~\$13/mo"
echo "   Redis Basic C0:      ~\$16/mo"
echo "   Container Apps API:  ~\$5-15/mo (1 replica baseline)"
echo "   Container Apps Worker: \$0 when idle, ~\$20-50/mo during migration"
echo "   Storage:             ~\$1/mo"
echo "   Total:               ~\$35-95/mo"
echo ""
echo " Next steps:"
echo "   1. curl -X POST https://${API_FQDN}/api/v1/auth/register \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"email\":\"ali@3li.global\",\"password\":\"YOUR_PASS\",\"name\":\"Ali Ansari\",\"organizationName\":\"3LI GLOBAL\"}'"
echo ""
echo "   2. Create API key, then connect source + destination tenants"
echo "   3. Create migration and start it — worker scales up automatically"
echo "============================================"
