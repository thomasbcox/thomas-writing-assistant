# Writing Configuration Management

## Overview

The Writing Configuration system allows you to manage your writing style, core beliefs, and content constraints through a user-friendly UI. All changes are saved immediately and automatically reloaded - no server restart required.

## Accessing Configuration

Navigate to the **Writing Config** tab in the main application interface. This tab provides three sections:

1. **Style Guide** - Writing voice, tone, vocabulary, and techniques
2. **Credo & Values** - Core beliefs, values, and ethical guidelines  
3. **Constraints** - Hard rules, boundaries, and formatting requirements

## Editing Configuration

### Using the UI (Recommended)

1. Click on the **Writing Config** tab
2. Select the section you want to edit (Style Guide, Credo, or Constraints)
3. Edit the YAML content in the textarea
4. Click "Save & Reload [Section Name]"
5. Changes are immediately applied to all future AI-generated content

### Manual Editing (Alternative)

You can also edit the YAML files directly:

- `config/style_guide.yaml` - Writing style preferences
- `config/credo.yaml` - Core beliefs and values
- `config/constraints.yaml` - Content rules and boundaries

**Note:** If you edit files manually, you must restart the server for changes to take effect.

## YAML Validation

The system validates YAML syntax before saving. If your YAML is invalid, you'll see an error message and the file won't be updated. Common issues:

- **Indentation errors** - YAML is sensitive to spacing (use 2 spaces, not tabs)
- **Unclosed strings** - Make sure all quoted strings are properly closed
- **Invalid syntax** - Check for missing colons, dashes, or brackets

## Immediate Reload

When you save changes through the UI:

1. YAML syntax is validated
2. File is written to disk
3. `ConfigLoader.reloadConfigs()` is called automatically
4. New configuration is immediately available for all LLM calls
5. Success notification is displayed

## How Configuration is Used

Your configuration files are combined into system prompts for all AI operations:

- **Concept generation** - Uses your style guide and credo
- **Link proposals** - Respects your constraints and values
- **Content repurposing** - Applies your writing style and voice
- **Anchor extraction** - Follows your content approach guidelines

## API Endpoints

The configuration system exposes the following tRPC endpoints:

### Read Operations
- `config.getStyleGuideRaw()` - Get raw YAML content of style guide
- `config.getCredoRaw()` - Get raw YAML content of credo
- `config.getConstraintsRaw()` - Get raw YAML content of constraints
- `config.getStyleGuide()` - Get parsed style guide object
- `config.getCredo()` - Get parsed credo object
- `config.getConstraints()` - Get parsed constraints object

### Write Operations
- `config.updateStyleGuide({ content: string })` - Update style guide YAML
- `config.updateCredo({ content: string })` - Update credo YAML
- `config.updateConstraints({ content: string })` - Update constraints YAML

All write operations:
- Validate YAML syntax
- Write to disk
- Automatically reload the configuration
- Return success/error status

## Testing

Configuration management is fully tested:

- **Unit tests** - `src/test/config.test.ts` - Tests ConfigLoader functionality
- **Router tests** - `src/test/routers/config.test.ts` - Tests API endpoints

Run tests with:
```bash
npm test -- src/test/config.test.ts src/test/routers/config.test.ts
```

## Best Practices

1. **Backup before major changes** - The config files are in version control, but consider backing up before large edits
2. **Test incrementally** - Make small changes and test AI generation to see the impact
3. **Use YAML comments** - Add comments (starting with `#`) to document your preferences
4. **Validate locally** - Use a YAML validator if you're unsure about syntax
5. **Version control** - Commit configuration changes to track your style evolution

## Troubleshooting

### Changes Not Taking Effect

- If using the UI: Check for error messages in the toast notifications
- If editing manually: Restart the server after saving files
- Check server logs for YAML parsing errors

### YAML Validation Errors

- Use a YAML validator (online or VS Code extension) to check syntax
- Ensure consistent indentation (2 spaces recommended)
- Check for unclosed quotes or brackets
- Verify colons and dashes are properly formatted

### Configuration Not Loading

- Verify files exist in `config/` directory
- Check file permissions (should be readable)
- Review server logs for loading errors
- Ensure YAML syntax is valid

## File Structure

Each configuration file follows a specific structure:

### style_guide.yaml
```yaml
voice:
  tone: "..."
  personality: "..."
writing_style:
  sentence_length: "..."
  # ... more sections
```

### credo.yaml
```yaml
core_beliefs:
  - "Belief 1"
  - "Belief 2"
content_philosophy:
  purpose: "..."
  # ... more sections
```

### constraints.yaml
```yaml
content_constraints:
  word_count:
    minimum: 800
never_do:
  - "Rule 1"
  # ... more sections
```

See the actual files in `config/` for complete examples.

