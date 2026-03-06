#!/bin/bash
set -e

APP_NAME="wopiserver"
RESOURCE_GROUP="Szilveszter-coediting"
SUBSCRIPTION="R&D - Test"
APP_URL="https://$APP_NAME-d4hwafe4g7gsgsds.westeurope-01.azurewebsites.net"

echo "=== Deploying $APP_NAME to Azure App Service ==="

# Set subscription
echo "Setting subscription..."
az account set --subscription "$SUBSCRIPTION"

# Create zip from git (source only, no bin/)
echo "Creating deployment package..."
rm -f build.zip
git archive --format=zip -o build.zip HEAD

# Deploy
echo "Deploying code..."
az webapp deploy \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --src-path build.zip

rm -f build.zip

echo ""
echo "=== Deployment complete ==="
echo "URL: $APP_URL"
