/**
 * Blog Linking Components
 *
 * Shared components for linking blog posts to product descriptions.
 * Used in both Create PD and Enhance modules.
 */

export { BlogLinkingSection } from "./BlogLinkingSection";
export { BlogSelector } from "./BlogSelector";
export { BlogCreationModal } from "./BlogCreationModal";
export { BlogSummaryPreview } from "./BlogSummaryPreview";

// Re-export types for convenience
export type {
  BlogLinkingSectionProps,
  BlogSelectorProps,
  BlogCreationModalProps,
  BlogSummaryPreviewProps,
  BlogOption,
  BlogSelection,
  BlogSource,
  DiscoverMoreSection,
} from "@/types/blog-linking";
