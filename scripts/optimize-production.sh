#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
echo "Production caches warmed. Ensure APP_DEBUG=false and SESSION_DRIVER=file on shared hosting."
