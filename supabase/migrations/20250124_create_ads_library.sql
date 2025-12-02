-- Create ads_library table for storing saved ad mockups
CREATE TABLE IF NOT EXISTS ads_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

    -- Ad content
    headline TEXT NOT NULL,
    primary_text TEXT NOT NULL,
    description TEXT,

    -- Metadata
    platform TEXT NOT NULL, -- 'meta', 'google', 'tiktok', 'instagram', 'pinterest'
    goal TEXT NOT NULL, -- 'awareness', 'engagement', 'conversion', 'traffic', 'app_installs'
    variant_type TEXT, -- 'benefit', 'emotional', 'social_proof', etc.

    -- Product association
    product_id TEXT, -- Shopify product ID
    product_title TEXT,
    product_image TEXT,
    product_data JSONB, -- Full product data for mockup rendering

    -- AI metadata
    predicted_score DECIMAL(3, 1),
    selected_length TEXT, -- 'SHORT', 'MEDIUM', 'LONG'

    -- Status
    status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on shop_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_ads_library_shop_id ON ads_library(shop_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_ads_library_created_at ON ads_library(created_at DESC);

-- Create index on platform for filtering
CREATE INDEX IF NOT EXISTS idx_ads_library_platform ON ads_library(platform);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_ads_library_status ON ads_library(status);

-- Enable RLS
ALTER TABLE ads_library ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own shop's ads
CREATE POLICY "Users can read their own shop's ads"
    ON ads_library
    FOR SELECT
    TO authenticated
    USING (
        shop_id IN (
            SELECT id FROM shops WHERE id = shop_id
        )
    );

-- Create policy for authenticated users to insert ads for their shop
CREATE POLICY "Users can insert ads for their shop"
    ON ads_library
    FOR INSERT
    TO authenticated
    WITH CHECK (
        shop_id IN (
            SELECT id FROM shops WHERE id = shop_id
        )
    );

-- Create policy for authenticated users to update their own shop's ads
CREATE POLICY "Users can update their own shop's ads"
    ON ads_library
    FOR UPDATE
    TO authenticated
    USING (
        shop_id IN (
            SELECT id FROM shops WHERE id = shop_id
        )
    );

-- Create policy for authenticated users to delete their own shop's ads
CREATE POLICY "Users can delete their own shop's ads"
    ON ads_library
    FOR DELETE
    TO authenticated
    USING (
        shop_id IN (
            SELECT id FROM shops WHERE id = shop_id
        )
    );

-- Grant permissions to anon role for basic operations
GRANT SELECT ON ads_library TO anon;
GRANT INSERT ON ads_library TO anon;
GRANT UPDATE ON ads_library TO anon;
GRANT DELETE ON ads_library TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ads_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ads_library_updated_at
    BEFORE UPDATE ON ads_library
    FOR EACH ROW
    EXECUTE FUNCTION update_ads_library_updated_at();
