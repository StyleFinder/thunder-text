import { NextRequest, NextResponse } from 'next/server'
import { createCorsHeaders, handleCorsPreflightRequest } from '@/lib/middleware/cors'
import { adminGraphQLClient } from '@/lib/shopify/admin-client'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = createCorsHeaders(request)
  const productId = params.id

  try {
    const body = await request.json()
    const { shop, updates } = body

    if (!shop || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📝 Updating product:', productId, updates)

    // Build the update mutation based on what fields are provided
    const updateFields = []

    if (updates.title) {
      updateFields.push(`title: "${updates.title.replace(/"/g, '\\"')}"`)
    }

    if (updates.description) {
      // Escape the description for GraphQL
      const escapedDescription = updates.description
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
      updateFields.push(`descriptionHtml: "${escapedDescription}"`)
    }

    // SEO fields are updated via metafields
    const metafieldsToUpdate = []

    if (updates.seoTitle) {
      metafieldsToUpdate.push({
        namespace: 'global',
        key: 'title_tag',
        value: updates.seoTitle,
        type: 'single_line_text_field'
      })
    }

    if (updates.seoDescription) {
      metafieldsToUpdate.push({
        namespace: 'global',
        key: 'description_tag',
        value: updates.seoDescription,
        type: 'multi_line_text_field'
      })
    }

    // Update basic product fields
    if (updateFields.length > 0) {
      const updateMutation = `
        mutation UpdateProduct($id: ID!) {
          productUpdate(input: {
            id: $id
            ${updateFields.join('\n            ')}
          }) {
            product {
              id
              title
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const updateResult = await adminGraphQLClient(shop).request(updateMutation, {
        id: `gid://shopify/Product/${productId}`
      })

      if (updateResult.productUpdate?.userErrors?.length > 0) {
        console.error('Product update errors:', updateResult.productUpdate.userErrors)
        return NextResponse.json(
          { error: 'Failed to update product', details: updateResult.productUpdate.userErrors },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Update metafields for SEO
    if (metafieldsToUpdate.length > 0) {
      for (const metafield of metafieldsToUpdate) {
        const metafieldMutation = `
          mutation CreateOrUpdateMetafield($id: ID!, $namespace: String!, $key: String!, $value: String!, $type: String!) {
            productUpdate(input: {
              id: $id
              metafields: [{
                namespace: $namespace
                key: $key
                value: $value
                type: $type
              }]
            }) {
              product {
                id
                metafields(first: 1, namespace: $namespace, keys: [$key]) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                    }
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `

        const metafieldResult = await adminGraphQLClient(shop).request(metafieldMutation, {
          id: `gid://shopify/Product/${productId}`,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
          type: metafield.type
        })

        if (metafieldResult.productUpdate?.userErrors?.length > 0) {
          console.error('Metafield update errors:', metafieldResult.productUpdate.userErrors)
        }
      }
    }

    // If bullet points are provided, store them as a metafield
    if (updates.bulletPoints && Array.isArray(updates.bulletPoints)) {
      const bulletPointsMutation = `
        mutation UpdateBulletPoints($id: ID!, $value: String!) {
          productUpdate(input: {
            id: $id
            metafields: [{
              namespace: "thunder_text"
              key: "bullet_points"
              value: $value
              type: "json"
            }]
          }) {
            product {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      await adminGraphQLClient(shop).request(bulletPointsMutation, {
        id: `gid://shopify/Product/${productId}`,
        value: JSON.stringify(updates.bulletPoints)
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Product updated successfully',
        productId
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}