import { GraphQLClient } from 'graphql-request'

export class ShopifyAPI {
  private client: GraphQLClient
  private shopDomain: string
  private accessToken: string

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain
    this.accessToken = accessToken
    this.client = new GraphQLClient(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  async getProducts(first: number = 10, cursor?: string) {
    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                  }
                }
              }
              metafields(first: 20) {
                edges {
                  node {
                    id
                    key
                    value
                    namespace
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

    return this.client.request(query, {
      first,
      after: cursor,
    })
  }

  async updateProduct(productId: string, input: any) {
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            description
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    return this.client.request(mutation, {
      input: {
        id: productId,
        ...input,
      },
    })
  }

  async createProductMetafield(productId: string, metafield: any) {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    return this.client.request(mutation, {
      metafields: [{
        ownerId: productId,
        ...metafield,
      }],
    })
  }
}

// OAuth helper functions
export const getShopifyOAuthUrl = (shop: string) => {
  const scopes = process.env.SHOPIFY_SCOPES
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/shopify/callback`
  
  return `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${redirectUri}&state=${shop}`
}

export const exchangeCodeForToken = async (shop: string, code: string) => {
  const response = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}