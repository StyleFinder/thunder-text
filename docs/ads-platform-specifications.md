# Advertising Platform Technical Specifications Guide

**Last Updated:** December 2025
**Purpose:** Technical reference for ad creative requirements across major platforms

---

## Table of Contents

1. [Facebook/Meta Ads](#facebookmeta-ads)
2. [Google Ads](#google-ads)
3. [Pinterest Ads](#pinterest-ads)
4. [TikTok Ads](#tiktok-ads)
5. [Quick Reference Chart](#quick-reference-chart)

---

## Facebook/Meta Ads

### Image Specifications

| Specification        | Requirement                               |
| -------------------- | ----------------------------------------- |
| **Recommended Size** | 1080 × 1080 px (square)                   |
| **Landscape Size**   | 1200 × 628 px (1.91:1 ratio)              |
| **Minimum Size**     | 600 × 600 px (square), 600 × 750 px (4:5) |
| **Aspect Ratios**    | 1:1 (square), 4:5 (vertical) recommended  |
| **File Formats**     | JPG, PNG                                  |
| **Max File Size**    | 30 MB                                     |

### Video Specifications

| Specification        | Requirement                           |
| -------------------- | ------------------------------------- |
| **Recommended Size** | 1080 × 1080 px or higher              |
| **Minimum Size**     | 120 × 120 px                          |
| **Aspect Ratios**    | 1:1 (square), 4:5 (vertical) for Feed |
| **File Formats**     | MP4, MOV (recommended), GIF           |
| **Max File Size**    | 4 GB                                  |
| **Duration**         | 1 second to 240 minutes               |
| **Compression**      | H.264 video, AAC audio                |

### Character Limits

| Element              | Character Limit                                |
| -------------------- | ---------------------------------------------- |
| **Primary Text**     | ~125 characters (truncates with "...see more") |
| **Headline**         | ~40 characters (~25-30 visible on mobile)      |
| **Link Description** | ~30 characters                                 |

### Stories & Reels

| Specification          | Requirement                 |
| ---------------------- | --------------------------- |
| **Size**               | 1080 × 1920 px              |
| **Aspect Ratio**       | 9:16 (full-screen vertical) |
| **Safe Zone - Top**    | 14% (250px) text-free       |
| **Safe Zone - Bottom** | 20% (340px) text-free       |

### Carousel Ads

| Specification         | Requirement         |
| --------------------- | ------------------- |
| **Number of Cards**   | 2-10 images/videos  |
| **Headline per Card** | Up to 45 characters |
| **Card Description**  | Up to 18 characters |
| **Link Description**  | Up to 30 characters |

### Best Practices

- **1080×1080 square** works across 80% of placements
- Less text on images = better delivery and lower costs
- 20% text rule removed but still impacts performance

---

## Google Ads

### Responsive Display Ads - Images

| Specification          | Requirement                                   |
| ---------------------- | --------------------------------------------- |
| **Landscape (1.91:1)** | 1200 × 628 px recommended (600 × 314 px min)  |
| **Square (1:1)**       | 1200 × 1200 px recommended (300 × 300 px min) |
| **Portrait (4:5)**     | 1200 × 1500 px (320 × 400 px min) - Optional  |
| **File Formats**       | JPG, PNG (no GIF for RDAs)                    |
| **Max File Size**      | 5 MB per image                                |
| **Text Coverage**      | Max 20% of image                              |

### Logo Requirements

| Specification             | Requirement                       |
| ------------------------- | --------------------------------- |
| **Square Logo**           | 1200 × 1200 px (128 × 128 px min) |
| **Landscape Logo**        | 1200 × 300 px                     |
| **File Formats**          | JPG, PNG, SVG                     |
| **Max File Size**         | 5 MB                              |
| **Minimum Readable Size** | 40 × 40 px (square)               |

### Character Limits (Responsive Display)

| Element             | Character Limit     |
| ------------------- | ------------------- |
| **Short Headlines** | Up to 30 characters |
| **Long Headlines**  | Up to 90 characters |
| **Descriptions**    | Up to 90 characters |
| **Business Name**   | Up to 25 characters |

### Uploaded Display Ads

| Specification     | Requirement   |
| ----------------- | ------------- |
| **File Formats**  | GIF, JPG, PNG |
| **Max File Size** | 150 KB        |

**Top Performing Sizes:**

- Medium Rectangle: 300 × 250 px (best performer)
- Leaderboard: 728 × 90 px
- Half Page: 300 × 600 px
- Mobile Leaderboard: 320 × 50 px
- Large Mobile Banner: 320 × 100 px

### Video Ads (YouTube)

| Ad Type                     | Duration                                       |
| --------------------------- | ---------------------------------------------- |
| **Skippable In-Stream**     | Up to 3 minutes (no max, but keep under 3 min) |
| **Non-Skippable In-Stream** | 15-20 seconds                                  |
| **Bumper Ads**              | 6 seconds                                      |
| **In-Feed Ads**             | Up to 3 minutes recommended                    |

| Specification        | Requirement           |
| -------------------- | --------------------- |
| **Landscape Ratio**  | 16:9 or 4:3           |
| **Portrait Ratio**   | 9:16 or 3:4           |
| **Companion Banner** | 300 × 60 px, ≤ 150 KB |

### Discovery/Demand Gen Ads

| Element          | Requirement                                                        |
| ---------------- | ------------------------------------------------------------------ |
| **Headlines**    | 1-5 headlines, 40 characters each (include at least one ≤15 chars) |
| **Descriptions** | 1-5 descriptions, 90 characters max each                           |

### HTML5 Ads

| Specification        | Requirement                             |
| -------------------- | --------------------------------------- |
| **File Type**        | .ZIP                                    |
| **Max File Size**    | 5 MB                                    |
| **Max Files**        | 512 files per ZIP, 20 per Ad Group      |
| **Allowed Types**    | HTML, CSS, JS, GIF, PNG, JPG, JPEG, SVG |
| **Optimal Duration** | 90 seconds                              |

---

## Pinterest Ads

### Standard Image Ads (Promoted Pins)

| Specification        | Requirement                        |
| -------------------- | ---------------------------------- |
| **Recommended Size** | 1000 × 1500 px                     |
| **Aspect Ratio**     | 2:3 (recommended)                  |
| **File Formats**     | PNG, JPEG                          |
| **Max File Size**    | 20 MB (desktop), 32 MB (in-app)    |
| **Profile Photo**    | 280 × 280 px (displayed as circle) |

### Character Limits

| Element         | Character Limit                            |
| --------------- | ------------------------------------------ |
| **Pin Title**   | 100 characters (keep key info in first 40) |
| **Description** | 500 characters                             |

### Video Ads

| Specification        | Requirement                   |
| -------------------- | ----------------------------- |
| **File Formats**     | MP4, MOV, M4V                 |
| **Max File Size**    | 2 GB                          |
| **Duration**         | 4 seconds min, 15 minutes max |
| **Optimal Duration** | 6-15 seconds                  |
| **Encoding**         | H.264 or H.265                |
| **Aspect Ratios**    | 1:1, 2:3, or 9:16             |

### Max-Width Video Ads (Mobile Only)

| Specification    | Requirement                       |
| ---------------- | --------------------------------- |
| **Aspect Ratio** | 1:1 or 16:9                       |
| **Coverage**     | 4× size of traditional Video Pins |
| **Platform**     | Mobile only                       |

### Idea Pin Ads

| Specification       | Requirement                  |
| ------------------- | ---------------------------- |
| **Page Dimensions** | 1080 × 1920 px (9:16)        |
| **Number of Pages** | 1-20 pages                   |
| **Video per Page**  | Up to 60 seconds             |
| **Description**     | 250 characters max per frame |

### Collections Ads

| Specification      | Requirement                     |
| ------------------ | ------------------------------- |
| **Layout**         | 1 main image + 3 smaller images |
| **Platform**       | Mobile feeds                    |
| **Product Images** | Min 800 × 800 px                |
| **Background**     | White or neutral recommended    |

### Carousel Ads

| Specification        | Requirement                                     |
| -------------------- | ----------------------------------------------- |
| **Number of Images** | Up to 5 images                                  |
| **Per Card**         | Individual title, description, and landing page |

### Quiz Ads

| Element                  | Character Limit    |
| ------------------------ | ------------------ |
| **Questions**            | 2-3 questions      |
| **Answers per Question** | 2-3 answers        |
| **Results Title**        | 100 characters max |
| **Results Description**  | 500 characters max |

### Best Practices

- 2:3 aspect ratio prevents cropping in feeds
- Taller pins may get truncated (cutting off logos/CTAs)
- Upload PNG with sRGB for best quality

---

## TikTok Ads

### Video Specifications

| Specification              | Requirement              |
| -------------------------- | ------------------------ |
| **Recommended Size**       | 1080 × 1920 px           |
| **Minimum Size**           | 540 × 960 px             |
| **Preferred Aspect Ratio** | 9:16 (vertical)          |
| **Supported Ratios**       | 9:16, 1:1, 16:9          |
| **File Formats**           | MP4, MOV, MPEG, 3GP, AVI |
| **Max File Size**          | 500 MB                   |
| **Bitrate**                | ≥ 516 kbps               |

### Video Duration

| Duration Type           | Recommendation                          |
| ----------------------- | --------------------------------------- |
| **Minimum**             | 5 seconds                               |
| **Maximum**             | 60 seconds (up to 10 minutes supported) |
| **Sweet Spot**          | 15-30 seconds                           |
| **TikTok Recommended**  | 21-34 seconds                           |
| **Performance Optimal** | 9-15 seconds                            |

### Character Limits

| Element                 | Character Limit                    |
| ----------------------- | ---------------------------------- |
| **Brand Name**          | 2-20 characters (no emojis)        |
| **App Name (Asian)**    | 2-20 characters                    |
| **App Name (Latin)**    | 4-40 characters                    |
| **Ad Caption**          | 12-100 characters (emojis allowed) |
| **Carousel Ad Caption** | 20 characters (placement varies)   |
| **Carousel Ad Title**   | 40 characters (placement varies)   |

**Caption Restrictions:** Characters "{ }", "#", and emojis cannot appear in description field.

### Profile Image

| Specification        | Requirement            |
| -------------------- | ---------------------- |
| **Minimum Size**     | 98 × 98 px             |
| **Recommended Size** | 200 × 200 px or higher |
| **File Formats**     | JPG, PNG               |
| **Max File Size**    | 50 KB                  |

### Safe Zones

| Zone           | Spacing to Avoid              |
| -------------- | ----------------------------- |
| **Top**        | 130 px (TikTok UI elements)   |
| **Bottom**     | 250 px (caption bar, buttons) |
| **Right Side** | UI buttons area               |

### Audio Requirements

| Specification | Requirement                                            |
| ------------- | ------------------------------------------------------ |
| **Sound**     | Required (must be ON)                                  |
| **Quality**   | No jarring or poor-quality audio                       |
| **Copyright** | Must own rights or use TikTok Commercial Music Library |

### Best Practices

- Always shoot 9:16 vertical for native appearance
- 16:9 horizontal videos appear letterboxed and underperform
- Sound is essential - TikTok is a sound-on platform
- Keep key visuals/text within safe zones

---

## Quick Reference Chart

### Image Sizes At-a-Glance

| Platform             | Primary Size   | Aspect Ratio | Max File Size |
| -------------------- | -------------- | ------------ | ------------- |
| **Facebook Feed**    | 1080 × 1080 px | 1:1          | 30 MB         |
| **Facebook Stories** | 1080 × 1920 px | 9:16         | 30 MB         |
| **Google Display**   | 1200 × 628 px  | 1.91:1       | 5 MB          |
| **Google Square**    | 1200 × 1200 px | 1:1          | 5 MB          |
| **Pinterest**        | 1000 × 1500 px | 2:3          | 20 MB         |
| **TikTok**           | 1080 × 1920 px | 9:16         | 500 MB        |

### Video Specs At-a-Glance

| Platform             | Recommended Size | Duration Sweet Spot | Max File Size |
| -------------------- | ---------------- | ------------------- | ------------- |
| **Facebook**         | 1080 × 1080 px   | 15-60 seconds       | 4 GB          |
| **Google (YouTube)** | 1920 × 1080 px   | 15-30 seconds       | Varies        |
| **Pinterest**        | 1000 × 1500 px   | 6-15 seconds        | 2 GB          |
| **TikTok**           | 1080 × 1920 px   | 15-30 seconds       | 500 MB        |

### Character Limits At-a-Glance

| Platform      | Primary Text | Headline    | Description |
| ------------- | ------------ | ----------- | ----------- |
| **Facebook**  | 125 chars    | 40 chars    | 30 chars    |
| **Google**    | 90 chars     | 30/90 chars | 90 chars    |
| **Pinterest** | 500 chars    | 100 chars   | -           |
| **TikTok**    | 100 chars    | 40 chars    | 20 chars    |

---

## Sources

### Facebook/Meta

- [Hootsuite - 2025 Facebook Ad Sizes Cheat Sheet](https://blog.hootsuite.com/facebook-ad-sizes/)
- [Shopify - Facebook Ad Sizes Complete Guide](https://www.shopify.com/blog/facebook-ad-sizes)
- [Sprout Social - Facebook Ad Sizes & Specs](https://sproutsocial.com/insights/facebook-ad-sizes/)

### Google

- [Google Ads Help - Ad Specs Official Guide](https://support.google.com/google-ads/answer/13676244?hl=en)
- [Udonis - Google Display Ad Sizes Guide 2025](https://www.blog.udonis.co/digital-marketing/google-ads/google-display-ad-sizes)
- [Google Ads Help - Uploaded Display Ads Specifications](https://support.google.com/google-ads/answer/1722096?hl=en)

### Pinterest

- [Pinterest Business Help - Official Ad Specs](https://help.pinterest.com/en/business/article/pinterest-product-specs)
- [Strike Social - Pinterest Ad Specs 2025](https://strikesocial.com/blog/pinterest-ad-specs/)
- [Tailwind - Pinterest Ad Formats & Specs](https://www.tailwindapp.com/blog/pinterest-ad-formats)

### TikTok

- [TikTok Ads Manager - Official Video Ads Specifications](https://ads.tiktok.com/help/article?aid=9626)
- [Triple Whale - TikTok Ad Specs Complete Guide](https://www.triplewhale.com/blog/tiktok-ad-spec)
- [Udonis - TikTok Ad Specs, Sizes, and Placements 2025](https://www.blog.udonis.co/advertising/tiktok-ad-specs)

---

_This document is maintained for Thunder Text content generation optimization._
