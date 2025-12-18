# Contributing Guidelines

**Last Updated**: 2025-12-18

## Security Guidelines

### ⚠️ NEVER Commit Secrets

**DO NOT commit:**
- API keys (OpenAI, Google, etc.)
- Database passwords
- Authentication tokens
- Private keys
- Any credentials

**Always use:**
- Placeholder values: `your_key_here`, `your_api_key_here`
- Environment variables loaded from `.env`
- `.env.example` for format examples

### Pre-Commit Checks

A pre-commit hook automatically scans for secrets. If you see:

```
❌ SECRET DETECTED in filename
Commit blocked to prevent secret exposure.
```

**DO NOT** bypass with `--no-verify`. Instead:
1. Remove the secret from the file
2. Use a placeholder value
3. Add the file to `.gitignore` if it must contain secrets

### Documentation

When writing documentation:
- ✅ Use: `GOOGLE_API_KEY=your_gemini_key_here`
- ❌ Never use: `GOOGLE_API_KEY=[real_api_key_value]` (real key - keys start with specific prefixes)

## Code Style

- Follow TypeScript best practices
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features

## Testing

Before submitting:
1. Run type checking: `npm run check:types`
2. Run tests: `npm test`
3. Check for secrets: Review `git diff` before committing

## Commit Messages

Use clear, descriptive commit messages:
- ✅ "Add health status monitoring to dashboard"
- ❌ "fix stuff"
- ❌ "update" (too vague)

## Questions?

If unsure about security practices, ask before committing!
