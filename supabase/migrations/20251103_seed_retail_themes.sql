-- ============================================================================
-- Seed Data: 20 Common Retail Themes
-- ============================================================================

-- Insert themes with seasonal bounds
INSERT INTO themes (slug, name, description, category, active_start, active_end, refresh_frequency) VALUES

-- Sports Themes
('game-day', 'Game Day', 'Football season spirit wear and accessories', 'Sports', '08-01', '02-15', 'weekly'),
('basketball-season', 'Basketball Season', 'Basketball apparel and fan gear', 'Sports', '10-01', '04-15', 'weekly'),
('summer-sports', 'Summer Sports', 'Beach volleyball, golf, tennis gear', 'Sports', '04-01', '09-30', 'weekly'),

-- Major Holidays
('christmas', 'Christmas', 'Holiday gifts, decor, and party supplies', 'Holiday', '10-01', '12-31', 'weekly'),
('valentines-day', 'Valentine''s Day', 'Gifts for loved ones and romantic occasions', 'Holiday', '01-01', '02-14', 'weekly'),
('halloween', 'Halloween', 'Costumes, candy, and spooky decor', 'Holiday', '09-01', '10-31', 'weekly'),
('easter', 'Easter', 'Spring celebration gifts and decor', 'Holiday', '02-01', '04-30', 'weekly'),
('mothers-day', 'Mother''s Day', 'Gifts to celebrate moms', 'Holiday', '04-01', '05-31', 'weekly'),
('fathers-day', 'Father''s Day', 'Gifts to celebrate dads', 'Holiday', '05-01', '06-30', 'weekly'),
('fourth-of-july', 'Fourth of July', 'Independence Day celebration items', 'Holiday', '06-01', '07-04', 'weekly'),

-- Seasonal Themes
('back-to-school', 'Back to School', 'School supplies and student essentials', 'Seasonal', '07-01', '09-30', 'weekly'),
('spring-break', 'Spring Break', 'Travel and vacation essentials', 'Seasonal', '02-01', '04-30', 'weekly'),
('summer-vacation', 'Summer Vacation', 'Summer travel and outdoor living', 'Seasonal', '05-01', '09-15', 'weekly'),
('fall-fashion', 'Fall Fashion', 'Autumn wardrobe and cozy styles', 'Seasonal', '08-15', '11-30', 'weekly'),
('winter-wear', 'Winter Wear', 'Cold weather clothing and accessories', 'Seasonal', '10-01', '03-31', 'weekly'),

-- Occasion Themes
('wedding-season', 'Wedding Season', 'Bridal party and guest attire', 'Occasion', '04-01', '10-31', 'weekly'),
('graduation', 'Graduation', 'Celebration gifts and party supplies', 'Occasion', '04-01', '06-30', 'weekly'),
('teacher-gifts', 'Teacher Appreciation', 'End-of-year teacher gifts', 'Occasion', '04-01', '06-30', 'weekly'),
('new-years', 'New Year''s Eve', 'Party supplies and celebration wear', 'Holiday', '12-01', '01-07', 'weekly'),
('holiday-party', 'Holiday Party', 'Festive party outfits and decor', 'Holiday', '11-01', '12-31', 'weekly')

ON CONFLICT (slug) DO NOTHING;

-- Insert keywords for each theme
WITH theme_data AS (
  SELECT id, slug FROM themes WHERE slug IN (
    'game-day', 'basketball-season', 'christmas', 'valentines-day',
    'halloween', 'back-to-school', 'spring-break', 'wedding-season',
    'graduation', 'teacher-gifts', 'mothers-day', 'fathers-day'
  )
)
INSERT INTO theme_keywords (theme_id, keyword, market, weight) VALUES

-- Game Day
((SELECT id FROM theme_data WHERE slug='game-day'), 'game day outfits', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='game-day'), 'game day tops', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='game-day'), 'team color jewelry', 'US', 0.6),
((SELECT id FROM theme_data WHERE slug='game-day'), 'football fan gear', 'US', 0.7),

-- Basketball Season
((SELECT id FROM theme_data WHERE slug='basketball-season'), 'basketball apparel', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='basketball-season'), 'basketball fan shirts', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='basketball-season'), 'march madness outfits', 'US', 0.9),

-- Christmas
((SELECT id FROM theme_data WHERE slug='christmas'), 'christmas gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='christmas'), 'holiday party outfits', 'US', 0.9),
((SELECT id FROM theme_data WHERE slug='christmas'), 'christmas decorations', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='christmas'), 'ugly christmas sweater', 'US', 0.7),

-- Valentine's Day
((SELECT id FROM theme_data WHERE slug='valentines-day'), 'valentines day gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='valentines-day'), 'valentines outfit', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='valentines-day'), 'gifts for her', 'US', 0.7),
((SELECT id FROM theme_data WHERE slug='valentines-day'), 'gifts for him', 'US', 0.7),

-- Halloween
((SELECT id FROM theme_data WHERE slug='halloween'), 'halloween costumes', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='halloween'), 'halloween decorations', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='halloween'), 'halloween party supplies', 'US', 0.7),

-- Back to School
((SELECT id FROM theme_data WHERE slug='back-to-school'), 'back to school outfits', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='back-to-school'), 'school supplies', 'US', 0.9),
((SELECT id FROM theme_data WHERE slug='back-to-school'), 'teacher gifts', 'US', 0.6),

-- Spring Break
((SELECT id FROM theme_data WHERE slug='spring-break'), 'spring break outfits', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='spring-break'), 'beach vacation clothes', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='spring-break'), 'swimwear', 'US', 0.9),

-- Wedding Season
((SELECT id FROM theme_data WHERE slug='wedding-season'), 'wedding guest dresses', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='wedding-season'), 'bridesmaid gifts', 'US', 0.7),
((SELECT id FROM theme_data WHERE slug='wedding-season'), 'wedding party outfits', 'US', 0.8),

-- Graduation
((SELECT id FROM theme_data WHERE slug='graduation'), 'graduation gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='graduation'), 'graduation party supplies', 'US', 0.8),
((SELECT id FROM theme_data WHERE slug='graduation'), 'graduation outfits', 'US', 0.7),

-- Teacher Gifts
((SELECT id FROM theme_data WHERE slug='teacher-gifts'), 'teacher appreciation gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='teacher-gifts'), 'end of year teacher gifts', 'US', 0.9),
((SELECT id FROM theme_data WHERE slug='teacher-gifts'), 'gifts for teachers', 'US', 0.8),

-- Mother's Day
((SELECT id FROM theme_data WHERE slug='mothers-day'), 'mothers day gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='mothers-day'), 'gifts for mom', 'US', 0.9),
((SELECT id FROM theme_data WHERE slug='mothers-day'), 'personalized gifts for mom', 'US', 0.7),

-- Father's Day
((SELECT id FROM theme_data WHERE slug='fathers-day'), 'fathers day gifts', 'US', 1.0),
((SELECT id FROM theme_data WHERE slug='fathers-day'), 'gifts for dad', 'US', 0.9),
((SELECT id FROM theme_data WHERE slug='fathers-day'), 'personalized gifts for dad', 'US', 0.7)

ON CONFLICT (theme_id, keyword, market) DO NOTHING;
