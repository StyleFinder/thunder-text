# Changelog

All notable changes to Thunder Text will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Versioning Standard (SemVer)

Thunder Text follows Semantic Versioning:

```
MAJOR.MINOR.PATCH

MAJOR - Breaking changes (API incompatibility)
MINOR - New features (backwards compatible)
PATCH - Bug fixes (backwards compatible)
```

**Pre-release versions**: `0.x.y` (current) - API may change without major version bump

---

## Release Format

Each release entry contains:

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Fixed**: Bug fixes
- **Deprecated**: Features to be removed in future
- **Removed**: Removed features
- **Security**: Security-related changes

---

## [Unreleased]

### Added

- Comprehensive documentation suite (ARCHITECTURE.md, CONTRIBUTING.md, etc.)

### Changed

- Updated API documentation to reflect standalone SaaS architecture

---

## [0.1.0] - 2025-12-05

### Added

#### Core Platform

- Initial Thunder Text platform release
- Next.js 15 with App Router architecture
- React 19 with Server Components
- Supabase PostgreSQL backend with pgvector extension
- Multi-tenant architecture with Row Level Security

#### Authentication

- Shopify OAuth integration for store connections
- Email/password authentication for standalone users
- NextAuth.js session management
- Account lockout protection (5 failed attempts)
- Two-factor authentication (TOTP) for admins

#### AI Features

- Product description generation with GPT-4
- GPT-4 Vision image analysis
- RAG-powered ad copy generation
- Brand voice extraction and modeling
- Content Center for multi-format content creation
- Variant scoring and A/B recommendations

#### Business Profile System

- 21-question interview onboarding
- Quick-start mode (7 questions)
- AI-generated master profile
- 6 document types (Market Research, ICA, Pain Points, Mission/Vision, Brand Positioning, AI Instructions)

#### Content Center

- Blog post generation
- Social media content (Facebook, Instagram, TikTok)
- Email marketing copy
- Product descriptions
- Store copy
- Word count and tone controls

#### AI Ad Engine (AIE)

- Platform-specific ad generation (Meta, Google, TikTok, Pinterest)
- Best practices RAG retrieval
- Ad example similarity search
- Multiple variant types (Emotional, Benefit, UGC, Social Proof)
- Ads Library for saving favorites

#### Integrations

- Shopify product import via GraphQL
- Facebook Ads integration
- Facebook campaign alerts
- Google OAuth (prepared)
- TikTok OAuth (prepared)

#### Seasonal Trends Engine

- Google Trends integration via SerpAPI
- Theme-based trend tracking
- Momentum signals (Rising, Stable, Waning)
- Seasonal profiles with 52-week curves

#### Admin Features

- Coach dashboard for BHB monitoring
- Store assignment system
- Super admin controls
- Usage metrics tracking

#### Security

- Input sanitization (XSS prevention)
- Path traversal protection
- HMAC webhook verification
- Encrypted token storage
- Comprehensive security audit

#### Documentation

- Product Requirements Document (PRD)
- API Documentation (127+ endpoints)
- Database Schema (40+ tables)
- Security Audit Report
- Deployment Guide

### Security

- bcrypt password hashing
- JWT session tokens with 7-day expiry
- Row Level Security on all tables
- CORS whitelist for allowed origins
- Content Security Policy headers

---

## Migration Notes

### From Pre-release to 0.1.0

No migration needed - this is the initial release.

### Database Migrations

Migrations are tracked in the `supabase_migrations` table:

| Version | Date       | Description                |
| ------- | ---------- | -------------------------- |
| 001     | 2025-09-27 | Initial schema             |
| 003     | 2025-09-27 | Shops table                |
| 018     | 2025-10-14 | Facebook Ads integration   |
| -       | 2025-10-16 | Content Creation Center    |
| -       | 2025-10-28 | Business Profile Interview |
| -       | 2025-11-03 | Seasonal Trends Engine     |
| -       | 2025-01-24 | Ads Library                |
| -       | 2025-01-25 | Multi-user Architecture    |

---

## Roadmap

### Planned for 0.2.0

- [ ] Google Ads integration
- [ ] TikTok Ads integration
- [ ] Bulk product processing
- [ ] Scheduled content publishing
- [ ] Performance analytics dashboard

### Planned for 0.3.0

- [ ] A/B testing integration
- [ ] Automated campaign optimization
- [ ] Multi-language support
- [ ] White-label options

---

## Links

- [Documentation](./README.md)
- [API Reference](./API_DOCUMENTATION.md)
- [Architecture](./ARCHITECTURE.md)
- [Contributing](./CONTRIBUTING.md)

---

_This changelog is maintained alongside the Thunder Text codebase._
