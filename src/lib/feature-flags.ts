/**
 * Feature Flags
 *
 * Controls feature availability based on environment.
 * Features can be enabled/disabled via environment variables.
 */

/**
 * Check if experimental features are enabled.
 * These include image generation, video generation, etc.
 *
 * Enable by setting NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES=true
 */
export function isExperimentalFeaturesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES === "true";
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if user has admin role
 * Used to gate admin-only features like Product Animator, Image Generation, etc.
 */
export function isAdminUser(userRole?: string | null): boolean {
  return userRole === "admin";
}

/**
 * Feature flag for video generation (Product Animator)
 * Requires admin role in addition to experimental features being enabled
 */
export function isVideoGenerationEnabled(userRole?: string | null): boolean {
  const featureEnabled = isExperimentalFeaturesEnabled() || isDevelopment();
  return featureEnabled && isAdminUser(userRole);
}

/**
 * Feature flag for image generation
 * Requires admin role in addition to experimental features being enabled
 */
export function isImageGenerationEnabled(userRole?: string | null): boolean {
  const featureEnabled = isExperimentalFeaturesEnabled() || isDevelopment();
  return featureEnabled && isAdminUser(userRole);
}
