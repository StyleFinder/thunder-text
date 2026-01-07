-- Product Animator System Migration
-- Creates tables for video generation tracking, credit management, and storage

-- ============================================================================
-- VIDEO GENERATIONS TABLE
-- Tracks all video generation requests and their status
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

    -- Generation request details
    source_image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'veo3_fast', -- 'veo3' (quality) or 'veo3_fast' (fast)
    aspect_ratio TEXT DEFAULT '16:9', -- '16:9', '9:16', 'Auto'
    generation_type TEXT DEFAULT 'REFERENCE_2_VIDEO', -- For product animation

    -- Kie.ai task tracking
    kie_task_id TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, refunded

    -- Quality pre-check results (Gemini vision)
    quality_check_passed BOOLEAN,
    quality_check_warnings JSONB,
    quality_check_skipped BOOLEAN DEFAULT FALSE,

    -- Results
    video_url TEXT,
    video_storage_path TEXT, -- Path in Supabase storage
    thumbnail_url TEXT,
    duration_seconds NUMERIC(5,2),

    -- Cost tracking
    credits_used INTEGER NOT NULL DEFAULT 1,
    cost_usd NUMERIC(10,4),

    -- Error handling
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Refund tracking
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_video_generations_shop_id ON video_generations(shop_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);
CREATE INDEX IF NOT EXISTS idx_video_generations_kie_task_id ON video_generations(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_created_at ON video_generations(created_at DESC);

-- ============================================================================
-- VIDEO CREDITS TABLE
-- Tracks credit balance and transactions for each shop
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

    -- Current balance
    balance INTEGER NOT NULL DEFAULT 0,

    -- Lifetime stats
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0,
    total_refunded INTEGER NOT NULL DEFAULT 0,

    -- Shopify usage billing integration
    shopify_usage_line_item_id TEXT, -- For appUsageRecordCreate
    shopify_capped_amount NUMERIC(10,2) DEFAULT 50.00,

    -- Refund abuse prevention
    refunds_today INTEGER DEFAULT 0,
    refunds_reset_at DATE DEFAULT CURRENT_DATE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_shop_credits UNIQUE(shop_id)
);

