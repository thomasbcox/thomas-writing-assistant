# Testing the App with Real Data

**Last Updated**: 2025-12-18

## Quick Start: Process Existing PDFs (Recommended)

You already have 4 PDFs in `input/pdfs/`:
- `Enforcing Policy Compliance.pdf`
- `The Performance Triplet Method v3 - Handout.pdf`
- `The PRoPeLS Pattern.pdf`
- `v4d14 - Mental Models for Best Bosses v4 DRAFT14.pdf`

### Steps:

1. **Go to the Input Tab** in the UI
2. **Upload a PDF** (start with the smallest/simplest one)
3. **Review extracted text** - The system will extract text automatically
4. **Click "Generate Concepts"** - AI will propose concept candidates
5. **Review and approve candidates** - Select which ones to add to your knowledge base
6. **Repeat** with other PDFs

**Time estimate**: 5-10 minutes per PDF (depending on size and AI processing time)

---

## Alternative Approaches

### Option 1: Manual Concept Creation (Fastest for Testing)

**Best for**: Quick testing of UI, links, and basic functionality

1. **Go to Concepts Tab**
2. **Click "Show Form"** under "Create New Concept"
3. **Create 3-5 concepts manually**:
   - Title: "Servant Leadership"
   - Description: "Leadership approach focused on serving others"
   - Content: "Servant leadership is a philosophy where leaders prioritize the needs of their team members..."
   - Creator: "Your Name"
   - Source: "BestBoss.biz"
   - Year: "2024"
4. **Test linking**: Go to Links tab and connect concepts
5. **Test AI features**: Use "Propose Links" to get AI suggestions

**Time estimate**: 2-3 minutes per concept

---

### Option 2: Text Input (Good for Testing AI Generation)

**Best for**: Testing AI concept generation without PDF processing

1. **Go to Input Tab**
2. **Paste a paragraph or two** of text (from a blog post, article, etc.)
3. **Set options**:
   - Max candidates: 3-5 (start small)
   - Default creator/source/year (optional)
4. **Click "Generate Concepts"**
5. **Review and approve candidates**

**Time estimate**: 1-2 minutes per batch

---

### Option 3: Process All PDFs (Most Comprehensive)

**Best for**: Populating the knowledge base with real content

1. **Start with smallest PDF** (likely "The PRoPeLS Pattern.pdf")
2. **Process each PDF** in order of size/complexity
3. **After each PDF**:
   - Review generated concepts
   - Approve good ones
   - Use "Propose Links" to connect concepts
4. **Build up your knowledge base** incrementally

**Time estimate**: 30-60 minutes total for all 4 PDFs

---

## Recommended Testing Workflow

### Phase 1: Quick Smoke Test (5 minutes)
1. Create 2-3 concepts manually
2. Create 1-2 links between them
3. Verify dashboard shows correct counts
4. Test concept editing and viewing

### Phase 2: AI Features Test (10-15 minutes)
1. Process 1 PDF (start with smallest)
2. Review AI-generated concepts
3. Use "Propose Links" to get AI link suggestions
4. Test concept enrichment (if available)

### Phase 3: Full Workflow Test (20-30 minutes)
1. Process remaining PDFs
2. Build a network of linked concepts
3. Create a capsule with anchors
4. Test blog post generation (if implemented)
5. Verify all features work end-to-end

---

## What to Test

### Core Functionality
- ✅ Concept creation (manual and AI-generated)
- ✅ Concept editing and viewing
- ✅ Concept search and filtering
- ✅ Link creation (manual and AI-proposed)
- ✅ Dashboard statistics
- ✅ Health status monitoring

### AI Features
- ✅ PDF text extraction
- ✅ AI concept generation from text
- ✅ AI link proposals
- ✅ Concept enrichment (if available)

### Advanced Features
- ✅ Capsule creation
- ✅ Anchor posts
- ✅ Repurposed content generation
- ✅ Blog post generation

---

## Tips for Best Results

1. **Start small**: Process one PDF or create a few concepts first
2. **Review AI output**: Don't blindly accept all AI suggestions
3. **Add metadata**: Include creator, source, and year for better tracking
4. **Link concepts**: Build connections to test the knowledge graph
5. **Use real content**: Your existing PDFs are perfect for realistic testing

---

## Troubleshooting

### AI Generation Takes Too Long
- Reduce `maxCandidates` (try 3 instead of 5)
- Split large PDFs into smaller sections
- Check AI settings (provider, model, temperature)

### Concepts Not Appearing
- Check browser console for errors
- Verify database connection (health status)
- Refresh the page

### PDF Processing Fails
- Check file size (very large PDFs may timeout)
- Verify PDF is not password-protected
- Try a different PDF

---

## Next Steps After Testing

Once you have data:
1. **Explore the knowledge graph** - See how concepts connect
2. **Test search** - Find concepts by title or description
3. **Create capsules** - Build content around your concepts
4. **Generate content** - Use blog post generation with your concepts
5. **Refine** - Edit concepts, add more links, enrich with AI

---

## Your Current PDFs

Located in: `input/pdfs/`

1. **Enforcing Policy Compliance.pdf**
2. **The Performance Triplet Method v3 - Handout.pdf**
3. **The PRoPeLS Pattern.pdf**
4. **v4d14 - Mental Models for Best Bosses v4 DRAFT14.pdf**

Start with the smallest/simplest one to get familiar with the workflow!
