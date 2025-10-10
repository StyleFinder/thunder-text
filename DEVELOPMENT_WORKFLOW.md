# Thunder Text Development Workflow

## Environment Setup

### URLs
- **Production**: https://thunder-text.onrender.com (main branch)
- **Staging**: https://thunder-text-staging.vercel.app (staging branch)
- **Development**: https://thunder-text-dev.vercel.app (feature branches)

### Shopify Apps
- **Production App**: Thunder Text (live customers)
- **Staging App**: Thunder Text Staging (final testing)
- **Development App**: Thunder Text Dev (active development)

## Development Workflow

### Starting New Work
```bash
# 1. Always start from staging
git checkout staging
git pull origin staging

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
# ... edit files ...
git add .
git commit -m "Description of changes"
git push origin feature/your-feature-name
```

### Testing Your Changes
1. **Development Testing**
   - URL: https://thunder-text-dev.vercel.app
   - Test with development Shopify app
   - Verify all features work

2. **Staging Testing**
   ```bash
   git checkout staging
   git merge feature/your-feature-name
   git push origin staging
   ```
   - URL: https://thunder-text-staging.vercel.app
   - Final testing before production

3. **Production Deployment**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
   - URL: https://thunder-text.onrender.com
   - Live for all customers

## Quick Test URLs

### Development Environment
```
https://thunder-text-dev.vercel.app/?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-dev.vercel.app/dashboard?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-dev.vercel.app/enhance?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-dev.vercel.app/settings?shop=zunosai-staging-test-store.myshopify.com
```

### Staging Environment
```
https://thunder-text-staging.vercel.app/?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-staging.vercel.app/dashboard?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-staging.vercel.app/enhance?shop=zunosai-staging-test-store.myshopify.com
https://thunder-text-staging.vercel.app/settings?shop=zunosai-staging-test-store.myshopify.com
```

## Emergency Procedures

### Rollback to Stable Version
```bash
# If something breaks in production
git checkout main
git reset --hard v1.0-stable
git push --force origin main
```

### Check Current Environment
```bash
git branch  # Shows current branch
git status  # Shows uncommitted changes
git log --oneline -5  # Recent commits
```

## Branch Protection Rules

### Main Branch (Production)
- Never commit directly
- Always merge from staging
- Requires testing confirmation

### Staging Branch
- Merge from feature branches
- Test thoroughly before promoting to main
- Reset from main if needed

### Feature Branches
- Create from staging
- Delete after merging
- Name clearly: feature/description

## Environment Variables Reference

### Production (main)
- Uses production Shopify app credentials
- Live OpenAI and Supabase keys
- Customer-facing

### Preview (staging & feature branches)
- Uses staging/dev Shopify app credentials
- Same OpenAI and Supabase keys (for now)
- Testing only

## Troubleshooting

### App Won't Install
1. Check Shopify app URLs match Vercel domains
2. Verify environment variables are set
3. Check OAuth callback URLs in app settings

### Changes Not Showing
1. Wait 1-2 minutes for Vercel deployment
2. Hard refresh browser (Cmd+Shift+R)
3. Check correct branch is deployed

### OAuth Errors
1. Verify SHOPIFY_APP_URL matches deployment
2. Check redirect URLs in Shopify app settings
3. Ensure API keys match environment

## Daily Workflow Example

```bash
# Morning: Start new feature
git checkout staging
git pull origin staging
git checkout -b feature/new-button-styles

# Work on feature
# ... make changes ...
git add .
git commit -m "Update button styles"
git push origin feature/new-button-styles

# Test on dev URL
# Open https://thunder-text-dev.vercel.app

# Ready for staging
git checkout staging
git merge feature/new-button-styles
git push origin staging

# Test on staging URL
# Open https://thunder-text-staging.vercel.app

# Approved for production
git checkout main
git merge staging
git push origin main

# Clean up
git branch -d feature/new-button-styles
```

## Important Notes

1. **Always test in development first**
2. **Never skip staging testing**
3. **Keep commits small and focused**
4. **Write clear commit messages**
5. **Delete feature branches after merging**
6. **Tag important releases**

## Support

- Vercel Dashboard: https://vercel.com/dashboard
- Shopify Partners: https://partners.shopify.com
- GitHub Repo: https://github.com/StyleFinder/thunder-text