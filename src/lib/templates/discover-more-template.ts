/**
 * Discover More Section Template
 *
 * Generates HTML for the "Discover More" blog link section
 * that gets embedded in Shopify product descriptions.
 *
 * Uses inline styles for Shopify compatibility (no external CSS).
 */

export interface DiscoverMoreOptions {
  /** Blog post title */
  blogTitle: string;
  /** AI-generated 3-4 sentence summary */
  summary: string;
  /** URL to the full blog post */
  blogUrl: string;
  /** Optional: Custom section title (default: "Discover More") */
  sectionTitle?: string;
  /** Optional: Custom "Read more" link text */
  readMoreText?: string;
  /** Optional: Primary brand color for accents (default: #0066cc) */
  accentColor?: string;
  /** Optional: Background color (default: #f8f9fa) */
  backgroundColor?: string;
}

/**
 * Generates the HTML for a "Discover More" section with blog link
 *
 * @param options - Configuration for the discover more section
 * @returns HTML string with inline styles for Shopify compatibility
 */
export function generateDiscoverMoreHTML(options: DiscoverMoreOptions): string {
  const {
    blogTitle,
    summary,
    blogUrl,
    sectionTitle = "Discover More",
    readMoreText = "Read more",
    accentColor = "#0066cc",
    backgroundColor = "#f8f9fa",
  } = options;

  // Escape HTML entities to prevent XSS
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const escapedTitle = escapeHtml(blogTitle);
  const escapedSummary = escapeHtml(summary);
  const escapedUrl = escapeHtml(blogUrl);
  const escapedSectionTitle = escapeHtml(sectionTitle);
  const escapedReadMoreText = escapeHtml(readMoreText);

  return `
<div class="discover-more-section" style="margin-top: 32px; padding: 24px; background-color: ${backgroundColor}; border-radius: 12px;">
  <b>${escapedSectionTitle}</b><br><br>
  <a href="${escapedUrl}" style="color: ${accentColor}; text-decoration: none;">
    ${escapedTitle}
  </a><br><br>
  ${escapedSummary}<br><br>
  <a href="${escapedUrl}" style="color: ${accentColor}; text-decoration: none;">
    ${escapedReadMoreText} →
  </a>
</div>
`.trim();
}

/**
 * Generates a minimal/compact version of the Discover More section
 * Useful when space is limited
 */
export function generateDiscoverMoreHTMLCompact(options: DiscoverMoreOptions): string {
  const {
    blogTitle,
    summary,
    blogUrl,
    accentColor = "#0066cc",
  } = options;

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const escapedTitle = escapeHtml(blogTitle);
  const escapedSummary = escapeHtml(summary);
  const escapedUrl = escapeHtml(blogUrl);

  return `
<div style="margin-top: 24px; padding: 16px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 8px; border: 1px solid #e5e7eb;">
  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">Related Article</p>
  <a href="${escapedUrl}" style="display: block; color: ${accentColor}; font-size: 15px; font-weight: 500; text-decoration: none; margin-bottom: 8px;">
    ${escapedTitle}
  </a>
  <p style="margin: 0; font-size: 13px; color: #4a4a4a; line-height: 1.5;">
    ${escapedSummary} <a href="${escapedUrl}" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">Read more →</a>
  </p>
</div>
`.trim();
}

/**
 * Strips the Discover More section from product description HTML
 * Useful when updating the blog link
 */
export function removeDiscoverMoreSection(descriptionHtml: string): string {
  // Remove the discover-more-section div and all its contents
  return descriptionHtml
    .replace(/<div class="discover-more-section"[^>]*>[\s\S]*?<\/div>\s*$/i, "")
    .trim();
}

/**
 * Checks if a product description already has a Discover More section
 */
export function hasDiscoverMoreSection(descriptionHtml: string): boolean {
  return descriptionHtml.includes('class="discover-more-section"');
}

/**
 * Appends a Discover More section to existing product description
 * Handles the case where one already exists by replacing it
 */
export function appendDiscoverMoreSection(
  existingDescription: string,
  options: DiscoverMoreOptions
): string {
  // Remove existing section if present
  const cleanDescription = removeDiscoverMoreSection(existingDescription);

  // Generate new section
  const discoverMoreHtml = generateDiscoverMoreHTML(options);

  // Append with proper spacing
  return `${cleanDescription}\n\n${discoverMoreHtml}`;
}
