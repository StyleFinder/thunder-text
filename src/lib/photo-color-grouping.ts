/**
 * Photo Color Grouping Utilities
 *
 * Handles grouping product photos by color for variant creation
 */

import type { PhotoWithColor } from '@/app/components/ProductPhotoUploader'

export interface ColorVariantGroup {
  color: string
  photos: PhotoWithColor[]
  primaryPhoto: PhotoWithColor  // First photo becomes primary
  additionalPhotos: PhotoWithColor[]  // Rest are additional angles
}

/**
 * Group photos by their assigned colors
 * First photo of each color becomes the primary variant image
 */
export function groupPhotosByColor(photos: PhotoWithColor[]): ColorVariantGroup[] {
  // Filter out photos without color assignment
  const photosWithColor = photos.filter(p => p.color && p.color.trim() !== '')

  // Group by color
  const colorMap = new Map<string, PhotoWithColor[]>()

  photosWithColor.forEach(photo => {
    const color = photo.color.trim()
    if (!colorMap.has(color)) {
      colorMap.set(color, [])
    }
    colorMap.get(color)!.push(photo)
  })

  // Convert to ColorVariantGroup array
  const groups: ColorVariantGroup[] = []

  colorMap.forEach((photoList, color) => {
    const [primaryPhoto, ...additionalPhotos] = photoList

    groups.push({
      color,
      photos: photoList,
      primaryPhoto,
      additionalPhotos
    })
  })

  return groups
}

/**
 * Validate that all photos have color assignments
 */
export function validatePhotoColors(photos: PhotoWithColor[]): {
  valid: boolean
  errors: string[]
  unassignedCount: number
} {
  const errors: string[] = []
  const unassignedPhotos = photos.filter(p => !p.color || p.color.trim() === '')

  if (unassignedPhotos.length > 0) {
    errors.push(`${unassignedPhotos.length} photo(s) do not have color assignments`)
  }

  return {
    valid: errors.length === 0,
    errors,
    unassignedCount: unassignedPhotos.length
  }
}

/**
 * Convert photo groups to format needed for Shopify product creation
 */
export interface ShopifyVariantData {
  color: string
  images: Array<{
    dataUrl: string
    name: string
    altText: string
  }>
  isPrimary: boolean  // First variant in the list
}

export async function convertToShopifyVariantData(
  groups: ColorVariantGroup[],
  productTitle: string
): Promise<ShopifyVariantData[]> {
  const variantData: ShopifyVariantData[] = []

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const images = await Promise.all(
      group.photos.map(async (photo) => {
        return new Promise<{ dataUrl: string; name: string; altText: string }>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              dataUrl: reader.result as string,
              name: photo.file.name,
              altText: `${productTitle} - ${group.color}`
            })
          }
          reader.readAsDataURL(photo.file)
        })
      })
    )

    variantData.push({
      color: group.color,
      images,
      isPrimary: i === 0  // First color group is primary
    })
  }

  return variantData
}

/**
 * Get a summary of color variants for display
 */
export function getColorVariantSummary(photos: PhotoWithColor[]): {
  totalPhotos: number
  totalColors: number
  colorCounts: Record<string, number>
  unassignedCount: number
} {
  const groups = groupPhotosByColor(photos)
  const unassignedCount = photos.filter(p => !p.color || p.color.trim() === '').length

  const colorCounts: Record<string, number> = {}
  groups.forEach(group => {
    colorCounts[group.color] = group.photos.length
  })

  return {
    totalPhotos: photos.length,
    totalColors: groups.length,
    colorCounts,
    unassignedCount
  }
}
