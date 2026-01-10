import OpenAI from "openai";
import { logger } from "@/lib/logger";
import {
  ContentExtractionResult,
  FileFormat,
  AgentContext,
} from "../../../../types/best-practices";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ContentExtractionAgent {
  /**
   * Extract content from various input sources
   */
  async extract(context: AgentContext): Promise<ContentExtractionResult> {
    const { source_type, original_input } = context;

    switch (source_type) {
      case "file":
        return this.extractFromFile(original_input.file!);
      case "url":
        return this.extractFromURL(original_input.url!);
      case "text":
        return this.extractFromText(
          original_input.text!,
          original_input.title,
          original_input.description,
        );
      default:
        throw new Error(`Unsupported source type: ${source_type}`);
    }
  }

  /**
   * Extract content from uploaded file
   */
  private async extractFromFile(file: File): Promise<ContentExtractionResult> {
    const fileType = this.detectFileType(file);

    switch (fileType) {
      case "audio":
        return this.extractFromAudio(file);
      case "pdf":
        return this.extractFromPDF(file);
      case "text":
      case "markdown":
        return this.extractFromTextFile(file);
      case "image":
        return this.extractFromImage(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Transcribe audio file using Whisper
   */
  private async extractFromAudio(file: File): Promise<ContentExtractionResult> {
    try {
      // Convert File to format OpenAI expects
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
      });

      const text = transcription.text;
      const wordCount = text.split(/\s+/).length;

      return {
        extracted_text: text,
        file_format: "audio",
        word_count: wordCount,
        has_images: false,
        has_tables: false,
        raw_metadata: {
          duration: (transcription as any).duration,
          language: (transcription as any).language,
        },
        extraction_method: "whisper",
        confidence_score: 0.95, // Whisper is highly accurate
      };
    } catch (error) {
      logger.error(
        "[ContentExtractionAgent] Audio transcription failed:",
        error as Error,
        { component: "content-extraction" },
      );
      throw new Error(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(file: File): Promise<ContentExtractionResult> {
    try {
      // For now, return a placeholder - PDF extraction requires pdf-parse package
      // TODO: Install pdf-parse and implement proper PDF extraction
      const arrayBuffer = await file.arrayBuffer();
      const _buffer = Buffer.from(arrayBuffer);

      // Placeholder - will be replaced with actual pdf-parse implementation
      const text = `[PDF extraction not yet implemented for ${file.name}]`;
      const wordCount = 0;

      return {
        extracted_text: text,
        file_format: "pdf",
        word_count: wordCount,
        has_images: false, // Will detect with pdf-parse
        has_tables: false, // Will detect with pdf-parse
        extraction_method: "pdf-parse",
        confidence_score: 0.7,
      };
    } catch (error) {
      logger.error(
        "[ContentExtractionAgent] PDF extraction failed:",
        error as Error,
        { component: "content-extraction" },
      );
      throw new Error(
        `Failed to extract PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract text from text/markdown file
   */
  private async extractFromTextFile(
    file: File,
  ): Promise<ContentExtractionResult> {
    try {
      const text = await file.text();
      const wordCount = text.split(/\s+/).length;

      return {
        extracted_text: text,
        file_format: file.type.includes("markdown") ? "markdown" : "text",
        word_count: wordCount,
        has_images: false,
        has_tables: false,
        extraction_method: "direct",
        confidence_score: 1.0,
      };
    } catch (error) {
      logger.error(
        "[ContentExtractionAgent] Text file reading failed:",
        error as Error,
        { component: "content-extraction" },
      );
      throw new Error(
        `Failed to read text file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract text from image using OCR (Vision API)
   */
  private async extractFromImage(file: File): Promise<ContentExtractionResult> {
    try {
      // Convert image to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Use GPT-4 Vision to extract text and structure
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an OCR assistant. Extract all text from the image and describe any visual elements that provide context for advertising best practices.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text and describe the visual elements in this image. If it contains advertising best practices, screenshots, or examples, describe them in detail.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const text = response.choices[0].message.content || "";
      const wordCount = text.split(/\s+/).length;

      return {
        extracted_text: text,
        file_format: "image",
        word_count: wordCount,
        has_images: true,
        has_tables: false,
        extraction_method: "whisper", // Using OpenAI API
        confidence_score: 0.85,
      };
    } catch (error) {
      logger.error(
        "[ContentExtractionAgent] Image extraction failed:",
        error as Error,
        { component: "content-extraction" },
      );
      throw new Error(
        `Failed to extract from image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract content from URL
   */
  private async extractFromURL(url: string): Promise<ContentExtractionResult> {
    try {
      // Fetch the URL
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIE-BestPractices/1.0; +https://yourapp.com)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle different content types
      if (contentType.includes("text/html")) {
        const html = await response.text();
        return this.extractFromHTML(html, url);
      } else if (contentType.includes("application/pdf")) {
        // Download and process PDF
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const file = new File([blob], "downloaded.pdf", {
          type: "application/pdf",
        });
        return this.extractFromPDF(file);
      } else if (contentType.includes("text/")) {
        const text = await response.text();
        return {
          extracted_text: text,
          file_format: "text",
          word_count: text.split(/\s+/).length,
          has_images: false,
          has_tables: false,
          extraction_method: "direct",
          confidence_score: 1.0,
        };
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      logger.error(
        "[ContentExtractionAgent] URL extraction failed:",
        error as Error,
        { component: "content-extraction" },
      );
      throw new Error(
        `Failed to extract from URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Extract content from HTML
   */
  private extractFromHTML(html: string, url: string): ContentExtractionResult {
    // Simple HTML to text extraction (can be enhanced with jsdom or cheerio)
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    const wordCount = text.split(/\s+/).length;
    const hasImages = html.includes("<img");
    const hasTables = html.includes("<table");

    return {
      extracted_text: text,
      file_format: "text",
      word_count: wordCount,
      has_images: hasImages,
      has_tables: hasTables,
      raw_metadata: { source_url: url },
      extraction_method: "html-parse",
      confidence_score: 0.8,
    };
  }

  /**
   * Extract from raw text input
   */
  private extractFromText(
    text: string,
    title?: string,
    description?: string,
  ): ContentExtractionResult {
    // Combine title, description, and text
    const fullText = [title, description, text].filter(Boolean).join("\n\n");
    const wordCount = fullText.split(/\s+/).length;

    return {
      extracted_text: fullText,
      file_format: "text",
      word_count: wordCount,
      has_images: false,
      has_tables: false,
      extraction_method: "direct",
      confidence_score: 1.0,
    };
  }

  /**
   * Detect file type from File object
   */
  private detectFileType(file: File): FileFormat {
    const mimeType = file.type;
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (mimeType === "application/pdf" || extension === "pdf") {
      return "pdf";
    }

    if (
      mimeType.startsWith("audio/") ||
      ["mp3", "wav", "m4a", "aac"].includes(extension || "")
    ) {
      return "audio";
    }

    if (
      mimeType.startsWith("video/") ||
      ["mp4", "mov", "avi"].includes(extension || "")
    ) {
      return "video";
    }

    if (
      mimeType.startsWith("image/") ||
      ["jpg", "jpeg", "png", "webp"].includes(extension || "")
    ) {
      return "image";
    }

    if (
      mimeType === "text/markdown" ||
      extension === "md" ||
      extension === "markdown"
    ) {
      return "markdown";
    }

    if (mimeType.startsWith("text/") || extension === "txt") {
      return "text";
    }

    if (mimeType === "application/json" || extension === "json") {
      return "json";
    }

    throw new Error(`Unable to detect file type for: ${file.name}`);
  }
}
