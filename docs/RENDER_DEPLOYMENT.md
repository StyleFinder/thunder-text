# Thunder Text - Render Deployment Guide

This guide covers deploying Thunder Text to Render for production use.

## Why Render?

- **Full-stack deployment** - Single platform for Next.js apps
- **Auto-scaling** - Automatic scaling based on traffic
- **Zero-config deployments** - Git-based deployments
- **Built-in SSL** - HTTPS by default
- **Cost-effective** - Competitive pricing for Shopify apps
- **Node.js optimized** - Perfect for Next.js applications

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Thunder Text code pushed to GitHub
3. **Environment Variables**: All required API keys and secrets ready

## Deployment Steps

### 1. Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the Thunder Text repository

### 2. Service Configuration

**Basic Settings:**
```
Name: thunder-text
Environment: Node
Region: Oregon (or closest to your users)
Branch: main (or your production branch)
```

**Build & Deploy:**
```
Build Command: npm install && npm run build
Start Command: npm start
```

### 3. Environment Variables

Configure the following environment variables in Render dashboard:

```bash
# Production Environment
NODE_ENV=production

# Shopify Configuration  
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_product_listings,write_product_listings
SHOPIFY_APP_URL=https://your-app.onrender.com
SHOPIFY_TEST_STORE=zunosai-staging-test-store

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_KEY=your_production_supabase_service_key

# OpenAI Configuration (Master Key)
OPENAI_API_KEY=your_openai_api_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_32_character_random_string
NEXTAUTH_URL=https://your-app.onrender.com
```

### 4. Advanced Settings

**Health Check:**
```
Health Check Path: /api/health
```

**Auto-Deploy:**
```
Auto-Deploy: Yes (enabled for main branch)
```

**Build Optimization:**
```
Node Version: 18.x (specify in package.json engines field)
```

### 5. Custom Domain (Optional)

1. Purchase domain from your preferred registrar
2. In Render dashboard, go to your service → Settings
3. Add custom domain: `your-domain.com`
4. Update DNS records as instructed by Render
5. SSL certificate will be automatically provisioned

## Testing Deployment

### 1. Health Check Verification

```bash
curl https://your-app.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Thunder Text API",
  "version": "1.0.0"
}
```

### 2. OAuth Flow Testing

1. Navigate to your Render app URL
2. Test Shopify OAuth connection
3. Verify redirect to dashboard after authentication
4. Test with development store: `zunosai-staging-test-store.myshopify.com`

### 3. AI Generation Testing

1. Upload test product images
2. Generate descriptions
3. Verify OpenAI API integration
4. Test publishing to Shopify store
5. Validate metafield creation

## Shopify Partner Configuration

Update your Shopify Partner app settings with Render URLs:

```
App URL: https://your-app.onrender.com
Allowed redirection URLs: 
  - https://your-app.onrender.com/api/auth/callback/shopify  
  - https://your-app.onrender.com/dashboard

Webhooks (if applicable):
  - https://your-app.onrender.com/api/webhooks

GDPR Webhooks:
  - Customer data request: https://your-app.onrender.com/api/webhooks/gdpr/customers/data_request
  - Customer redact: https://your-app.onrender.com/api/webhooks/gdpr/customers/redact  
  - Shop redact: https://your-app.onrender.com/api/webhooks/gdpr/shop/redact
```

## Monitoring & Maintenance

### 1. Render Monitoring

**Built-in Metrics:**
- Response time monitoring
- Error rate tracking  
- Resource usage (CPU, memory)
- Request volume and patterns

**Log Access:**
```bash
# View live logs in Render dashboard
# Or use Render CLI for log streaming
render logs -f your-service-name
```

### 2. Application Monitoring

**Health Monitoring:**
```javascript
// Set up monitoring service (optional)
// Uptime monitoring via external service
// Performance monitoring with alerts
```

**Key Metrics to Track:**
- API response times
- OpenAI API usage and costs
- Shopify webhook delivery success
- User authentication success rates
- Database connection health

### 3. Scaling Configuration

**Auto-scaling Settings:**
```yaml
# In render.yaml (optional)
scaling:
  minInstances: 1      # Always keep 1 instance running
  maxInstances: 10     # Scale up to 10 instances under load
  cpuThreshold: 80     # Scale when CPU > 80%
  memoryThreshold: 80  # Scale when memory > 80%
```

## Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check build logs in Render dashboard
# Verify Node.js version compatibility
# Ensure all dependencies are in package.json
```

**2. Environment Variable Issues**
```bash
# Verify all required variables are set
# Check for typos in variable names
# Ensure sensitive values are properly escaped
```

**3. OAuth Redirect Issues**
```bash
# Verify SHOPIFY_APP_URL matches Render service URL
# Check Shopify Partner dashboard redirect URLs
# Ensure NEXTAUTH_URL is set correctly
```

**4. Database Connection Issues**
```bash
# Verify Supabase connection strings
# Check Row Level Security policies
# Test database connectivity from Render
```

### Performance Optimization

**1. Cold Start Mitigation**
```javascript
// Keep at least 1 instance running (paid plans)
// Implement proper health checks
// Use Render's always-on feature
```

**2. Build Optimization**
```json
// package.json engines specification
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

**3. Caching Strategy**
```javascript
// Implement proper Next.js caching
// Use Supabase caching for repeated queries
// Cache OpenAI responses when appropriate
```

## Security Best Practices

### 1. Environment Variable Security
- Use Render's encrypted environment variables
- Never commit secrets to version control
- Regularly rotate API keys and secrets
- Use different keys for staging vs production

### 2. Network Security
- Render provides HTTPS by default
- Enable HSTS headers in Next.js config
- Implement proper CORS policies
- Use secure cookie settings

### 3. Application Security
- Keep dependencies updated
- Run security audits regularly: `npm audit`
- Implement proper input validation
- Use Supabase RLS for data protection

## Cost Management

### Render Pricing Tiers

**Starter Plan ($7/month):**
- 1 service
- 512 MB RAM
- Suitable for development/testing

**Standard Plan ($25/month):**
- Multiple services
- 2 GB RAM
- Custom domains
- Recommended for production

**Pro Plan ($85/month):**
- Advanced features
- Priority support
- Enhanced performance
- Recommended for high-traffic apps

### Cost Optimization Tips

1. **Right-size your instances** based on actual usage
2. **Use auto-scaling** to handle traffic spikes efficiently
3. **Monitor resource usage** regularly
4. **Optimize build times** to reduce build costs
5. **Implement caching** to reduce API calls and processing

## Support Resources

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Community Forum**: [community.render.com](https://community.render.com)
- **Support**: Available through dashboard for paid plans
- **Status Page**: [status.render.com](https://status.render.com)

---

## Quick Deployment Checklist

- [ ] Render account created and GitHub connected
- [ ] Repository pushed to GitHub with latest code
- [ ] Environment variables configured in Render
- [ ] Service deployed and health check passing
- [ ] Custom domain configured (if applicable)
- [ ] Shopify Partner app URLs updated
- [ ] OAuth flow tested with development store
- [ ] AI generation workflow tested end-to-end
- [ ] Monitoring and alerting configured
- [ ] Documentation updated with production URLs

Your Thunder Text app is now ready for production on Render! 🚀