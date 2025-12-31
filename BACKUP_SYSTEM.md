# Automatic Backup System

## Overview

The automatic backup system creates rolling backups of the PostgreSQL database, keeping at least 2 days of backups OR 10 most recent backups, whichever is greater.

## Backup Retention Policy

- **Minimum Days**: 2 days
- **Minimum Count**: 10 backups
- **Retention**: Keeps the greater of the two (if 2 days = 5 backups, keeps 10; if 10 backups = 1 day, keeps 2 days)

## Automatic Backups

### Setup

Run the setup script once:
```bash
bash scripts/setup-auto-backup.sh
```

This creates a cron job that runs every 6 hours.

### Manual Backup

```bash
npm run db:backup:auto
```

Or directly:
```bash
DATABASE_URL=$(pm2 env 0 | grep DATABASE_URL | cut -d' ' -f2) bash scripts/auto-backup-db.sh
```

## Backup Files

Backups are stored in `./backups/`:
- `backup_YYYYMMDD_HHMMSS.sql` - SQL dump file
- `backup_YYYYMMDD_HHMMSS.json` - Metadata (timestamp, size, etc.)

## Restoring from Backup

```bash
# List available backups
ls -lt backups/*.sql

# Restore a specific backup
psql $DATABASE_URL < backups/backup_YYYYMMDD_HHMMSS.sql
```

Or use the import script:
```bash
node scripts/import-data.mjs
```

## Monitoring

Check backup logs:
```bash
tail -f logs/backup-cron.log
```

View cron jobs:
```bash
crontab -l
```

## Backup Schedule

- **Frequency**: Every 6 hours
- **Times**: 00:00, 06:00, 12:00, 18:00 UTC (or local time)

## Troubleshooting

If backups fail:
1. Check `logs/backup-cron.log` for errors
2. Verify `DATABASE_URL` is set correctly
3. Ensure `pg_dump` is available in PATH
4. Check database connection permissions









