import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/ace-compat';
import { BestPracticesOrchestrator } from '@/lib/aie/best-practices/orchestrator';
import { ProcessBestPracticeRequest } from '@/types/best-practices';
import { logger } from '@/lib/logger'

/**
 * POST /api/best-practices/process
 * Process a new best practice through the agent workflow
 */
export const POST = requireAuth('user')(async (request: NextRequest) => {
  try {
    const contentType = request.headers.get('content-type') || '';

    let processRequest: ProcessBestPracticeRequest;

    // Handle multipart/form-data (file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const file = formData.get('file') as File | null;
      const url = formData.get('url') as string | null;
      const text = formData.get('text') as string | null;

      // Determine source type
      let source_type: 'file' | 'url' | 'text';
      if (file) {
        source_type = 'file';
      } else if (url) {
        source_type = 'url';
      } else if (text) {
        source_type = 'text';
      } else {
        return NextResponse.json(
          { error: 'Must provide file, url, or text' },
          { status: 400 }
        );
      }

      processRequest = {
        source_type,
        file: file || undefined,
        url: url || undefined,
        text: text || undefined,
        platform: (formData.get('platform') as any) || undefined,
        category: (formData.get('category') as string) || undefined,
        goal: (formData.get('goal') as any) || undefined,
        title: (formData.get('title') as string) || undefined,
        description: (formData.get('description') as string) || undefined,
        source_name: (formData.get('source_name') as string) || undefined,
        source_url: (formData.get('source_url') as string) || undefined,
        tags: formData.get('tags')
          ? JSON.parse(formData.get('tags') as string)
          : undefined,
        priority_override: formData.get('priority_override')
          ? parseFloat(formData.get('priority_override') as string)
          : undefined,
        skip_quality_check:
          formData.get('skip_quality_check') === 'true' || false,
        skip_duplicate_check:
          formData.get('skip_duplicate_check') === 'true' || false,
      };
    }
    // Handle application/json
    else if (contentType.includes('application/json')) {
      const body = await request.json();
      processRequest = body;

      // Validate required fields
      if (!processRequest.source_type) {
        return NextResponse.json(
          { error: 'source_type is required' },
          { status: 400 }
        );
      }

      // Validate source-specific fields
      if (
        processRequest.source_type === 'file' &&
        !processRequest.file
      ) {
        return NextResponse.json(
          { error: 'file is required for source_type=file' },
          { status: 400 }
        );
      }

      if (processRequest.source_type === 'url' && !processRequest.url) {
        return NextResponse.json(
          { error: 'url is required for source_type=url' },
          { status: 400 }
        );
      }

      if (
        processRequest.source_type === 'text' &&
        !processRequest.text
      ) {
        return NextResponse.json(
          { error: 'text is required for source_type=text' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 400 }
      );
    }

    // Initialize orchestrator
    const orchestrator = new BestPracticesOrchestrator();

    // Process the request
    const result = await orchestrator.process(processRequest);

    // Return appropriate status code
    const statusCode = result.success ? 200 : 400;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    logger.error('[API /best-practices/process] Error:', error as Error, { component: 'process' });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
