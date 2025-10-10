# Thunder Text - SuperClaude Development Framework

## Project Overview
Thunder Text is an AI-powered Shopify application that generates SEO-optimized product descriptions from images using GPT-4 Vision API. This configuration optimizes SuperClaude for efficient development across all project phases.

### Development Environment
- **Production URL**: https://thunder-text.onrender.com
- **Dev Shop**: zunosai-staging-test-store
- **Settings URL**: https://thunder-text.onrender.com/settings?shop=zunosai-staging-test-store&authenticated=true
- **Deployment**: Render (production hosting), not localhost
- **Authentication**: PRODUCTION-READY - NO AUTH BYPASS
  - ⚠️ NEVER use SHOPIFY_AUTH_BYPASS in production
  - ✅ Always use proper Token Exchange with JWT verification
  - ✅ Follow Shopify's official OAuth and Token Exchange documentation

## SuperClaude Framework Integration

### Core Framework Components
@FLAGS.md - Behavioral flags for execution modes and tool selection
@PRINCIPLES.md - Software engineering principles and decision framework
@RULES.md - Actionable development rules and quality standards
@MODE_Task_Management.md - Hierarchical task organization with persistent memory
@MODE_Token_Efficiency.md - Symbol-enhanced communication for complex operations

## Project-Specific Configurations

### Default Flags for Thunder Text Development

**--shopify** - Enable Shopify-specific development patterns
- Trigger: OAuth flows, webhook handling, metafield operations, Polaris UI components
- Behavior: Use Shopify MCP server, follow Partner Program guidelines, Shopify API best practices

**--c7** - Enable Context7 for documentation lookup
- Trigger: Supabase, Next.js, React, OpenAI API integration
- Behavior: Access official docs, pattern guidance, best practices

**--task-manage** - Enable hierarchical task management
- Trigger: Multi-phase development, complex integrations, bulk processing features
- Behavior: Use memory system, TodoWrite coordination, progress tracking

**--orchestrate** - Optimize tool selection for Shopify development
- Trigger: Multi-tool operations, API integrations, performance constraints
- Behavior: Smart routing to specialized agents, parallel execution optimization

### Phase-Specific Flag Patterns

#### Phase 1: MVP Development (--mvp-mode)
```
--shopify --c7 --task-manage --safe-mode
```
- Focus: Stability, OAuth implementation, basic AI integration
- Priority: Security, Shopify compliance, clean architecture

#### Phase 2: Bulk Processing (--scale-mode)
```  
--orchestrate --task-manage --think-hard --performance
```
- Focus: Queue management, bulk operations, performance optimization
- Priority: Scalability, error handling, monitoring

#### Phase 3: Enterprise Features (--enterprise-mode)
```
--delegate --think-hard --all-mcp --validate --loop
```
- Focus: Multi-store management, APIs, team collaboration
- Priority: Architecture quality, documentation, enterprise patterns

#### Phase 4: Innovation (--innovation-mode)
```
--ultrathink --all-mcp --brainstorm --loop
```
- Focus: Advanced AI features, multi-platform expansion
- Priority: Innovation, strategic architecture, competitive advantage

## Variable and Concept Consistency Protocol

### The Duplication Problem
**Core Issue**: Claude may create new variables, types, or table names without understanding that equivalent concepts already exist in the codebase, leading to confusion like the `shops` vs `stores` incident.

**Impact**: Hours of debugging, authentication failures, data lookup errors, foreign key inconsistencies, and architectural confusion.

### Mandatory Pre-Creation Checklist

**BEFORE creating ANY new variable, type, table, function, or concept, Claude MUST:**

#### 1. Search for Existing Patterns
```bash
# Search for similar variable names
grep -r "shop" --include="*.ts" --include="*.tsx" --include="*.sql"
grep -r "store" --include="*.ts" --include="*.tsx" --include="*.sql"

# Search for similar type definitions
grep -r "type.*Shop" --include="*.ts"
grep -r "interface.*Shop" --include="*.ts"

# Search database schema for similar tables
grep -r "CREATE TABLE" supabase/migrations/
```

#### 2. Ask Clarifying Questions
**When in doubt, ALWAYS ask:**
- "I see you have `shops` table. Should I use that, or do you need a separate `stores` concept?"
- "I found `ShopData` type. Should I use that or create `StoreData`?"
- "There's a `getShopById` function. Should I create `getStoreById` or use the existing one?"

