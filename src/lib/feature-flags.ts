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
 * Feature flag for video generation (Product Animator)
 */
export function isVideoGenerationEnabled(): boolean {
  return isExperimentalFeaturesEnabled() || isDevelopment();
}

/**
 * Feature flag for image generation
 */
export function isImageGenerationEnabled(): boolean {
  return isExperimentalFeaturesEnabled() || isDevelopment();
}