-- ============================================================================
-- VIDEO CREDIT TRANSACTIONS TABLE
-- Audit log for all credit changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type TEXT NOT NULL, -- 'purchase', 'use', 'refund', 'bonus', 'adjustment'
    amount INTEGER NOT NULL, -- Positive for credits added, negative for credits used
    balance_after INTEGER NOT NULL,

    -- Related records
    video_generation_id UUID REFERENCES video_generations(id),
    shopify_charge_id TEXT, -- For Shopify billing reconciliation

    -- Description
    description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_shop_id ON video_credit_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON video_credit_transactions(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Video generations policies
CREATE POLICY "Users can view own shop video generations"
    ON video_generations FOR SELECT
    USING (shop_id = current_setting('app.current_shop_id', true)::uuid);

CREATE POLICY "Users can insert own shop video generations"
    ON video_generations FOR INSERT
    WITH CHECK (shop_id = current_setting('app.current_shop_id', true)::uuid);

CREATE POLICY "Users can update own shop video generations"
    ON video_generations FOR UPDATE
    USING (shop_id = current_setting('app.current_shop_id', true)::uuid);

-- Video credits policies
CREATE POLICY "Users can view own shop credits"
    ON video_credits FOR SELECT
    USING (shop_id = current_setting('app.current_shop_id', true)::uuid);

-- Credit transactions policies
CREATE POLICY "Users can view own shop credit transactions"
    ON video_credit_transactions FOR SELECT
    USING (shop_id = current_setting('app.current_shop_id', true)::uuid);

-- ============================================================================
-- SERVICE ROLE ACCESS (for API routes)
-- ============================================================================

-- Allow service role full access for API operations
CREATE POLICY "Service role full access to video_generations"
    ON video_generations FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to video_credits"
    ON video_credits FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to video_credit_transactions"
    ON video_credit_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to deduct credits and create transaction record
CREATE OR REPLACE FUNCTION deduct_video_credit(
    p_shop_id UUID,
    p_video_generation_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with lock
    SELECT balance INTO v_current_balance
    FROM video_credits
    WHERE shop_id = p_shop_id
    FOR UPDATE;

    -- Check if shop has credits record
    IF v_current_balance IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;

    -- Update balance
    UPDATE video_credits
    SET
        balance = v_new_balance,
        total_used = total_used + p_amount,
        updated_at = NOW()
    WHERE shop_id = p_shop_id;

    -- Create transaction record
    INSERT INTO video_credit_transactions (
        shop_id,
        transaction_type,
        amount,
        balance_after,
        video_generation_id,
        description
    ) VALUES (
        p_shop_id,
        'use',
        -p_amount,
        v_new_balance,
        p_video_generation_id,
        'Video generation'
    );

    RETURN TRUE;
END;
$$;

-- Function to refund credits
CREATE OR REPLACE FUNCTION refund_video_credit(
    p_shop_id UUID,
    p_video_generation_id UUID,
    p_reason TEXT DEFAULT 'Poor quality result'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits_to_refund INTEGER;
    v_new_balance INTEGER;
    v_refunds_today INTEGER;
    v_refunds_reset_at DATE;
BEGIN
    -- Check refund limits (3 per day)
    SELECT refunds_today, refunds_reset_at
    INTO v_refunds_today, v_refunds_reset_at
    FROM video_credits
    WHERE shop_id = p_shop_id;

    -- Reset counter if new day
    IF v_refunds_reset_at < CURRENT_DATE THEN
        v_refunds_today := 0;
    END IF;

    -- Check if limit exceeded
    IF v_refunds_today >= 3 THEN
        RETURN FALSE;
    END IF;

    -- Get credits used for this generation
    SELECT credits_used INTO v_credits_to_refund
    FROM video_generations
    WHERE id = p_video_generation_id
    AND shop_id = p_shop_id
    AND status != 'refunded';

    IF v_credits_to_refund IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update credits balance
    UPDATE video_credits
    SET
        balance = balance + v_credits_to_refund,
        total_refunded = total_refunded + v_credits_to_refund,
        refunds_today = CASE
            WHEN refunds_reset_at < CURRENT_DATE THEN 1
            ELSE refunds_today + 1
        END,
        refunds_reset_at = CURRENT_DATE,
        updated_at = NOW()
    WHERE shop_id = p_shop_id
    RETURNING balance INTO v_new_balance;

    -- Update generation status
    UPDATE video_generations
    SET
        status = 'refunded',
        refunded_at = NOW(),
        refund_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_video_generation_id;

    -- Create transaction record
    INSERT INTO video_credit_transactions (
        shop_id,
        transaction_type,
        amount,
        balance_after,
        video_generation_id,
        description
    ) VALUES (
        p_shop_id,
        'refund',
        v_credits_to_refund,
        v_new_balance,
        p_video_generation_id,
        p_reason
    );

    RETURN TRUE;
END;
$$;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION add_video_credits(
    p_shop_id UUID,
    p_amount INTEGER,
    p_shopify_charge_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT 'Credit purchase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Upsert credits record
    INSERT INTO video_credits (shop_id, balance, total_purchased)
    VALUES (p_shop_id, p_amount, p_amount)
    ON CONFLICT (shop_id) DO UPDATE
    SET
        balance = video_credits.balance + p_amount,
        total_purchased = video_credits.total_purchased + p_amount,
        updated_at = NOW()
    RETURNING balance INTO v_new_balance;

    -- Create transaction record
    INSERT INTO video_credit_transactions (
        shop_id,
        transaction_type,
        amount,
        balance_after,
        shopify_charge_id,
        description
    ) VALUES (
        p_shop_id,
        'purchase',
        p_amount,
        v_new_balance,
        p_shopify_charge_id,
        p_description
    );

    RETURN v_new_balance;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION deduct_video_credit TO service_role;
GRANT EXECUTE ON FUNCTION refund_video_credit TO service_role;
GRANT EXECUTE ON FUNCTION add_video_credits TO service_role;

-- ============================================================================
-- STORAGE BUCKET
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This is documented here for reference
-- ============================================================================

-- To create via SQL (run in Supabase SQL Editor):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-videos', 'product-videos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies would be:
-- CREATE POLICY "Public read access for product videos"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'product-videos');
--
-- CREATE POLICY "Service role can upload product videos"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'product-videos' AND auth.role() = 'service_role');

COMMENT ON TABLE video_generations IS 'Tracks all product video generation requests using Veo 3.1 via Kie.ai';
COMMENT ON TABLE video_credits IS 'Manages video generation credit balance per shop';
COMMENT ON TABLE video_credit_transactions IS 'Audit log of all credit changes';
