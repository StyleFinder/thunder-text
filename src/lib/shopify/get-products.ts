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

  const variables = {
    first: 20,
    query: searchQuery || null
  }

  const response = await client.request(query, variables)

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
}