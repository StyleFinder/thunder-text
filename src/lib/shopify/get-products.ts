import { GraphQLClient } from 'graphql-request'

/**
 * Simple function to get products directly from Shopify
 * Uses the access token stored after app installation
 */
export async function getProducts(shop: string, accessToken: string, searchQuery?: string) {
  const client = new GraphQLClient(
    `https://${shop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  )

  const query = `
    query getProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            status
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  // Format search query for better matching
  // Shopify's default search should handle partial matching in titles
  // For "chic" to match "Chic Black Sleeveless Tie-Front Top"
  let formattedQuery = null
  if (searchQuery && searchQuery.trim()) {
    // Use plain text search which searches across multiple fields
    // Shopify handles case-insensitive matching automatically
    formattedQuery = searchQuery.trim()
  }

  console.log('🔍 Shopify search query:', {
    original: searchQuery,
    formatted: formattedQuery
  })

  const variables = {
    first: 20,
    query: formattedQuery
  }

  try {
    const response = await client.request(query, variables)

    console.log('🔍 Shopify API response:', {
      productsFound: response.products?.edges?.length || 0,
      hasNextPage: response.products?.pageInfo?.hasNextPage,
      firstProduct: response.products?.edges?.[0]?.node?.title || 'none'
    })

  // Transform to simpler format
  const products = response.products.edges.map((edge: any) => ({
    id: edge.node.id,
    title: edge.node.title,
    handle: edge.node.handle,
    description: edge.node.description || '',
    status: edge.node.status?.toLowerCase() || 'active',
    price: edge.node.variants?.edges[0]?.node?.price || '0.00',
    images: edge.node.images?.edges?.map((imgEdge: any) => ({
      url: imgEdge.node.url,
      altText: imgEdge.node.altText
    })) || [],
  }))

  return {
    products,
    pageInfo: response.products.pageInfo
  }
  } catch (error) {
    console.error('🔴 Shopify GraphQL Error:', error)
    throw error
  }
}