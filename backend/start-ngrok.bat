@echo off
REM Script để chạy ngrok với config file trong thư mục backend
REM Sử dụng: Chạy file này từ thư mục backend

echo Starting ngrok with config file...
cd /d %~dp0
ngrok start --config=ngrok.yml backend

pause

