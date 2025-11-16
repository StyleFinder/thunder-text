# Troubleshooting Guide

Common issues and solutions for Thunder Text users.

## Common Issues

### Installation and Setup

#### Issue: "App won't install" or "Installation Error"

**Symptoms:**
- Error message during installation
- Installation page won't load
- Redirect loops after clicking "Install"

**Solutions:**
1. **Clear browser cache and cookies**
   - Try incognito/private browsing mode
   - Use a different browser

2. **Check Shopify permissions**
   - You must be the store owner or have app installation permissions
   - Contact your store owner to grant permissions

3. **Verify Shopify plan**
   - Ensure your Shopify subscription is active
   - Some features require specific Shopify plans

4. **Try again later**
   - Temporary Shopify API issues
   - Wait 15-30 minutes and retry

**Still stuck?** Email support@thundertext.com with:
- Your Shopify store URL
- Screenshot of the error message
- Time/date of the issue

---

#### Issue: "Thunder Text doesn't appear after installation"

**Solutions:**
1. **Refresh your Shopify admin**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Apps section**
   - Go to Shopify Admin → Apps
   - Look for "Thunder Text" in installed apps
   - Click to open

3. **Check installation status**
   - Apps → Thunder Text should show "Installed"
   - If status is "Pending," wait 2-3 minutes

4. **Reinstall the app**
   - Uninstall Thunder Text
   - Wait 5 minutes
   - Reinstall from App Store

---

### Generation Issues

#### Issue: "Generate button doesn't work" or "Nothing happens when I click Generate"

**Symptoms:**
- Button click has no effect
- Loading spinner doesn't appear
- No error message shown

**Solutions:**
1. **Check your internet connection**
   - Ensure stable connection
   - Try refreshing the page

2. **Disable browser extensions**
   - Ad blockers can interfere
   - Try in incognito mode

3. **Check usage limits**
   - Go to Settings → Billing
   - Verify you haven't hit your monthly limit
   - Upgrade plan if needed

4. **Check product requirements**
   - Product must have at least a title
   - Images help but aren't required

---

#### Issue: "Generation takes too long" or "Stuck on 'Generating...'"

**Symptoms:**
- Generation spinner for 60+ seconds
- No progress indication
- Page becomes unresponsive

**Solutions:**
1. **Wait patiently**
   - Normal: 5-15 seconds per product
   - Large images: Up to 30 seconds
   - Bulk generation: 1-2 minutes for 10 products

2. **Refresh if stuck >60 seconds**
   - Hard refresh the page
   - Check if description was generated (it may have completed)

3. **Reduce image size**
   - Large images (>5MB) slow generation
   - Optimize images before uploading to Shopify
   - Recommended: <2MB per image

4. **Try one product at a time**
   - If bulk generation fails, try individual products
   - May indicate API rate limiting

---

#### Issue: "Error: Generation Failed"

**Error Messages and Solutions:**

**"API Error: Rate limit exceeded"**
- Too many requests in short time
- Wait 1-2 minutes and try again
- Consider spreading bulk operations over time

**"Image processing failed"**
- Image may be corrupted or unsupported format
- Supported: JPG, PNG, WebP, GIF
- Try replacing the product image

**"Insufficient credits"**
- You've reached your monthly limit
- Upgrade your plan or wait for next billing cycle

**"Network error"**
- Check your internet connection
- Shopify API may be down - check status.shopify.com
- Try again in 5-10 minutes

**"Invalid product data"**
- Product may have missing required fields
- Ensure product has a title
- Check that product isn't deleted

---

### Content Quality Issues

#### Issue: "Description is inaccurate or doesn't match product"

**Why this happens:**
- AI misinterpreted product images
- Insufficient product information
- Complex or ambiguous visual elements

**Solutions:**
1. **Add more product context**
   - Fill out product tags
   - Add product type/category
   - Include vendor information
   - Add variant details

2. **Use better images**
   - Clear, well-lit photos
   - Multiple angles
   - Close-ups of features
   - Remove distracting backgrounds

3. **Regenerate with different settings**
   - Try different tone settings
   - Adjust length preferences
   - Change focus (features vs. benefits)

4. **Edit the description**
   - Use as a starting point
   - Fix inaccuracies manually
   - Keep what works, change what doesn't

---

#### Issue: "Description is too generic" or "Doesn't sound like my brand"

**Solutions:**
1. **Adjust tone settings**
   - Settings → Preferences → Tone
   - Try: Professional, Casual, Enthusiastic, Technical

2. **Add custom keywords**
   - Settings → SEO Keywords
   - Include brand-specific terms
   - Add technical vocabulary

3. **Provide more context**
   - Fill out all Shopify product fields
   - Add detailed product description to start from
   - Use consistent tags across products

4. **Edit after generation**
   - AI provides starting point
   - Customize to match your voice
   - Create templates for consistency

---

#### Issue: "Description contains made-up features or incorrect information"

**Why this happens:**
- AI "hallucination" - generating plausible but false details
- Misinterpretation of visual elements
- Over-enthusiastic descriptions

