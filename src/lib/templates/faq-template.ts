/**
 * FAQ Section Template
 *
 * Generates HTML for the "Common Customer Questions" section
 * that gets embedded in Shopify product descriptions.
 *
 * Uses inline styles for Shopify compatibility (no external CSS).
 */

export interface FAQ {
  question: string;
  answer: string;
}

/**
 * Escapes HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates the HTML for a "Common Customer Questions" FAQ section
 *
 * @param faqs - Array of FAQ objects with question and answer
 * @returns HTML string matching product description styling
 */
export function generateFAQHTML(faqs: FAQ[]): string {
  if (!faqs || faqs.length === 0) return "";

  const faqItems = faqs
    .map(
      (faq) =>
        `<b>${escapeHtml(faq.question)}</b><br>${escapeHtml(faq.answer)}`
    )
    .join("<br><br>");

  return `<br><br><b>FAQs</b><br><br>${faqItems}`;
}

/**
 * Checks if a product description already has a FAQ section
 */
export function hasFAQSection(descriptionHtml: string): boolean {
  return (
    descriptionHtml.includes("<b>FAQs</b>") ||
    descriptionHtml.includes("<b>Common Customer Questions</b>")
  );
}

/**
 * Removes the FAQ section from product description HTML
 * Useful when updating or regenerating FAQs
 */
export function removeFAQSection(descriptionHtml: string): string {
  // Remove everything from FAQ header to end
  // or until the next main section (like "Discover More")
  // Check for both old and new header formats
  let faqStart = descriptionHtml.indexOf("<b>FAQs</b>");
  if (faqStart === -1) {
    faqStart = descriptionHtml.indexOf("<b>Common Customer Questions</b>");
  }
  if (faqStart === -1) return descriptionHtml;

  // Check if there's a "Discover More" section after FAQs
  const discoverMoreStart = descriptionHtml.indexOf(
    '<div class="discover-more-section"',
    faqStart
  );

  if (discoverMoreStart !== -1) {
    // Preserve the Discover More section
    return (
      descriptionHtml.substring(0, faqStart).trim() +
      "\n\n" +
      descriptionHtml.substring(discoverMoreStart)
    );
  }

  // No Discover More section, just remove FAQ section to end
  return descriptionHtml.substring(0, faqStart).trim();
}

/**
 * Appends FAQ section to existing product description
 * Handles the case where one already exists by replacing it
 */
export function appendFAQSection(
  existingDescription: string,
  faqs: FAQ[]
): string {
  // Remove existing section if present
  const cleanDescription = removeFAQSection(existingDescription);

  // Generate new section
  const faqHtml = generateFAQHTML(faqs);

  if (!faqHtml) return cleanDescription;

  // Append with proper spacing
  return `${cleanDescription}${faqHtml}`;
}
