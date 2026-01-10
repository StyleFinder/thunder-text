/**
 * Blog Linking Types
 *
 * Types for the blog post linking feature that allows users to attach
 * blog posts to product descriptions with a "Discover More" section.
 */

/**
 * Source of the blog - either from ThunderText Content Library or Shopify
 */
export type BlogSource = "library" | "shopify";

/**
 * A blog option displayed in the dropdown selector
 */
export interface BlogOption {
  id: string;
  title: string;
  excerpt?: string;
  createdAt: string;
  source: BlogSource;
  /** For Shopify blogs, the article handle for URL construction */
  handle?: string;
  /** For Shopify blogs, the blog handle (parent blog) */
  blogHandle?: string;
}

/**
 * A selected blog with full content for summary generation
 */
export interface BlogSelection {
  id: string;
  source: BlogSource;
  title: string;
  content: string;
  summary?: string;
  url?: string;
  /** For Shopify blogs */
  shopifyBlogId?: string;
  shopifyArticleId?: string;
  handle?: string;
  blogHandle?: string;
}

/**
 * The "Discover More" section data to be embedded in product description
 */
export interface DiscoverMoreSection {
  blogId: string;
  blogSource: BlogSource;
  title: string;
  summary: string;
  url: string;
}

/**
 * Database record linking a product to a blog post
 */
export interface ProductBlogLink {
  id: string;
  store_id: string;
  product_id: string;
  blog_id: string | null;
  shopify_blog_id: string | null;
  shopify_article_id: string | null;
  blog_source: BlogSource;
  blog_title: string;
  summary: string;
  blog_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Props for the BlogLinkingSection component
 */
export interface BlogLinkingSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedBlog: BlogSelection | null;
  onBlogSelect: (blog: BlogSelection | null) => void;
  summary: string;
  onSummaryChange: (summary: string) => void;
  storeId: string;
  shopDomain?: string;
  loading?: boolean;
}

/**
 * Props for the BlogSelector component
 */
export interface BlogSelectorProps {
  source: BlogSource;
  onSourceChange: (source: BlogSource) => void;
  blogs: BlogOption[];
  loading: boolean;
  selectedBlogId: string | null;
  onSelect: (blog: BlogOption | null) => void;
  onCreateNew: () => void;
  shopifyAvailable?: boolean;
}

/**
 * Props for the BlogCreationModal component
 */
export interface BlogCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlogCreated: (blog: BlogSelection) => void;
  storeId: string;
}

/**
 * Props for the BlogSummaryPreview component
 */
export interface BlogSummaryPreviewProps {
  blogTitle: string;
  blogSummary: string;
  blogUrl: string;
  onEditSummary?: (summary: string) => void;
  editable?: boolean;
}

/**
 * API Response types
 */
export interface FetchBlogsResponse {
  blogs: BlogOption[];
  totalCount: number;
}

export interface SummarizeBlogRequest {
  blogContent: string;
  maxSentences?: number;
}

export interface SummarizeBlogResponse {
  summary: string;
  wordCount: number;
}

/**
 * Generation parameters for blog creation (matches content center)
 */
export interface BlogGenerationParams {
  topic: string;
  wordCount: number;
  toneIntensity: number;
  ctaType: string;
  customCta?: string;
  additionalContext?: string;
}
