# Preventing Secret Exposure

**Last Updated**: 2025-12-18

## Overview

This document outlines measures to prevent API keys, secrets, and sensitive data from being committed to git.

## Prevention Measures

### 1. Pre-Commit Hook with git-secrets

Install and configure git-secrets to automatically scan commits:

```bash
# Install git-secrets
brew install git-secrets

# Initialize in this repository
git secrets --install

# Register common patterns
git secrets --register-aws
git secrets --add 'AIzaSy[A-Za-z0-9_-]{35}'
git secrets --add 'sk-[A-Za-z0-9]{32,}'
git secrets --add --literal 'GOOGLE_API_KEY='
git secrets --add --literal 'OPENAI_API_KEY='
```

**Test it:**
```bash
# This should fail (using a pattern that matches real keys)
echo "GOOGLE_API_KEY=your_gemini_key_here" > test.txt
# To test with a real pattern, temporarily use a key that starts with the Google API prefix
# (Real keys follow a specific pattern that the hook detects)
git add test.txt
git commit -m "test"  # Should be blocked if real pattern detected
rm test.txt
```

### 2. Updated .gitignore

Ensure all sensitive files are ignored:

```gitignore
# Environment variables (already in place)
.env
.env.local
.env*.local

# Add any other sensitive files
*.key
*.pem
secrets/
```

### 3. Documentation Guidelines

**DO:**
- ✅ Use placeholder values: `your_key_here`, `your_api_key_here`
- ✅ Reference `.env.example` for format
- ✅ Use comments to explain where to get keys

**DON'T:**
- ❌ Copy real keys from `.env` into documentation
- ❌ Use actual keys in examples
- ❌ Commit files with real credentials

### 4. Code Review Checklist

Before merging PRs, check:
- [ ] No API keys in code
- [ ] No secrets in documentation
- [ ] All sensitive values use placeholders
- [ ] `.env` files are gitignored
- [ ] No credentials in commit messages

### 5. Automated Scanning

Add to CI/CD (if you set it up):

```yaml
# Example GitHub Actions
- name: Check for secrets
  run: |
    git secrets --scan-history
```

## Manual Checks Before Committing

Run these commands before committing:

```bash
# Check for API keys
git diff --cached | grep -iE "api.*key|secret|password|token" | grep -v "your_.*_here\|test-.*\|example"

# Check for common key patterns
git diff --cached | grep -E "AIzaSy|sk-[a-zA-Z0-9]{32,}"

# Check all files being committed
git diff --cached --name-only | xargs grep -lE "AIzaSy|sk-[a-zA-Z0-9]{32,}" 2>/dev/null
```

## Emergency Response

If a secret is accidentally committed:

1. **Immediately revoke the key** in the service provider's console
2. **Remove from git history** (see SECURITY_INCIDENT_API_KEY.md)
3. **Create new key** and update `.env`
4. **Force push** (if private repo) or contact repo admin

## Tools

- **git-secrets**: Pre-commit scanning
- **truffleHog**: Advanced secret scanning
- **git-secrets-aws**: AWS-specific patterns
- **detect-secrets**: Yelp's secret detection

## Best Practices

1. **Never commit secrets** - Even in "temporary" commits
2. **Use environment variables** - Always load from `.env`
3. **Use placeholder values** - In all documentation and examples
4. **Review before committing** - Check `git diff` before `git commit`
5. **Use separate keys** - Different keys for dev/staging/prod
6. **Rotate regularly** - Even if not exposed, rotate keys periodically

## Verification

Test that prevention is working:

```bash
# Try to commit a test file with a fake key
# Note: Use placeholder values in documentation examples
echo "GOOGLE_API_KEY=your_gemini_key_here" > test-secret.txt
git add test-secret.txt
git commit -m "test"  # Should pass with placeholder
# Real keys starting with AIzaSy would be blocked by git-secrets
rm test-secret.txt
```