#### 3. Show Comparison Before Creating
**Present this analysis BEFORE creating anything new:**

```markdown
## Proposed New Concept Analysis

**New item**: `stores` table
**Similar existing**: `shops` table

### Comparison:
| Aspect | shops (existing) | stores (proposed) |
|--------|------------------|-------------------|
| Purpose | Shopify installations | [unclear - same?] |
| Columns | id, shop_domain, token | id, name, settings |
| Usage | OAuth, authentication | [unclear] |

### Questions:
1. Are these genuinely different concepts?
2. Can `shops` be extended instead?
3. What's the long-term distinction?

**Recommendation**: Clarify purpose before creating to avoid duplication.
```

#### 4. Maintain Active Glossary
**Create and UPDATE `/docs/GLOSSARY.md` for every new concept:**

```markdown
# Thunder Text Glossary

## Core Concepts

### shop (noun) - Table: `shops`
**Definition**: A Shopify store installation that has installed Thunder Text
**Database**: shops table (id, shop_domain, access_token, scope, plan, settings)
**Code references**: getShopById(), ShopData type, shop_id foreign keys
**Why this name**: Matches Shopify's terminology for merchant stores
**DO NOT confuse with**: ~~stores~~ (DEPRECATED - use "shop" instead)

### system_prompt (noun) - Table: `system_prompts`
**Definition**: Master AI instructions defining ThunderText's behavior
**Database**: system_prompts table (id, name, content, is_default, store_id)
**Code references**: getSystemPrompt(), SystemPrompt type
**Why this name**: Distinguishes from category-specific templates
**DO NOT confuse with**: category_templates (category-specific guidance)

### category_template (noun) - Table: `category_templates`
**Definition**: Category-specific product description templates
**Database**: category_templates table (id, name, category, content, is_default, store_id)
**Code references**: getCategoryTemplate(), CategoryTemplate type
**Why this name**: Applies to specific product categories
**Related to**: system_prompts (used together for AI generation)
```

#### 5. Naming Convention Rules

**Database Tables:**
- ✅ Singular nouns: `shop`, `product`, `user` (not shops, products, users)
- ✅ One concept = one table (no `shop` AND `store` for same thing)
- ❌ Never create table if similar concept exists

**TypeScript Types:**
- ✅ Match table names: `Shop`, `Product`, `User`
- ✅ Descriptive suffixes: `ShopData`, `ShopWithToken`, `ShopCredentials`
- ❌ Never create `StoreData` when `ShopData` exists

**Function Names:**
- ✅ Consistent prefixes: `getShop()`, `createShop()`, `updateShop()`
- ✅ Same root word: All shop-related functions use "shop" not "store"
- ❌ Never mix: `getShop()` with `updateStore()`

**Foreign Keys:**
- ✅ Always `{table_name}_id`: `shop_id`, `product_id`, `user_id`
- ✅ Consistent across all tables
- ❌ Never mix: `shop_id` in one table, `store_id` in another

### Detection and Prevention Tools

#### Automated Consistency Checks
**Add to package.json scripts:**
```json
{
  "scripts": {
    "check:consistency": "node scripts/check-naming-consistency.js",
    "check:glossary": "node scripts/validate-glossary.js",
    "pre-commit": "npm run check:consistency"
  }
}
```

#### Consistency Check Script
**Create `/scripts/check-naming-consistency.js`:**
```javascript
// Detects potential naming conflicts like shops vs stores
const concepts = {
  'shop': ['shops', 'store', 'stores'],
  'user': ['users', 'account', 'accounts'],
  'product': ['products', 'item', 'items']
}

// Searches codebase for mixed usage and reports conflicts
```

#### Git Pre-Commit Hook
**Prevent inconsistent naming from being committed:**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for glossary updates when new tables/types added
if git diff --cached --name-only | grep -q "migrations\|types"; then
  if ! git diff --cached --name-only | grep -q "GLOSSARY.md"; then
    echo "⚠️  New table/type detected. Did you update GLOSSARY.md?"
    exit 1
  fi
