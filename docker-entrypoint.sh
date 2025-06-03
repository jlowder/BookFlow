#!/bin/sh

# Ensure the data directory exists and has proper permissions
mkdir -p /app/data
chown nextjs:nodejs /app/data
chmod 755 /app/data

# If database file exists but has wrong permissions, fix it
if [ -f /app/data/reading_journal.db ]; then
    chown nextjs:nodejs /app/data/reading_journal.db
    chmod 644 /app/data/reading_journal.db
fi

# Start the application
exec "$@"