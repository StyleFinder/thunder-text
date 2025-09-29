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
    // Use plain text search without wildcards
    // Shopify should handle partial matching automatically
    formattedQuery = searchQuery.trim()
  }

  console.log('🔍 Shopify search query:', {
    original: searchQuery,
    formatted: formattedQuery,
    shop: shop
  })

  // When not searching, fetch all products; when searching, let Shopify filter
  const variables = {
    first: 100, // Always fetch more products
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
  let products = response.products.edges.map((edge: any) => ({
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

  // If we have a search query and Shopify didn't filter properly,
  // apply client-side filtering as a fallback
  if (searchQuery && searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase().trim()
    const filteredProducts = products.filter((product: any) => {
      const titleMatch = product.title.toLowerCase().includes(searchLower)
      const descriptionMatch = product.description?.toLowerCase().includes(searchLower)
      return titleMatch || descriptionMatch
    })

    console.log('🔍 Client-side filtering:', {
      originalCount: products.length,
      filteredCount: filteredProducts.length,
      searchTerm: searchLower
    })

    // Only use client-side filtering if it reduces the results
    // (meaning Shopify didn't filter at all)
    if (filteredProducts.length < products.length) {
      products = filteredProducts
    }
  }

  return {
    products,
    pageInfo: response.products.pageInfo
  }
  } catch (error) {
    console.error('🔴 Shopify GraphQL Error:', error)
    throw error
  }
}