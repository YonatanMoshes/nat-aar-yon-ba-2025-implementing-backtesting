# This is a PowerShell script to orchestrate the entire workflow.
# It uses only safe ASCII characters to avoid encoding errors.

# Set error action to stop to exit on any command failure
$ErrorActionPreference = "Stop"

# --- STEP 1: Ensure local directories exist ---
Write-Host "STEP 1: Ensuring local directories for outputs exist..."
$dirsToCreate = @(
    "./mongo-init/dumps/crypto_predictions",
    "./ModelServer/btc/training_files",
    "./ModelServer/btc_pct/training_files"
)
foreach ($dir in $dirsToCreate) {
    if (-not (Test-Path -Path $dir -PathType Container)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}
Write-Host "(OK) Directories are ready."

# --- STEP 2: Start all services in the background ---
Write-Host "`nSTEP 2: Starting all Docker services (this may take a moment)..."
docker-compose up -d --build
Write-Host "(OK) All services are running."

# --- STEP 3: Trigger a data update for all stocks ---
$stocks = "BTC", "ETH", "LTC"
Write-Host "`nSTEP 3: Triggering manual data update tasks for: $($stocks -join ', ')..."

foreach ($stock in $stocks) {
    Write-Host "  - Triggering update for $stock..."
    docker-compose exec model-worker python -c "from app import start_update_workflow_safely; start_update_workflow_safely.delay('$stock', triggered_by='manual_script')"
}
Write-Host "(OK) All update tasks have been queued."

# --- STEP 4: Wait intelligently for tasks to finish ---
# Assumes 'check_task_status.py' exists in './scripts/' and you have Python installed locally.
# Also assumes you have the 'redis' Python library on your local machine: pip install redis
Write-Host "`nSTEP 4: Monitoring background tasks..."
$stocksString = $stocks -join ','
py -3 ./scripts/check_task_status.py $stocksString

# --- STEP 5: Export the MongoDB database ---
Write-Host "`nSTEP 5: Exporting MongoDB data to BSON files..."
docker-compose exec model-server python /app/scripts/export_mongo.py
Write-Host "(OK) Database export complete."

# --- STEP 6: Stop all services ---
Write-Host "`nSTEP 6: All tasks complete. Shutting down services..."
docker-compose down
Write-Host "`nWorkflow finished successfully!"