# Configuration File Protection

**Last Updated**: 2025-12-17

## Overview

The configuration files (`style_guide.yaml`, `credo.yaml`, `constraints.yaml`) are protected against accidental overwriting with empty or minimal placeholder content.

## Protection Mechanisms

### 1. Content Validation

Before writing any configuration file, the system validates:

- **Minimum length**: Content must be at least 200 characters (prevents placeholder text)
- **Placeholder detection**: Blocks known placeholder patterns like "Updated constraint", "Updated value", "tone: updated"
- **YAML structure**: Ensures the content has meaningful structure with at least one top-level key
- **YAML syntax**: Validates that the content is valid YAML

### 2. Automatic Backups

Before overwriting any configuration file, the system:

- Creates a timestamped backup in `config/.backups/`
- Keeps the last 10 backups per file (older backups are automatically deleted)
- Backup files are named: `{filename}.{timestamp}.bak`

Example backup path:
```
config/.backups/style_guide.yaml.2025-12-17T10-30-45-123Z.bak
```

### 3. Error Messages

If validation fails, the API returns a clear error message explaining why the update was rejected:

- "Configuration content is too short (X chars). Minimum required: 200 characters."
- "Content appears to be placeholder text. Please provide actual configuration content."
- "Configuration must contain at least one top-level key with content."

## API Behavior

### PUT /api/config/style-guide
### PUT /api/config/credo
### PUT /api/config/constraints

**Request:**
```json
{
  "content": "your yaml content here..."
}
```

**Success Response:**
```json
{
  "success": true,
  "backupPath": "config/.backups/style_guide.yaml.2025-12-17T10-30-45-123Z.bak",
  "message": "Configuration updated. Backup created."
}
```

**Error Response (400):**
```json
{
  "error": "Configuration content is too short (50 chars). Minimum required: 200 characters. This prevents accidental overwriting with placeholder content."
}
```

## Restoring from Backup

If you need to restore a configuration file from a backup:

```bash
# List available backups
ls -la config/.backups/

# Restore a specific backup
cp config/.backups/style_guide.yaml.2025-12-17T10-30-45-123Z.bak config/style_guide.yaml
```

Or use git to restore from the last commit:

```bash
git checkout HEAD -- config/style_guide.yaml
```

## Manual Override

If you need to bypass validation (e.g., for legitimate minimal configs), you can:

1. Edit the files directly (bypasses API validation)
2. Temporarily lower the `minLength` parameter in `src/server/api/config-helpers.ts`
3. Use git to restore previous versions

**Note**: Direct file editing bypasses all protection mechanisms. Use with caution.

## Best Practices

1. **Always review changes** before saving in the UI
2. **Keep git commits** of your configuration files for additional safety
3. **Check backups** if something seems wrong after an update
4. **Test changes** in a development environment first if possible

## Technical Details

- Validation logic: `src/server/api/config-helpers.ts`
- Backup directory: `config/.backups/` (gitignored)
- Minimum content length: 200 characters (configurable)
- Maximum backups kept: 10 per file
