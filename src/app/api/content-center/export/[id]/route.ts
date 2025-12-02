import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth/content-center-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/logger'

type ExportFormat = 'txt' | 'html' | 'md'

/**
 * GET /api/content-center/export/[id]?format=txt|html|md
 * Export content in specified format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: contentId } = await params
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'txt') as ExportFormat

    // Validate format
    if (!['txt', 'html', 'md'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be txt, html, or md' },
        { status: 400 }
      )
    }

    // Fetch content
    const { data: content, error } = await supabaseAdmin
      .from('generated_content')
      .select('*')
      .eq('id', contentId)
      .eq('store_id', userId)
      .single()

    if (error || !content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // Convert content to requested format
    const exportedContent = convertToFormat(content.generated_text, format)
    const mimeType = getMimeType(format)
    const filename = `${content.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${format}`

    // Return as downloadable file
    return new NextResponse(exportedContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportedContent).toString()
      }
    })

  } catch (error) {
    logger.error('Error in GET /api/content-center/export:', error as Error, { component: '[id]' })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Convert HTML content to specified format
 */
function convertToFormat(htmlContent: string, format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return htmlToPlainText(htmlContent)

    case 'html':
      return wrapInHtmlDocument(htmlContent)

    case 'md':
      return htmlToMarkdown(htmlContent)

    default:
      return htmlContent
  }
}

/**
 * Convert HTML to plain text
 */
function htmlToPlainText(html: string): string {
  let text = html

  // Replace block elements with newlines
  text = text.replace(/<\/?(h[1-6]|p|div|br|li)>/gi, '\n')
  text = text.replace(/<\/ul>|<\/ol>/gi, '\n\n')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
  text = text.replace(/[ \t]+/g, ' ') // Normalize spaces
  text = text.trim()

  return text
}

/**
 * Wrap content in full HTML document
 */
function wrapInHtmlDocument(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Content</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p { margin-bottom: 16px; }
    ul, ol { margin-bottom: 16px; padding-left: 2em; }
    li { margin-bottom: 8px; }
    blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: #6a737d;
      border-left: 4px solid #dfe2e5;
    }
    code {
      background-color: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    strong { font-weight: 600; }
    em { font-style: italic; }
  </style>
</head>
<body>
${content}
</body>
</html>`
}

/**
 * Convert HTML to Markdown
 */
function htmlToMarkdown(html: string): string {
  let markdown = html

  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

  // Bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Lists
  markdown = markdown.replace(/<ul[^>]*>/gi, '')
  markdown = markdown.replace(/<\/ul>/gi, '\n')
  markdown = markdown.replace(/<ol[^>]*>/gi, '')
  markdown = markdown.replace(/<\/ol>/gi, '\n')
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')

  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
    return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
  })

  // Code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n')

  // Paragraphs and breaks
  markdown = markdown.replace(/<p[^>]*>/gi, '')
  markdown = markdown.replace(/<\/p>/gi, '\n\n')
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n')

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n')
  markdown = markdown.trim()

  return markdown
}

/**
 * Get MIME type for format
 */
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'html':
      return 'text/html; charset=utf-8'
    case 'md':
      return 'text/markdown; charset=utf-8'
    default:
      return 'text/plain; charset=utf-8'
  }
}
