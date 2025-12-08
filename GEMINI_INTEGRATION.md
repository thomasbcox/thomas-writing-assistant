# Google Gemini Integration

## Overview

The application now supports **both OpenAI and Google Gemini** as LLM providers. You can switch between them or let the system automatically choose based on available API keys.

## Architecture

### Provider-Agnostic Design

The LLM system uses a **provider-agnostic interface** (`ILLMProvider`) that both OpenAI and Gemini implement:

```
┌─────────────────────────────────┐
│      LLMClient (Unified)        │
│  - Manages provider switching   │
│  - Handles configuration        │
└──────────────┬──────────────────┘
               │
       ┌───────┴────────┐
       │                 │
┌──────▼──────┐  ┌──────▼──────┐
│ OpenAI       │  │ Gemini      │
│ Provider     │  │ Provider    │
└──────────────┘  └──────────────┘
```

### File Structure

```
src/server/services/llm/
├── types.ts              # Provider interface and types
├── client.ts             # Unified LLM client
├── index.ts              # Exports
├── providers/
│   ├── openai.ts        # OpenAI implementation
│   └── gemini.ts        # Gemini implementation
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# OpenAI (optional)
OPENAI_API_KEY=your_openai_key_here

# Google Gemini (optional, but you have this set)
GOOGLE_API_KEY=your_gemini_key_here
```

### Default Behavior

- **If both keys are set**: Prefers Gemini (you can override in Settings)
- **If only one key is set**: Uses that provider
- **If no keys are set**: Throws an error

## Usage

### Automatic Provider Selection

The system automatically selects a provider based on available API keys:

```typescript
import { getLLMClient } from "~/server/services/llm/client";

const client = getLLMClient();
// Will use Gemini if GOOGLE_API_KEY is set, otherwise OpenAI
```

### Manual Provider Selection

```typescript
const client = new LLMClient({ 
  provider: "gemini",  // or "openai"
  model: "gemini-1.5-flash",
  temperature: 0.7 
});
```

### Switching Providers at Runtime

```typescript
const client = getLLMClient();
client.setProvider("gemini");  // Switch to Gemini
client.setModel("gemini-1.5-pro");  // Change model
```

## Available Models

### Gemini Models
- `gemini-1.5-flash` (default) - Fast and efficient
- `gemini-1.5-pro` - More capable, better for complex tasks
- `gemini-pro` - Standard model

### OpenAI Models
- `gpt-4o-mini` (default) - Fast and cost-effective
- `gpt-4o` - Balanced performance
- `gpt-4-turbo` - Advanced capabilities
- `gpt-3.5-turbo` - Legacy option

## UI Integration

### Settings Tab

The Settings tab now includes:
- **Provider selection** dropdown (OpenAI or Gemini)
- **Model selection** (dynamically updates based on provider)
- **Temperature slider** (0-2)
- **Current settings display**

### API Endpoints

New tRPC procedures in `aiRouter`:

- `getSettings` - Returns current provider, model, temperature, and available providers
- `updateSettings` - Updates provider, model, and/or temperature
- `getAvailableModels` - Returns list of models for current provider

## Service Layer Integration

All services automatically use the configured provider:

- `conceptProposer.ts` - Uses current LLM provider
- `linkProposer.ts` - Uses current LLM provider  
- `repurposer.ts` - Uses current LLM provider

No code changes needed - they all use `getLLMClient()` which handles provider selection.

## Testing

Tests verify:
- ✅ Provider selection logic
- ✅ Model configuration
- ✅ Provider switching
- ✅ Error handling for missing API keys

## Benefits

1. **Cost Flexibility** - Use cheaper Gemini for some tasks, OpenAI for others
2. **Reliability** - Fallback if one provider is down
3. **Performance** - Choose fastest provider for your use case
4. **Future-Proof** - Easy to add more providers (Anthropic, etc.)

## Current Status

✅ **Gemini Integration Complete**
- Google Gemini API key configured
- Provider system implemented
- Settings UI updated
- All services use unified client
- Tests passing

The system will automatically use Gemini since you have `GOOGLE_API_KEY` set. You can switch to OpenAI in the Settings tab if needed.

