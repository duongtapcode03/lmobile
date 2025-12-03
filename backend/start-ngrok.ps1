# PowerShell script để chạy ngrok với config file trong thư mục backend
# Sử dụng: .\start-ngrok.ps1

Write-Host "Starting ngrok with config file..." -ForegroundColor Green

# Lấy đường dẫn thư mục hiện tại
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Chạy ngrok với config file
ngrok start --config=ngrok.yml backend

