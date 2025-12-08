# Getting Started

Quick start guide for the Thomas Writing Assistant.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. **Create `.env` file:**
   ```env
   DATABASE_URL="file:./dev.db"
   # At least one LLM provider key is required
   OPENAI_API_KEY=your_openai_key_here
   # OR
   GOOGLE_API_KEY=your_gemini_key_here
   NODE_ENV=development
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   
   Navigate to [http://localhost:3051](http://localhost:3051)

## First Steps

1. **Explore the interface:**
   - **Dashboard** - Overview of your knowledge base and content
   - **Concepts Tab** - Create and manage your knowledge base concepts
   - **Links Tab** - Create relationships between concepts
   - **Input Tab** - Process text and extract concepts
   - **Capsules Tab** - Manage capsule content and anchor posts
   - **Writing Config Tab** - Edit your writing style, credo, and constraints (changes apply immediately)
   - **AI Settings Tab** - Configure LLM provider and model settings

2. **Create your first concept:**
   - Go to the Concepts tab
   - Click "Create New Concept"
   - Fill in the title, description, and content
   - Add metadata (creator, source, year)

3. **Link concepts together:**
   - Go to the Links tab
   - Select a source and target concept
   - Choose or create a link name (e.g., "references", "builds on")
   - The system will automatically create bidirectional links

4. **Process PDFs:**
   - Go to the Input tab
   - Click "Upload File" and select a PDF file
   - The system will extract text from the PDF automatically
   - Review the extracted text, then click "Generate Concepts"
   - Review and approve AI-generated concept candidates

## Configuration

### Writing Configuration (Recommended)

Use the **Writing Config** tab in the UI to edit your configuration files:

- **Style Guide** - Your writing voice, tone, vocabulary, and techniques
- **Credo & Values** - Your core beliefs, values, and ethical guidelines
- **Constraints** - Hard rules, boundaries, and formatting requirements

Changes are saved immediately and automatically reloaded - no server restart needed! The AI will use your updated preferences in all future content generation.

### Manual Configuration (Alternative)

You can also edit the YAML files directly in the `config/` directory:

- **`style_guide.yaml`** - Your writing voice and tone
- **`credo.yaml`** - Your core beliefs and values
- **`constraints.yaml`** - Hard rules and boundaries

If you edit files manually, restart the server for changes to take effect.

These files are used by the AI to maintain consistency across all generated content.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Create a new migration
npm run db:migrate

# Regenerate Prisma client
npm run db:generate
```

### Project Structure

- `src/app/` - Next.js pages and API routes
- `src/components/` - React UI components
- `src/server/api/routers/` - tRPC API endpoints
- `src/server/services/` - Business logic
- `prisma/` - Database schema and migrations

## Troubleshooting

### Database Issues

If you encounter database errors:

1. Delete `dev.db` and regenerate:
   ```bash
   rm dev.db
   npm run db:migrate
   ```

2. Check Prisma client is generated:
   ```bash
   npm run db:generate
   ```

### Port Configuration

The app runs on port 3051 by default. To change this, update the `dev` and `start` scripts in `package.json`.

### API Key Issues

The app requires at least one LLM provider API key for AI features. You can use either:
- **OpenAI**: `OPENAI_API_KEY=sk-your-key-here`
- **Google Gemini**: `GOOGLE_API_KEY=your-gemini-key-here`

If both are set, Gemini is preferred by default. You can switch providers in the Settings tab.

See [GEMINI_INTEGRATION.md](./GEMINI_INTEGRATION.md) for more details.

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check the [Roadmap](./ROADMAP.md) for current status and upcoming features
- Review [Data Preservation](./DATA_PRESERVATION.md) for backup strategies
- See [Gemini Integration](./GEMINI_INTEGRATION.md) for LLM provider options

