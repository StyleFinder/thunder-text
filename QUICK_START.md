# Thunder Text - Quick Start Guide

## 🚀 Localhost Development (Recommended)

### Start Development Server

```bash
npm run dev
```

### Open in Browser

```
http://localhost:3050?shop=zunosai-staging-test-store&authenticated=true
```

**That's it!** Changes auto-reload in 1-2 seconds.

---

## 🔄 When to Use What

### Use Localhost (90% of the time)

- ✅ UI changes
- ✅ Component development
- ✅ API route testing
- ✅ Database operations
- ✅ AI generation testing
- **Speed:** 1-2 seconds per change

### Use Render (10% of the time)

- ⚠️ Final integration testing
- ⚠️ Pre-release validation
- ⚠️ Multi-store testing
- **Speed:** 3-5 minutes per change

---

## 📝 Common Commands

```bash
# Start dev server
npm run dev

# Start with ngrok (for Shopify OAuth)
# Terminal 1:
npm run dev

# Terminal 2:
npm run dev:ngrok

# Run tests
npm test

# Lint code
npm run lint

# Clear cache and restart
rm -rf .next && npm run dev
```

---

## 🐛 Quick Troubleshooting

### Changes not appearing?

```bash
rm -rf .next
npm run dev
```

### Database errors?

Check `.env.local` has correct Supabase URL and keys

### Shopify OAuth not working?

You need ngrok - see [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md) for full instructions

---

## 📚 Full Documentation

- **Detailed Setup:** [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md)
- **Production Guidelines:** [PRODUCTION_READY_GUIDELINES.md](PRODUCTION_READY_GUIDELINES.md)
- **Project Context:** [claude.md](claude.md)
