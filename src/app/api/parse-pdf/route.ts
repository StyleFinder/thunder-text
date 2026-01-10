import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // M1: Require authentication for PDF parsing
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "File must be a PDF" }, { status: 400 });
    }

    // Convert to Uint8Array (required by unpdf)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF and extract text using unpdf
    const pdf = await getDocumentProxy(uint8Array);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    return NextResponse.json({
      success: true,
      text: text,
      pages: totalPages
    });
  } catch (error) {
    logger.error("PDF parsing error", error, { component: "parse-pdf-api" });
    const errorMessage = error instanceof Error ? error.message : "Failed to parse PDF";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
