#!/bin/bash
set -e

APP_NAME="wopiserver"
RESOURCE_GROUP="Szilveszter-coediting"
SUBSCRIPTION="R&D - Test"
APP_URL="https://$APP_NAME-d4hwafe4g7gsgsds.westeurope-01.azurewebsites.net"

# Load secrets from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

echo "Setting subscription..."
az account set --subscription "$SUBSCRIPTION"

echo "Configuring app settings..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    OFFICE_ONLINE_SERVER="https://collabora.atgpartners.info" \
    WOPI_IMPLEMENTED="view,open,edit" \
    WOPI_SERVER="$APP_URL" \
    VERBOSE_LOGGING="true" \
    STORAGE_MODE="$STORAGE_MODE" \
    AZURE_STORAGE_ACCOUNT_NAME="$AZURE_STORAGE_ACCOUNT_NAME" \
    AZURE_STORAGE_ACCOUNT_KEY="$AZURE_STORAGE_ACCOUNT_KEY" \
    AZURE_STORAGE_CONTAINER="$AZURE_STORAGE_CONTAINER" \
    AZURE_STORAGE_LOCK_TABLE="$AZURE_STORAGE_LOCK_TABLE" \
  --output none

# Restart to pick up new settings
echo "Restarting app..."
az webapp restart \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP"

echo "=== Environment variables configured ==="
