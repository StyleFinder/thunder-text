import { GraphQLClient } from "graphql-request";
import { logger } from "@/lib/logger";

// GraphQL response types
interface ShopifyProductEdge {
  node: {
    id: string;
    title: string;
    handle: string;
    description: string;
    status: string;
    images: {
      edges: Array<{
        node: {
          url: string;
          altText?: string;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          price: string;
        };
      }>;
    };
  };
}

interface ShopifyProductsResponse {
  products: {
    edges: ShopifyProductEdge[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

/**
 * Simple function to get products directly from Shopify
 * Uses the access token stored after app installation
 */
export async function getProducts(
  shop: string,
  accessToken: string,
  searchQuery?: string,
) {
  const client = new GraphQLClient(
    `https://${shop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    },
  );

  // Modified query to fetch more products when searching
  // to ensure we don't miss products due to pagination
  // Sorted by CREATED_AT descending (most recent first)
  const query = `
    query getProducts($first: Int!, $query: String) {
      products(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
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
  `;

  // Format search query for better matching
  // According to Shopify docs, we need to use specific field syntax for searches
  let formattedQuery = null;
  if (searchQuery && searchQuery.trim()) {
    // Use Shopify's search syntax: title:*term* for partial matching
    // This searches for the term anywhere in the title field
    formattedQuery = `title:*${searchQuery.trim()}*`;
  }

  // Fetch products with optional search query
  const variables = {
    first: 100, // Fetch more products to ensure we get all matches
    query: formattedQuery, // Will be null if no search, or formatted query if searching
  };

  try {
    const response = await client.request<ShopifyProductsResponse>(
      query,
      variables,
    );

    // Transform to simpler format
    const imageEdges = (edge: ShopifyProductEdge) =>
      edge.node.images?.edges || [];
    let products = response.products.edges.map((edge: ShopifyProductEdge) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      description: edge.node.description || "",
      status: edge.node.status || "ACTIVE",
      price: edge.node.variants?.edges[0]?.node?.price || "0.00",
      images: imageEdges(edge).map((imgEdge) => ({
        url: imgEdge.node.url,
        altText: imgEdge.node.altText,
      })),
      featuredImage: imageEdges(edge)[0]
        ? {
            url: imageEdges(edge)[0].node.url,
            altText: imageEdges(edge)[0].node.altText,
          }
        : null,
    }));

    // Apply client-side filtering as an additional layer
    // This ensures we catch products even if Shopify's search doesn't work perfectly
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();

      // Always apply client-side filtering for better matching
      const filteredProducts = products.filter((product) => {
        // More flexible matching - check if any word in the search matches
        const searchWords = searchLower.split(/\s+/);
        const titleLower = product.title.toLowerCase();
        const descriptionLower = product.description?.toLowerCase() || "";

        // Check if ANY search word appears in title or description
        return searchWords.some(
          (word) =>
            titleLower.includes(word) || descriptionLower.includes(word),
        );
      });

      // Use filtered results
      products = filteredProducts;
    }

    return {
      products,
      pageInfo: response.products.pageInfo,
    };
  } catch (error) {
    logger.error("🔴 Shopify GraphQL Error:", error as Error, {
      component: "get-products",
    });
    throw error;
  }
}
