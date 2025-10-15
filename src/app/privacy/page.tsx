import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Thunder Text',
  description: 'Privacy Policy for Thunder Text - AI Product Description Generator for Shopify',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy for Thunder Text</h1>

          <div className="text-sm text-gray-600 mb-8">
            <p><strong>Effective Date:</strong> October 14, 2025</p>
            <p><strong>Last Updated:</strong> October 14, 2025</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700">
                Thunder Text ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Shopify application and Facebook integration features.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Shopify Store Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Store name, domain, and contact information</li>
                <li>Product data (titles, descriptions, images, inventory)</li>
                <li>Order and sales data for analytics purposes</li>
                <li>Store settings and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Facebook/Meta Integration Data</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Facebook Business Account ID and name</li>
                <li>Facebook Ad Account ID and name</li>
                <li>Facebook User ID (for authentication)</li>
                <li>Facebook campaign information</li>
                <li>Permissions granted to our application</li>
                <li>OAuth access tokens (encrypted and stored securely)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Generated Content</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-generated product descriptions</li>
                <li>Product images uploaded for processing</li>
                <li>Ad creative content and drafts</li>
                <li>Usage metrics and generation history</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Technical Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>IP addresses and device information</li>
                <li>Browser type and version</li>
                <li>Usage patterns and analytics</li>
                <li>Error logs and performance metrics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Primary Uses</h3>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li><strong>Service Delivery:</strong> Generate AI-powered product descriptions and manage Facebook ad campaigns</li>
                <li><strong>Integration Management:</strong> Maintain connections with Shopify and Facebook/Meta platforms</li>
                <li><strong>Analytics:</strong> Track usage, improve AI models, and provide insights</li>
                <li><strong>Support:</strong> Respond to inquiries and troubleshoot issues</li>
                <li><strong>Billing:</strong> Process subscription payments and track usage limits</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Facebook-Specific Uses</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Create and manage Facebook ad campaigns on your behalf</li>
                <li>Retrieve Facebook campaign data for ad creation</li>
                <li>Submit ad creatives to your selected Facebook campaigns</li>
                <li>Monitor ad submission status and handle errors</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing and Disclosure</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Third-Party Services</h3>
              <p className="text-gray-700 mb-3">We share data with the following third-party services:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li><strong>OpenAI:</strong> Product images and data for AI-powered description generation</li>
                <li><strong>Facebook/Meta:</strong> Ad creative content when you create Facebook ads</li>
                <li><strong>Shopify:</strong> Product updates and store integration</li>
                <li><strong>Supabase:</strong> Secure database hosting and authentication</li>
                <li><strong>Render:</strong> Application hosting and deployment</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Legal Requirements</h3>
              <p className="text-gray-700">
                We may disclose your information if required by law, court order, or governmental authority.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Storage and Security</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Security Measures</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Encryption:</strong> All OAuth tokens are encrypted using AES-256-GCM</li>
                <li><strong>Row Level Security:</strong> Database policies ensure multi-tenant data isolation</li>
                <li><strong>Secure Transmission:</strong> All data transmitted via HTTPS/TLS</li>
                <li><strong>Access Controls:</strong> Limited employee access to customer data</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability scanning</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Retention</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Active Data:</strong> Maintained while your account is active</li>
                <li><strong>Product Descriptions:</strong> Retained for 90 days after generation</li>
                <li><strong>Facebook Ad Drafts:</strong> Retained until manually deleted or 1 year</li>
                <li><strong>OAuth Tokens:</strong> Refreshed regularly, expired tokens deleted</li>
                <li><strong>Account Deletion:</strong> All data deleted within 30 days of account closure</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Data Rights</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Access and Control</h3>
              <p className="text-gray-700 mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access your personal data and generated content</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and all associated data</li>
                <li>Export your data in a machine-readable format</li>
                <li>Revoke Facebook/Meta integration permissions</li>
                <li>Opt-out of analytics tracking (where applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">How to Exercise Rights</h3>
              <p className="text-gray-700">
                Contact us at privacy@thundertext.com or use the in-app settings to manage your data preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Facebook Integration Specifics</h2>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Permissions We Request</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>ads_management:</strong> Create and manage ads in your Facebook campaigns</li>
                <li><strong>ads_read:</strong> Read your Facebook ad campaigns and performance data</li>
                <li><strong>business_management:</strong> Access your Facebook Business account information</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">What We Do NOT Access</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Personal Facebook profile information</li>
                <li>Facebook friends or social connections</li>
                <li>Private messages or communications</li>
                <li>Payment methods or billing information</li>
                <li>Ad performance data (we only create ads, not analyze results)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Revoking Facebook Access</h3>
              <p className="text-gray-700 mb-3">You can revoke Thunder Text's access to your Facebook account at any time:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>Go to Facebook Settings → Business Integrations</li>
                <li>Find "Thunder Text" and click Remove</li>
                <li>Alternatively, disconnect within Thunder Text app settings</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700">
                Thunder Text is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-700">
                Your data may be transferred to and processed in countries other than your own. We ensure adequate safeguards are in place for international transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Privacy Policy</h2>
              <p className="text-gray-700 mb-3">We may update this Privacy Policy periodically. We will notify you of material changes via:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Email notification to your registered address</li>
                <li>In-app notification</li>
                <li>Updated "Last Updated" date at the top of this policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Policy</h2>
              <p className="text-gray-700 mb-3">We use essential cookies for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Authentication and session management</li>
                <li>Security and fraud prevention</li>
                <li>Application functionality</li>
              </ul>
              <p className="text-gray-700 mt-3 mb-3">We do NOT use:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Third-party advertising cookies</li>
                <li>Cross-site tracking cookies</li>
                <li>Non-essential marketing cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">California Privacy Rights (CCPA)</h2>
              <p className="text-gray-700 mb-3">California residents have additional rights:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of data sales (we do NOT sell your data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">GDPR Compliance (EU Users)</h2>
              <p className="text-gray-700 mb-3">For EU users, we comply with GDPR requirements:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Legal Basis:</strong> Processing based on consent and contractual necessity</li>
                <li><strong>Data Protection Officer:</strong> dpo@thundertext.com</li>
                <li><strong>EU Representative:</strong> eu-rep@thundertext.com</li>
                <li><strong>Right to Lodge Complaint:</strong> Contact your local data protection authority</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-3">For privacy-related questions or requests:</p>
              <div className="text-gray-700 space-y-1">
                <p><strong>Email:</strong> privacy@thundertext.com</p>
                <p><strong>Support Portal:</strong> <a href="https://thunder-text.onrender.com/support" className="text-blue-600 hover:text-blue-800 underline">https://thunder-text.onrender.com/support</a></p>
                <p><strong>Mailing Address:</strong></p>
                <div className="pl-4">
                  <p>Thunder Text</p>
                  <p>[Your Business Address]</p>
                  <p>[City, State, ZIP]</p>
                  <p>United States</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Processing Agreement</h2>
              <p className="text-gray-700">
                For enterprise customers requiring a Data Processing Agreement (DPA), please contact enterprise@thundertext.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Transparency Commitment</h2>
              <p className="text-gray-700 mb-3">We believe in transparency. This policy is written in plain language to help you understand:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>What data we collect and why</li>
                <li>How we protect your information</li>
                <li>Your rights and how to exercise them</li>
                <li>How to contact us with concerns</li>
              </ul>
            </section>

            <div className="border-t-2 border-gray-200 pt-6 mt-8">
              <p className="text-gray-700 text-center font-medium">
                <strong>Your trust is important to us.</strong> We are committed to protecting your privacy and handling your data responsibly. If you have any questions or concerns, please don't hesitate to contact us.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
