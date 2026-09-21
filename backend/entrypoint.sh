#!/bin/sh
set -e

echo "Waiting for MySQL at ${MYSQL_HOST:-db}:${MYSQL_PORT:-3306}..."
while ! nc -z "${MYSQL_HOST:-db}" "${MYSQL_PORT:-3306}"; do
  sleep 1
done
echo "MySQL is up."

if [ "$1" = "daphne" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput --clear
  python manage.py seed_demo
fi

exec "$@"
