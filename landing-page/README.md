# AI Product Description Generator - Sales Landing Page

## Overview
Professional sales landing page for the Shopify Product Description Generator app, optimized for Namecheap hosting.

## Features
- Responsive design for all devices
- ROI calculator for demonstrating value
- Smooth animations and interactions
- SEO optimized
- Performance optimized for fast loading
- GDPR compliant cookie consent
- Testimonials and social proof
- Clear pricing tiers
- Call-to-action buttons throughout

## File Structure
```
landing-page/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # JavaScript interactions
├── .htaccess          # Apache configuration for Namecheap
├── dashboard-preview.png  # App screenshot (needs to be added)
└── README.md          # This file
```

## Deployment to Namecheap

### Step 1: Prepare Files
1. Add your app screenshot as `dashboard-preview.png`
2. Update all placeholder links in `index.html`:
   - Replace `https://apps.shopify.com/your-app` with your actual Shopify app URL
   - Replace `yourdomain.com` in meta tags with your actual domain
   - Update social media links in footer

### Step 2: Upload to Namecheap
1. Log in to your Namecheap account
2. Go to cPanel → File Manager
3. Navigate to `public_html` directory
4. Upload all files:
   - index.html
   - styles.css
   - script.js
   - .htaccess
   - dashboard-preview.png

### Step 3: Configure Domain
1. Ensure your domain points to Namecheap nameservers
2. SSL certificate should auto-provision (the .htaccess forces HTTPS)
3. Update the .htaccess file:
   - Replace `yourdomain.com` with your actual domain

### Step 4: Optimize Images
Before uploading, optimize all images:
- Use WebP format where possible
- Compress PNGs with TinyPNG
- Keep images under 200KB each
- Use appropriate dimensions (don't upload 4K images)

## Customization

### Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #008060;  /* Shopify green */
    --primary-dark: #004c3f;
    --primary-light: #00a47c;
    /* ... */
}
```

### Content
- Update testimonials with real customer reviews
- Add actual metrics and statistics
- Include real product screenshots
- Update pricing based on your model

### Analytics
Add your tracking codes in `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>

<!-- Facebook Pixel -->
<!-- Add your Facebook pixel code here -->
```

## Performance Tips
1. **Images**: Use lazy loading and appropriate formats
2. **Fonts**: Only load needed font weights
3. **CSS/JS**: Minify before production
4. **CDN**: Consider using Cloudflare for better performance
5. **Monitoring**: Use Google PageSpeed Insights to track performance

## SEO Checklist
- [ ] Update meta title and description
- [ ] Add Open Graph tags for social sharing
- [ ] Create and submit sitemap.xml
- [ ] Add robots.txt file
- [ ] Implement schema markup for better rich snippets
- [ ] Add canonical URL
- [ ] Optimize images with alt text

## Security
The `.htaccess` file includes:
- HTTPS enforcement
- Security headers
- Hotlink protection
- Directory browsing disabled

## Support
For questions about the landing page, refer to:
- Namecheap support for hosting issues
- The main app documentation for product features
- Google PageSpeed Insights for performance optimization

## License
This landing page is created specifically for the AI Product Description Generator Shopify app.