# Thunder Text - SuperClaude Development Framework

## Project Overview
Thunder Text is an AI-powered Shopify application that generates SEO-optimized product descriptions from images using GPT-4 Vision API. This configuration optimizes SuperClaude for efficient development across all project phases.

### Development Environment
- **Production URL**: https://thunder-text-nine.vercel.app
- **Dev Shop**: zunosai-staging-test-store
- **Settings URL**: https://thunder-text-nine.vercel.app/settings?shop=zunosai-staging-test-store&authenticated=true
- **Deployment**: Vercel (production hosting), not localhost
- **Auth Bypass**: Enabled in development (SHOPIFY_AUTH_BYPASS=true)

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

### Vercel Deployment Protocol
**Thunder Text is deployed on Vercel, not local development servers**

#### Deployment Environment Setup
1. **Production Environment**: https://thunder-text-nine.vercel.app
2. **Auto-deployment**: Vercel deploys automatically from git commits
3. **No local servers needed**: All development happens in production environment
4. **Environment Variables**: Configured in Vercel dashboard, not local .env
5. **Testing**: Use production URL with development store

#### Vercel vs Local Development
- **Current Setup**: Vercel-hosted production environment for development
- **No localhost**: No need for local servers (npm run dev not used)
- **Instant deployment**: Code changes deploy automatically via git
- **Environment isolation**: Production URLs with development data
- **Solution**: Use Vercel URLs for all development and testing

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
# Main pages with authentication parameters (Vercel-hosted)
https://thunder-text-nine.vercel.app/?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text-nine.vercel.app/dashboard?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text-nine.vercel.app/settings?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text-nine.vercel.app/create?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text-nine.vercel.app/products?shop=zunosai-staging-test-store&authenticated=true
```

This configuration enables SuperClaude to provide optimal development support for Thunder Text across all phases, with intelligent tool selection, persistent context management, and phase-appropriate development patterns.