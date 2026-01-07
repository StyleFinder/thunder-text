/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import {} from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div
      className="w-full flex flex-col items-center"
      style={{
        background: "#fafaf9",
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <div className="w-full" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#003366",
              marginBottom: "8px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Help Center
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Get help with Thunder Text features and functionality
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Getting Started */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Getting Started
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  How do I create my first product description?
                </h3>
                <ol
                  className="list-decimal list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Click "Create Description" in the navigation menu</li>
                  <li>Upload 1-4 product images</li>
                  <li>Fill in basic product details (title, color, sizing)</li>
                  <li>
                    Click "Generate Description" and wait for AI to process
                  </li>
                  <li>Review and customize the generated content</li>
                  <li>
                    Click "Create Product in Shopify" to add it to your store
                  </li>
                </ol>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  How do I enhance an existing product?
                </h3>
                <ol
                  className="list-decimal list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Click "Enhance Product" in the navigation menu</li>
                  <li>Search for and select the product you want to improve</li>
                  <li>Review the current description</li>
                  <li>Click "Generate Enhanced Description"</li>
                  <li>Compare the new content with the original</li>
                  <li>Save changes to update your product in Shopify</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Features & Functionality */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Features & Functionality
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  What can Thunder Text generate?
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Thunder Text uses AI to create:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>
                    <strong>Product Title:</strong> SEO-optimized, compelling
                    titles
                  </li>
                  <li>
                    <strong>Description:</strong> Detailed, engaging
                    HTML-formatted descriptions
                  </li>
                  <li>
                    <strong>Bullet Points:</strong> Key features and benefits
                  </li>
                  <li>
                    <strong>Meta Description:</strong> SEO metadata for search
                    engines
                  </li>
                  <li>
                    <strong>Keywords:</strong> Relevant tags for product
                    discovery
                  </li>
                  <li>
                    <strong>Category Suggestions:</strong> Automatic Shopify
                    category assignment
                  </li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  How does color detection work?
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Thunder Text automatically analyzes uploaded images to detect
                  product colors. The AI identifies the dominant colors and
                  suggests standardized color names. You can override these
                  suggestions if needed before creating the product.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Can I customize the AI-generated content?
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Yes! All generated content can be edited before creating or
                  updating products in Shopify. You can modify titles,
                  descriptions, bullet points, and other fields directly in the
                  interface.
                </p>
              </div>
            </div>
          </div>

          {/* Custom Templates & Settings */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Custom Templates & Settings
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  How do I create custom prompts?
                </h3>
                <ol
                  className="list-decimal list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Navigate to Settings in the menu</li>
                  <li>Go to the "Prompts" section</li>
                  <li>Click "Create New Prompt Template"</li>
                  <li>Enter your custom instructions for the AI</li>
                  <li>Save and set as default if desired</li>
                </ol>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  What are category-specific templates?
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Category templates allow you to customize AI generation for
                  specific product types (e.g., dresses, tops, shoes). This
                  ensures descriptions match your brand voice and highlight
                  relevant features for each category.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Troubleshooting
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  My images aren't uploading properly
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Check the following:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Image files are in JPEG, PNG, or WebP format</li>
                  <li>File size is under 10MB per image</li>
                  <li>You have a stable internet connection</li>
                  <li>Try refreshing the page and uploading again</li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  The AI generation is taking too long
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  AI processing typically takes 10-30 seconds depending on image
                  complexity. If it takes longer than 2 minutes, refresh the
                  page and try again. Contact support if the issue persists.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Products aren't appearing in my Shopify store
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Products are created as DRAFT by default. Check your Shopify
                  admin under Products → Drafts. You'll need to manually publish
                  them after reviewing.
                </p>
              </div>
            </div>
          </div>

          {/* Errors, Logs, and API Health */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Errors, Logs, and API Health
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  ⚠️ Some Features Unavailable
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  If you see this message, it means some custom features could
                  not be loaded. This typically affects:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Custom categories (defaults to standard categories)</li>
                </ul>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    This doesn't affect your ability to create products.
                  </strong>{" "}
                  The app will use default options instead.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Common Causes
                </h3>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Temporary API connection issues</li>
                  <li>Database synchronization delays</li>
                  <li>Custom settings not yet configured in Settings page</li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  How to Resolve
                </h3>
                <ol
                  className="list-decimal list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Refresh the page and try again</li>
                  <li>
                    Check that you've configured custom categories in Settings
                  </li>
                  <li>
                    If the issue persists for more than 5 minutes, contact
                    support
                  </li>
                </ol>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  In most cases, this resolves automatically within a few
                  seconds.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  API Health Status
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  If you're experiencing issues with features loading:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Check your internet connection</li>
                  <li>Verify the Shopify admin is accessible</li>
                  <li>Try logging out and back into the Thunder Text app</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact & Support */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Contact & Support
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Need more help?
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Our support team is here to assist you:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>
                    <strong>Email:</strong>{" "}
                    <a
                      href="mailto:support@zunosai.com"
                      style={{ color: "#0066cc", textDecoration: "underline" }}
                    >
                      support@zunosai.com
                    </a>
                  </li>
                  <li>
                    <strong>Response Time:</strong> Within 24 hours on business
                    days
                  </li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Report a Bug
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Found an issue? Please report it to{" "}
                  <a
                    href="mailto:support@zunosai.com"
                    style={{ color: "#0066cc", textDecoration: "underline" }}
                  >
                    support@zunosai.com
                  </a>{" "}
                  with:
                </p>
                <ul
                  className="list-disc list-inside"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    color: "#003366",
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <li>Description of the problem</li>
                  <li>Steps to reproduce</li>
                  <li>Screenshots (if applicable)</li>
                  <li>Your store domain</li>
                </ul>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Feature Requests
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  Have an idea to improve Thunder Text? We'd love to hear it!{" "}
                  <a
                    href="mailto:support@zunosai.com"
                    style={{ color: "#0066cc", textDecoration: "underline" }}
                  >
                    support@zunosai.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* About */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                About Thunder Text
              </h2>
            </div>
            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{ height: "1px", background: "#e5e7eb", margin: 0 }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  lineHeight: 1.6,
                }}
              >
                Thunder Text is powered by advanced AI technology to help
                boutique store owners create compelling product descriptions
                quickly and efficiently. Built with love by the Zunos team.
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Version 3.0 | Last updated: October 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