**Solutions:**
1. **ALWAYS review before publishing**
   - Never auto-publish AI content
   - Verify all claims and features
   - Check technical specifications

2. **Report inaccuracies**
   - Email support@thundertext.com with:
     - Product URL
     - Screenshot of inaccurate content
     - What should be correct
   - Helps improve AI model

3. **Provide reference materials**
   - Link to manufacturer specs
   - Add detailed product info in Shopify
   - Use vendor descriptions as reference

---

### Performance Issues

#### Issue: "App is slow" or "Pages take long to load"

**Solutions:**
1. **Check internet speed**
   - Minimum: 5 Mbps recommended
   - Test at speedtest.net

2. **Clear browser cache**
   - May have outdated cached files
   - Hard refresh (Ctrl+Shift+R)

3. **Reduce browser load**
   - Close unnecessary tabs
   - Disable heavy browser extensions
   - Try different browser

4. **Check system status**
   - Visit status.shopify.com
   - Check OpenAI status page
   - Server issues are usually temporary

---

#### Issue: "Bulk generation fails partway through"

**Symptoms:**
- Some products generated, others show error
- "X of Y completed" stuck
- Timeout errors

**Solutions:**
1. **Reduce batch size**
   - Instead of 50 products, try 10 at a time
   - Smaller batches more reliable

2. **Check failed products individually**
   - Note which products failed
   - Try generating them one-by-one
   - May have specific issues (bad images, etc.)

3. **Spread operations over time**
   - Don't rush bulk generation
   - 5-10 minute breaks between batches
   - Prevents API rate limiting

---

## Error Messages {#errors}

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Authentication failed | Reinstall app or check Shopify connection |
| 403 | Permission denied | Check app permissions in Shopify |
| 429 | Rate limit exceeded | Wait 2 minutes, then retry |
| 500 | Server error | Temporary issue, try again in 5-10 min |
| 503 | Service unavailable | Maintenance or outage, check back later |

---

## Account and Billing

#### Issue: "Can't access billing page" or "Payment failed"

**Solutions:**
1. **Update payment method in Shopify**
   - Shopify Admin → Settings → Billing
   - Update credit card information
   - Ensure card isn't expired

2. **Check Shopify subscription**
   - Ensure your Shopify plan is active
   - Unpaid Shopify bills affect app billing

3. **Contact Shopify Support**
   - Billing issues often on Shopify side
   - Shopify handles all app payments

---

#### Issue: "Upgraded plan but features not available"

**Solutions:**
1. **Wait 5-10 minutes**
   - Plan changes take time to propagate
   - Refresh the page

2. **Log out and back in**
   - Force session refresh
   - Clears cached permissions

3. **Check billing confirmation**
   - Verify charge in Shopify → Settings → Billing
   - Ensure payment went through

---

## Data and Privacy

#### Issue: "Want to delete all my data"

**How to delete:**
1. **Uninstall the app**
   - Shopify Admin → Apps → Thunder Text
   - Click "Delete"
   - Confirm deletion

2. **Automatic deletion**
   - Data deleted within 48 hours
   - GDPR-compliant automatic deletion
   - Audit log kept for 2 years (anonymous)

3. **Manual deletion request**
   - Email support@thundertext.com
   - Subject: "GDPR Data Deletion Request"
   - Include your shop domain

**What gets deleted:**
- All generated descriptions (in Thunder Text only)
- User preferences and settings
- Usage analytics
- OAuth tokens

**What stays:**
- Published descriptions in Shopify (you own these)
- Billing records (legal requirement - 7 years)

---

## Still Need Help? {#support}

### Before Contacting Support

Please gather:
- [ ] Your Shopify store URL
- [ ] Screenshots of the issue
- [ ] Error messages (exact text)
- [ ] Steps to reproduce
- [ ] Browser and version
- [ ] What you've tried already

### Contact Methods

**📧 Email Support**
- support@thundertext.com
- Response within 24 hours (business days)
- Detailed issues: Attach screenshots

**🚨 Urgent Issues**
- Email subject: "URGENT - [brief description]"
- For: Service outages, data loss, security concerns
- Response within 4 hours (business hours)

**💡 Feature Requests**
- Email: support@thundertext.com
- Subject: "Feature Request - [description]"
- Include use case and benefit

### What to Expect

1. **Confirmation Email**
   - Within 2 hours
   - Ticket number assigned

2. **Initial Response**
   - Within 24 hours (business days)
   - May ask for additional information

3. **Resolution**
   - Simple issues: Same day
   - Complex issues: 2-5 business days
   - Updates provided every 48 hours

---

## Additional Resources

- 📚 [Help Center](README.md)
- 🚀 [Getting Started Guide](getting-started.md)
- ❓ [FAQ](faq.md)
- 🔒 [Privacy Policy](../../PRIVACY_POLICY.md)
- 📜 [Terms of Service](../../TERMS_OF_SERVICE.md)

**Last Updated**: November 16, 2025
