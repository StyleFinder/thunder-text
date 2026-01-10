/**
 * Shopify Blogs API
 *
 * Fetches blog articles from Shopify's GraphQL Admin API.
 * Used for the "Import from Shopify" feature in blog linking.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { getShopToken } from "@/lib/shopify/token-manager";
import { logger } from "@/lib/logger";
import type { BlogOption } from "@/types/blog-linking";

const SHOPIFY_API_VERSION = "2025-01";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";

    if (!shop) {
      return NextResponse.json(
        { error: "Missing shop parameter" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get access token for the shop
    const tokenResult = await getShopToken(shop);

    if (!tokenResult.success || !tokenResult.accessToken) {
      logger.warn("No access token found for shop", {
        component: "shopify-blogs",
        shop,
      });
      return NextResponse.json(
        {
          error: "Shop not connected",
          details: "Please connect your Shopify store to access blogs",
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const accessToken = tokenResult.accessToken;
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // Fetch blog articles from Shopify GraphQL API
    // In Shopify Admin API, we need to query blogs first, then get articles from each blog
    // Note: articles field doesn't support sortKey, and content field is "body" not "contentHtml"
    const query = `
      query GetBlogs($first: Int!) {
        blogs(first: 10) {
          edges {
            node {
              id
              handle
              title
              articles(first: $first, reverse: true) {
                edges {
                  node {
                    id
                    title
                    handle
                    publishedAt
                    body
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(
      `https://${fullShopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            first: Math.min(limit, 50),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Shopify API error", undefined, {
        component: "shopify-blogs",
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch blogs from Shopify" },
        { status: response.status, headers: corsHeaders }
      );
    }

    const result = await response.json();

    // Debug logging to understand Shopify response
    logger.info("Shopify blogs API response", {
      component: "shopify-blogs",
      shop: fullShopDomain,
      hasData: !!result.data,
      hasErrors: !!result.errors,
      blogsCount: result.data?.blogs?.edges?.length || 0,
    });

    if (result.errors) {
      const errorMessages = result.errors.map((e: { message: string }) => e.message).join(", ");

      logger.warn("Shopify GraphQL errors - returning empty list for graceful degradation", {
        component: "shopify-blogs",
        errors: JSON.stringify(result.errors),
        shop: fullShopDomain,
      });

      // Always return empty list for any Shopify blog errors
      // This provides graceful degradation - user can still use Content Library
      // Common errors include: missing scopes, API version issues, store configuration
      return NextResponse.json(
        {
          success: true,
          data: {
            blogs: [],
            totalCount: 0,
          },
          warning: `Unable to fetch Shopify blogs: ${errorMessages}. Use Content Library instead.`,
        },
        { headers: corsHeaders }
      );
    }

    // Transform Shopify blog articles to BlogOption format
    // Flatten articles from all blogs into a single list
    const allArticles: BlogOption[] = [];

    // Check if there are any blogs
    if (!result.data?.blogs?.edges || result.data.blogs.edges.length === 0) {
      logger.info("No blogs found for shop", {
        component: "shopify-blogs",
        shop: fullShopDomain,
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            blogs: [],
            totalCount: 0,
          },
        },
        { headers: corsHeaders }
      );
    }

    for (const blogEdge of result.data?.blogs?.edges || []) {
      const blog = blogEdge.node;
      const blogHandle = blog.handle || "news";

      for (const articleEdge of blog.articles?.edges || []) {
        const article = articleEdge.node;

        // Extract numeric ID from GID
        const articleId = article.id.replace("gid://shopify/Article/", "");

        // Create a short excerpt from the content (strip HTML, take first 150 chars)
        const plainTextContent = (article.body || "")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const excerpt =
          plainTextContent.length > 150
            ? plainTextContent.substring(0, 150) + "..."
            : plainTextContent;

        // Apply search filter if provided
        if (search) {
          const searchLower = search.toLowerCase();
          if (!article.title.toLowerCase().includes(searchLower) &&
              !plainTextContent.toLowerCase().includes(searchLower)) {
            continue; // Skip articles that don't match search
          }
        }

        allArticles.push({
          id: articleId,
          title: article.title,
          excerpt,
          createdAt: article.publishedAt,
          source: "shopify" as const,
          handle: article.handle,
          blogHandle: blogHandle,
        });
      }
    }

    // Sort by date (most recent first) and limit results
    const blogs: BlogOption[] = allArticles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    logger.info("Fetched Shopify blogs", {
      component: "shopify-blogs",
      shop: fullShopDomain,
      count: blogs.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          blogs,
          totalCount: blogs.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Error fetching Shopify blogs", error as Error, {
      component: "shopify-blogs",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get full article content for summary generation
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    const { shop, articleId } = body;

    if (!shop || !articleId) {
      return NextResponse.json(
        { error: "Missing shop or articleId parameter" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get access token for the shop
    const tokenResult = await getShopToken(shop);

    if (!tokenResult.success || !tokenResult.accessToken) {
      return NextResponse.json(
        { error: "Shop not connected" },
        { status: 401, headers: corsHeaders }
      );
    }

    const accessToken = tokenResult.accessToken;
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // Format article ID as GID if needed
    const articleGid = articleId.startsWith("gid://")
      ? articleId
      : `gid://shopify/Article/${articleId}`;

    const query = `
      query GetArticle($id: ID!) {
        article(id: $id) {
          id
          title
          handle
          body
          blog {
            handle
          }
        }
      }
    `;

    const response = await fetch(
      `https://${fullShopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { id: articleGid },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch article from Shopify" },
        { status: response.status, headers: corsHeaders }
      );
    }

    const result = await response.json();

    if (result.errors || !result.data?.article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const article = result.data.article;

    // Convert HTML to plain text for summary generation
    const plainTextContent = (article.body || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json(
      {
        id: articleId,
        title: article.title,
        content: plainTextContent,
        handle: article.handle,
        blogHandle: article.blog?.handle || "news",
        source: "shopify",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Error fetching Shopify article", error as Error, {
      component: "shopify-blogs",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
