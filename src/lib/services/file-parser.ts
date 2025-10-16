/**
 * File Parser Service
 * Extracts text content from various file formats (.txt, .doc, .docx, .pdf)
 */

interface ParseResult {
  text: string
  wordCount: number
  error?: string
}

/**
 * Parse text from uploaded file
 * Currently supports .txt files in browser
 * .doc, .docx, and .pdf will be handled server-side via API in future iterations
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase()

  // Validate file type
  if (fileName.endsWith('.txt')) {
    return parseTxtFile(file)
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return {
      text: '',
      wordCount: 0,
      error: 'Microsoft Word files (.doc, .docx) parsing coming soon. Please use .txt or .pdf for now, or copy/paste your content.'
    }
  } else if (fileName.endsWith('.pdf')) {
    return {
      text: '',
      wordCount: 0,
      error: 'PDF parsing coming soon. Please use .txt for now, or copy/paste your content.'
    }
  } else {
    return {
      text: '',
      wordCount: 0,
      error: 'Unsupported file type. Please upload a .txt, .doc, .docx, or .pdf file.'
    }
  }
}

/**
 * Parse .txt file (browser-side)
 */
async function parseTxtFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target?.result as string || ''
      const wordCount = countWords(text)

      resolve({
        text,
        wordCount
      })
    }

    reader.onerror = () => {
      resolve({
        text: '',
        wordCount: 0,
        error: 'Failed to read file. Please try again.'
      })
    }

    reader.readAsText(file)
  })
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size must be less than 5MB'
    }
  }

  // Check file type
  const fileName = file.name.toLowerCase()
  const validExtensions = ['.txt', '.doc', '.docx', '.pdf']
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Please upload a .txt, .doc, .docx, or .pdf file'
    }
  }

  return { valid: true }
}

/**
 * Server-side file parsing (for .doc, .docx, .pdf)
 * This will be implemented when we add server-side file upload endpoint
 */
export async function parseFileServerSide(fileBuffer: Buffer, mimeType: string): Promise<ParseResult> {
  // TODO: Implement server-side parsing using libraries like:
  // - mammoth for .docx
  // - pdf-parse for .pdf
  // - textract for .doc

  return {
    text: '',
    wordCount: 0,
    error: 'Server-side parsing not yet implemented'
  }
}
