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
  // According to Shopify docs, we need to use specific field syntax for searches
  let formattedQuery = null
  if (searchQuery && searchQuery.trim()) {
    // Use Shopify's search syntax: title:*term* for partial matching
    // This searches for the term anywhere in the title field
    formattedQuery = `title:*${searchQuery.trim()}*`
  }

  console.log('🔍 Shopify search query:', {
    original: searchQuery,
    formatted: formattedQuery,
    shop: shop,
    typeOfQuery: typeof searchQuery,
    willFilter: !!searchQuery
  })

  // Fetch products with optional search query
  const variables = {
    first: 100, // Fetch more products to ensure we get all matches
    query: formattedQuery // Will be null if no search, or formatted query if searching
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

  // Apply client-side filtering as an additional layer
  // This ensures we catch products even if Shopify's search doesn't work perfectly
  if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase().trim()

    // Check if Shopify already filtered (if we got fewer than max products)
    const shopifyFiltered = products.length < 100

    // Always apply client-side filtering for better matching
    const filteredProducts = products.filter((product: any) => {
      // More flexible matching - check if any word in the search matches
      const searchWords = searchLower.split(/\s+/)
      const titleLower = product.title.toLowerCase()
      const descriptionLower = product.description?.toLowerCase() || ''

      // Check if ANY search word appears in title or description
      return searchWords.some(word =>
        titleLower.includes(word) || descriptionLower.includes(word)
      )
    })

    console.log('🔍 Client-side filtering:', {
      originalCount: products.length,
      filteredCount: filteredProducts.length,
      searchTerm: searchLower,
      searchWords: searchLower.split(/\s+/),
      shopifyFiltered,
      sampleTitles: products.slice(0, 3).map((p: any) => p.title)
    })

    // Use filtered results
    products = filteredProducts
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