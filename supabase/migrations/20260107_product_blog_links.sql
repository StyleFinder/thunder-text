-- Migration: Product Blog Links
-- Description: Creates table to link products to blog posts for "Discover More" feature
-- Date: 2026-01-07

-- Create the product_blog_links table
CREATE TABLE IF NOT EXISTS product_blog_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Shopify product identifier (GID format: gid://shopify/Product/123456789)
  product_id TEXT NOT NULL,

  -- For Content Library blogs (references generated_content table)
  blog_id UUID REFERENCES generated_content(id) ON DELETE SET NULL,

  -- For Shopify blogs (store the Shopify IDs)
  shopify_blog_id TEXT,
  shopify_article_id TEXT,

  -- Source indicator
  blog_source VARCHAR(20) NOT NULL CHECK (blog_source IN ('library', 'shopify')),

  -- Cached blog info for quick access (avoids joins)
  blog_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  blog_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  -- Ensure either blog_id (library) or shopify_article_id (shopify) is set based on source
  CONSTRAINT check_blog_reference CHECK (
    (blog_source = 'library' AND blog_id IS NOT NULL) OR
    (blog_source = 'shopify' AND shopify_article_id IS NOT NULL)
  ),

  -- A product can only have one blog link (prevents duplicates)
  CONSTRAINT unique_product_blog_link UNIQUE (store_id, product_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_product_blog_links_store ON product_blog_links(store_id);
CREATE INDEX IF NOT EXISTS idx_product_blog_links_product ON product_blog_links(product_id);
CREATE INDEX IF NOT EXISTS idx_product_blog_links_blog ON product_blog_links(blog_id) WHERE blog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_blog_links_source ON product_blog_links(blog_source);

-- Enable Row Level Security
ALTER TABLE product_blog_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies using service role (matches existing pattern in codebase)
-- The application uses supabaseAdmin with service role key, so we create permissive policies

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to product_blog_links"
  ON product_blog_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_blog_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_blog_links_updated_at
  BEFORE UPDATE ON product_blog_links
  FOR EACH ROW
  EXECUTE FUNCTION update_product_blog_links_updated_at();

-- Add comment for documentation
COMMENT ON TABLE product_blog_links IS 'Links products to blog posts for the "Discover More" feature in product descriptions';
COMMENT ON COLUMN product_blog_links.blog_source IS 'Source of the blog: library (Content Library) or shopify (Shopify Blog API)';
COMMENT ON COLUMN product_blog_links.summary IS 'AI-generated 3-4 sentence summary of the blog post';