fi
```

### Real-World Example: shops vs stores

**What went wrong:**
1. Created `shops` table for Shopify OAuth credentials
2. Later created `stores` table for billing/subscription data
3. Code used both interchangeably
4. Foreign keys split between both tables
5. `getStoreId()` queried empty `stores` table
6. Hours of debugging to consolidate back to `shops`

**What should have happened:**
1. Before creating `stores`, search for "shop"
2. Find `shops` table exists
3. Ask: "Should I extend `shops` or create separate `stores`?"
4. Show comparison of both concepts
5. User clarifies: "Just add columns to `shops`"
6. No confusion, no debugging

### Claude's Mandatory Protocol

**Every time Claude considers creating something new:**

```markdown
1. 🔍 SEARCH for similar concepts (grep, database query)
2. ❓ ASK if genuinely different from existing patterns
3. 📊 SHOW comparison analysis before creating
4. 📝 UPDATE GLOSSARY.md with new concept definition
5. ✅ VERIFY naming consistency with existing codebase
```

**If Claude skips this protocol:**
- User should immediately stop and ask for analysis
- Review what similar concepts exist
- Decide: extend existing vs create new

### Documentation Requirements

**For every new concept, create:**
1. **Glossary entry** - Definition, purpose, database/code references
2. **Schema documentation** - Why this table/type exists, what it stores
3. **Comparison notes** - How it differs from similar concepts
4. **Migration notes** - Why this change was made (in migration file)

### Success Metrics

✅ **Good state:**
- All shop-related code uses "shop" consistently
- GLOSSARY.md defines every major concept
- No orphaned tables or unused types
- Foreign keys follow consistent naming
- Developers understand purpose of each table

❌ **Bad state:**
- Mixed usage of "shop" and "store" for same concept
- Undocumented tables with unclear purpose
- Foreign keys with inconsistent naming
- Hours spent debugging variable confusion

---

## Development Patterns

### Shopify Integration Patterns
- **OAuth Flow**: Secure token management, proper scope handling
- **Webhook Processing**: Signature verification, idempotent operations  
- **API Rate Limiting**: Intelligent queuing, exponential backoff
- **Metafield Management**: Google Shopping compliance, structured data
- **Polaris UI**: Native Shopify admin experience, accessibility compliance

### AI Integration Patterns
- **Master Key Management**: Centralized OpenAI API key, usage tracking
- **Image Processing**: Temporary storage, automatic cleanup
- **Content Generation**: Template systems, brand voice consistency
- **Quality Control**: Validation pipelines, approval workflows
- **Cost Optimization**: Batching, caching, intelligent retry logic

### Supabase Architecture Patterns
- **Row Level Security**: Multi-tenant data isolation
- **Edge Functions**: Serverless AI processing, webhook handling
- **Real-time Subscriptions**: Live progress updates, notifications
- **Storage Management**: Image upload, processing, cleanup
- **Analytics Integration**: Usage tracking, performance monitoring

## Task Templates

### Feature Development Template
1. **Analysis Phase** - Understand requirements, existing patterns
2. **Design Phase** - API design, UI mockups, data modeling  
3. **Implementation Phase** - Core logic, UI components, tests
4. **Integration Phase** - Shopify APIs, external services
5. **Validation Phase** - Testing, performance, security review

### Bug Investigation Template
1. **Reproduction** - Consistent reproduction steps
2. **Root Cause Analysis** - Systematic debugging approach
3. **Impact Assessment** - User impact, business risk evaluation
4. **Fix Implementation** - Minimal, targeted solution
5. **Prevention** - Tests, monitoring, documentation updates

### Performance Optimization Template  
1. **Measurement** - Baseline metrics, bottleneck identification
2. **Analysis** - Performance profiling, resource utilization
3. **Optimization** - Targeted improvements, caching strategies
4. **Validation** - Performance testing, metric comparison
5. **Monitoring** - Ongoing performance tracking, alerting

## Quality Gates

### Code Quality Standards
- **Test Coverage**: 90%+ for business logic, 100% for API endpoints
- **Performance**: <30s AI processing, <2s page loads, 99.9% uptime
- **Security**: OWASP compliance, Shopify security guidelines
- **Accessibility**: WCAG 2.1 AA compliance, screen reader support
- **Documentation**: API docs, user guides, developer onboarding

### Review Checklists
- [ ] Shopify Partner Program compliance
- [ ] GDPR and privacy compliance  
- [ ] Performance benchmarks met
- [ ] Security scan passed (no high/critical issues)
- [ ] Accessibility testing completed
- [ ] Error handling and edge cases covered
- [ ] Monitoring and alerting configured

## Memory Management

### Project Memory Keys
- `thunder_text_context` - Core project information and architecture
- `development_phases` - Phase-specific requirements and patterns
- `shopify_integration` - OAuth flows, API patterns, webhook handling
- `ai_processing` - GPT-4 Vision integration, cost optimization
- `supabase_architecture` - Database schema, RLS policies, Edge Functions
- `performance_benchmarks` - SLA targets, optimization strategies

### Session Management
- **Session Start**: `list_memories()` → Resume project context
- **Checkpoint**: Save progress every 30 minutes during development
- **Phase Transitions**: Update memory with new requirements, lessons learned
- **Session End**: Store outcomes, next steps, blockers for future sessions

## Server Management Rules

### Render Deployment Protocol
**Thunder Text is deployed on Render, not local development servers**

#### Deployment Environment Setup
1. **Production Environment**: https://thunder-text.onrender.com
2. **Auto-deployment**: Render deploys automatically from git commits
3. **Local development**: Use `npm run dev` on port 3050 for local testing
4. **Environment Variables**: Configured in Render dashboard
5. **Testing**: Use production URL with development store

#### Render vs Local Development
- **Current Setup**: Render-hosted production environment
- **Local development**: Available on localhost:3050 (turbopack enabled)
- **Instant deployment**: Code changes deploy automatically via git to Render
- **Environment isolation**: Production URLs with development data
- **Solution**: Use Render URLs for production testing, localhost for rapid iteration

#### Server Coordination Questions
- "Do you have `shopify app dev` running? If not, should I start it?"
- "Is there an active development server for this task?"
- "Should I start [specific server] or do you prefer to manage it?"
- "I see servers running - are these the ones we should use?"

#### Server Management Approach
- **Collaborative**: Ask before starting, respect user preference
- **Conflict-Aware**: Prevent duplicate instances that cause URL issues
- **Task-Oriented**: Start servers only when needed for specific tasks
- **Transparent**: Always show server status and explain server needs

#### Quick Commands for Server Management
```bash
# Quick status check (for Claude automation)
./status.sh

