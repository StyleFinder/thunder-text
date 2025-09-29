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

  // Modified query to fetch more products when searching
  // to ensure we don't miss products due to pagination
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
  // According to Shopify docs, plain text search is case-insensitive across multiple fields
  let formattedQuery = null
  if (searchQuery && searchQuery.trim()) {
    // Try with wildcards for partial matching
    // This should help match "chic" to "Chic Black Sleeveless Tie-Front Top"
    formattedQuery = `*${searchQuery.trim()}*`
  }

  console.log('🔍 Shopify search query:', {
    original: searchQuery,
    formatted: formattedQuery,
    shop: shop
  })

  // Increase the number of products fetched when searching
  // to ensure we get all matching products
  const variables = {
    first: searchQuery ? 50 : 20,
    query: formattedQuery
  }

  try {
    const response = await client.request(query, variables)

    console.log('🔍 Shopify API response:', {
      productsFound: response.products?.edges?.length || 0,
      hasNextPage: response.products?.pageInfo?.hasNextPage,
      searchQuery: searchQuery || 'none',
      formattedQuery: formattedQuery || 'none',
      firstProduct: response.products?.edges?.[0]?.node?.title || 'none',
      allTitles: response.products?.edges?.map((edge: any) => edge.node.title) || []
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