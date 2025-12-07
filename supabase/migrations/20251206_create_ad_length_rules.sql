-- Migration: Create ad_length_rules table for AIE Ad Length Selection Engine
-- Purpose: Store configurable scoring rules for determining optimal ad length

-- Create the ad_length_rules table
CREATE TABLE IF NOT EXISTS ad_length_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    rules JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for active rules lookup
CREATE INDEX IF NOT EXISTS idx_ad_length_rules_active_version
ON ad_length_rules (is_active, version DESC);

-- Add comment for documentation
COMMENT ON TABLE ad_length_rules IS 'ACE Ad Length Selection Engine rules - determines optimal ad copy length based on campaign context';

-- Insert default rules (v1)
INSERT INTO ad_length_rules (version, is_active, rules) VALUES (
    1,
    true,
    '{
        "version": 1,
        "defaults": {
            "ad_length_mode": "AUTO",
            "campaign_type": "SALES",
            "audience_temperature": "WARM",
            "product_complexity": "MEDIUM",
            "has_strong_story": false,
            "is_premium_brand": false
        },
        "length_options": ["SHORT", "MEDIUM", "LONG"],
        "scoring": {
            "campaign_type": [
                {
                    "match": ["AWARENESS", "REACH"],
                    "weights": {"SHORT": 3, "MEDIUM": 1, "LONG": 0}
                },
                {
                    "match": ["TRAFFIC"],
                    "weights": {"SHORT": 2, "MEDIUM": 2, "LONG": 0}
                },
                {
                    "match": ["SALES", "CONVERSIONS", "LEADS"],
                    "weights": {"SHORT": 0, "MEDIUM": 2, "LONG": 2}
                },
                {
                    "match": ["RETARGETING"],
                    "weights": {"SHORT": 1, "MEDIUM": 3, "LONG": 0}
                }
            ],
            "audience_temperature": [
                {
                    "match": ["COLD"],
                    "weights": {"SHORT": 0, "MEDIUM": 1, "LONG": 3}
                },
                {
                    "match": ["WARM"],
                    "weights": {"SHORT": 1, "MEDIUM": 3, "LONG": 1}
                },
                {
                    "match": ["HOT"],
                    "weights": {"SHORT": 3, "MEDIUM": 1, "LONG": 0}
                }
            ],
            "price": {
                "rules": [
                    {
                        "min": 0,
                        "max": 30,
                        "weights": {"SHORT": 3, "MEDIUM": 1, "LONG": 0}
                    },
                    {
                        "min": 30,
                        "max": 100,
                        "weights": {"SHORT": 1, "MEDIUM": 3, "LONG": 1}
                    },
                    {
                        "min": 100,
                        "max": null,
                        "weights": {"SHORT": 0, "MEDIUM": 1, "LONG": 3}
                    }
                ]
            },
            "product_complexity": [
                {
                    "match": ["LOW"],
                    "weights": {"SHORT": 3, "MEDIUM": 1, "LONG": 0}
                },
                {
                    "match": ["MEDIUM"],
                    "weights": {"SHORT": 1, "MEDIUM": 3, "LONG": 1}
                },
                {
                    "match": ["HIGH"],
                    "weights": {"SHORT": 0, "MEDIUM": 1, "LONG": 3}
                }
            ],
            "has_strong_story": {
                "true": {"SHORT": 0, "MEDIUM": 1, "LONG": 2},
                "false": {"SHORT": 1, "MEDIUM": 1, "LONG": 0}
            },
            "is_premium_brand": {
                "true": {"SHORT": 0, "MEDIUM": 2, "LONG": 2},
                "false": {"SHORT": 1, "MEDIUM": 1, "LONG": 0}
            }
        },
        "tie_breaker": {
            "primary_preference": "MEDIUM",
            "cold_audience_preference_order": ["LONG", "MEDIUM", "SHORT"],
            "hot_audience_preference_order": ["SHORT", "MEDIUM", "LONG"]
        }
    }'::jsonb
);

-- Enable RLS
ALTER TABLE ad_length_rules ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow all authenticated users to read rules (they're global config)
CREATE POLICY "ad_length_rules_read_all" ON ad_length_rules
    FOR SELECT USING (true);

-- RLS policy: Only service role can modify rules
CREATE POLICY "ad_length_rules_service_write" ON ad_length_rules
    FOR ALL USING (auth.role() = 'service_role');