# Detailed server status (for user review)
./check-servers.sh

# Quick restart (only if no user terminals)
./restart-dev.sh

# Kill only Claude's background servers
pkill -f "shopify app dev" 2>/dev/null
```

#### Claude Automation Rules
- **ALWAYS run `./status.sh` before starting any servers**
- **Exit code 0**: Safe to proceed with server operations
- **Exit code 1**: Server conflict detected - inform user, do NOT start servers
- **When in doubt**: Show status and ask user for guidance

## Development Workflow

### Daily Development Pattern
1. **Server Status Check** - Run `./check-servers.sh` before any operations
2. **Context Loading** - Review project memories, current phase status
3. **Task Planning** - Use TodoWrite for session organization
4. **Implementation** - Follow phase-specific patterns and quality gates
5. **Progress Tracking** - Update memories, mark todos complete
6. **Quality Validation** - Run tests, performance checks, security scans
7. **Session Summary** - Store outcomes, blockers, next priorities

### Cross-Session Continuity
- Maintain development context through memory system
- Track architectural decisions and technical debt
- Preserve learning and optimization insights
- Ensure smooth handoffs between development sessions

## Integration Commands

### Quick Setup Commands
```bash
# Initialize Thunder Text development session
/sc:load thunder_text_context

# Start MVP phase development  
--mvp-mode --shopify --c7 --task-manage

# Switch to bulk processing phase
--scale-mode --orchestrate --performance

# Enter enterprise development mode
--enterprise-mode --delegate --think-hard --all-mcp
```

### Common Development Workflows
- `/shopify-oauth` - Shopify OAuth setup and testing
- `/ai-integration` - GPT-4 Vision API integration
- `/bulk-processing` - Queue management and batch operations  
- `/performance-optimization` - Speed and scalability improvements
- `/quality-review` - Comprehensive code and security review

### Development URLs (zunosai-staging-test-store)
```bash
# Main pages with authentication parameters (Render-hosted)
https://thunder-text.onrender.com/?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/dashboard?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/settings?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/create?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/products?shop=zunosai-staging-test-store&authenticated=true
```

This configuration enables SuperClaude to provide optimal development support for Thunder Text across all phases, with intelligent tool selection, persistent context management, and phase-appropriate development patterns.