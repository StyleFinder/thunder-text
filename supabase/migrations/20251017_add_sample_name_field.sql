-- Add sample_name field to content_samples table
-- This allows users to give descriptive names to their uploaded samples

ALTER TABLE public.content_samples
ADD COLUMN IF NOT EXISTS sample_name VARCHAR(255);

-- Update existing samples with default names based on type
UPDATE public.content_samples
SET sample_name = CASE
  WHEN sample_type = 'blog' THEN 'Blog Post Sample'
  WHEN sample_type = 'email' THEN 'Email Sample'
  WHEN sample_type = 'description' THEN 'Product Description Sample'
  ELSE 'Writing Sample'
END
WHERE sample_name IS NULL;
