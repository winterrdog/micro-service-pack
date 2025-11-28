#!/bin/sh
set -e

echo "+ Running database migrations..."
npx prisma migrate deploy

echo -e "\n+ Starting application..."
exec node dist/src/main.js
