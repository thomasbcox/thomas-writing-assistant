# Automatic Backups Setup Instructions

## Quick Setup

Run this command once to set up automatic backups:

```bash
bash scripts/setup-auto-backup.sh
```

This will:
- Create a cron job that runs every 6 hours
- Automatically clean up old backups (keeps 2 days OR 10 backups, whichever is greater)
- Log backup operations to `logs/backup-cron.log`

## Manual Backup

To create a backup manually:

```bash
npm run db:backup:auto
```

## Verify Setup

Check that cron job is set up:
```bash
crontab -l | grep auto-backup
```

Check backup logs:
```bash
tail -f logs/backup-cron.log
```

## Backup Location

Backups are stored in `./backups/`:
- SQL dump files: `backup_YYYYMMDD_HHMMSS.sql`
- Metadata files: `backup_YYYYMMDD_HHMMSS.json`

## Restore from Backup

```bash
# List available backups
ls -lt backups/*.sql

# Restore a specific backup
psql $DATABASE_URL < backups/backup_YYYYMMDD_HHMMSS.sql
```

## Backup Retention

- **Minimum**: 2 days of backups
- **Minimum**: 10 most recent backups
- **Keeps**: Whichever is greater

Example: If backups run every 6 hours for 2 days = 8 backups, but minimum is 10, so keeps 10.
If backups run every 6 hours for 3 days = 12 backups, and 2 days = 8, so keeps 12 (all from last 3 days).








