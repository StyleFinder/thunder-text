/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { v4 as uuidv4 } from "uuid";
import { ContentExtractionAgent } from "./agents/content-extraction";
import { AnalysisAgent } from "./agents/analysis";
import { QualityAgent } from "./agents/quality";
import { StorageAgent } from "./agents/storage";
import { logger } from "@/lib/logger";
import {
  ProcessBestPracticeRequest,
  ProcessBestPracticeResponse,
  AgentContext,
  WorkflowState,
  WorkflowStep,
  BestPracticeMetadata,
} from "../../../types/best-practices";

export class BestPracticesOrchestrator {
  private extractionAgent: ContentExtractionAgent;
  private analysisAgent: AnalysisAgent;
  private qualityAgent: QualityAgent;
  private storageAgent: StorageAgent;

  constructor() {
    this.extractionAgent = new ContentExtractionAgent();
    this.analysisAgent = new AnalysisAgent();
    this.qualityAgent = new QualityAgent();
    this.storageAgent = new StorageAgent();
  }

  /**
   * Process a best practice request through the full agent pipeline
   */
  async process(
    request: ProcessBestPracticeRequest,
  ): Promise<ProcessBestPracticeResponse> {
    // Initialize workflow context
    const context: AgentContext = {
      request_id: uuidv4(),
      source_type: request.source_type,
      original_input: request,
      stage: "extraction",
      metadata: {},
      warnings: [],
      errors: [],
    };

    const workflow: WorkflowState = {
      request_id: context.request_id,
      status: "running",
      current_stage: "extraction",
      progress_percentage: 0,
      started_at: new Date().toISOString(),
      context,
    };

    console.log(
      `\n${"=".repeat(60)}\n[Orchestrator] Starting workflow: ${context.request_id}\n${"=".repeat(60)}`,
    );

    try {
      // STAGE 1: Content Extraction
      const extractionStep = this.createStep(
        "Content Extraction",
        "extraction",
      );
      workflow.current_stage = "extraction";
      workflow.progress_percentage = 10;

      console.log("\n[Stage 1/4] Content Extraction");
      const extractionResult = await this.extractionAgent.extract(context);
      extractionStep.status = "completed";
      extractionStep.completed_at = new Date().toISOString();
      extractionStep.duration_ms =
        new Date(extractionStep.completed_at).getTime() -
        new Date(extractionStep.started_at!).getTime();

      console.log(
        `✓ Extracted ${extractionResult.word_count} words using ${extractionResult.extraction_method}`,
      );
      workflow.progress_percentage = 35;

      // STAGE 2: Analysis
      const analysisStep = this.createStep("Content Analysis", "analysis");
      workflow.current_stage = "analysis";

      console.log("\n[Stage 2/4] Content Analysis");
      const analysisResult = await this.analysisAgent.analyze(
        extractionResult,
        context,
      );
      analysisStep.status = "completed";
      analysisStep.completed_at = new Date().toISOString();
      analysisStep.duration_ms =
        new Date(analysisStep.completed_at).getTime() -
        new Date(analysisStep.started_at!).getTime();

      console.log(
        `✓ Analyzed as: ${analysisResult.platform} → ${analysisResult.category} → ${analysisResult.goal}`,
      );
      console.log(`  Title: "${analysisResult.title}"`);
      console.log(`  Insights: ${analysisResult.key_insights.length}`);
      console.log(`  Tags: ${analysisResult.tags.length}`);
      workflow.progress_percentage = 60;

      // STAGE 3: Quality Assessment
      const qualityStep = this.createStep("Quality Assessment", "quality");
      workflow.current_stage = "quality";

      console.log("\n[Stage 3/4] Quality Assessment");
      const qualityAssessment = await this.qualityAgent.assess(
        extractionResult,
        analysisResult,
        context,
      );
      qualityStep.status = "completed";
      qualityStep.completed_at = new Date().toISOString();
      qualityStep.duration_ms =
        new Date(qualityStep.completed_at).getTime() -
        new Date(qualityStep.started_at!).getTime();

      console.log(
        `✓ Quality Score: ${qualityAssessment.overall_score.toFixed(1)}/10`,
      );
      console.log(
        `  Status: ${qualityAssessment.is_approved ? "✅ APPROVED" : "❌ REJECTED"}`,
      );

      if (qualityAssessment.issues.length > 0) {
        console.log("  Issues:");
        qualityAssessment.issues.forEach((issue) => {
          const icon =
            issue.severity === "critical"
              ? "🔴"
              : issue.severity === "warning"
                ? "⚠️"
                : "ℹ️";
          console.log(`    ${icon} ${issue.message}`);
          context.warnings.push(issue.message);
        });
      }

      if (qualityAssessment.duplicate_of) {
        console.log(
          `  🔄 Duplicate of: ${qualityAssessment.duplicate_of} (${(qualityAssessment.duplicate_similarity! * 100).toFixed(1)}% similar)`,
        );
      }

      workflow.progress_percentage = 85;

      // STAGE 4: Storage (only if approved)
      let storageResult;
      let best_practice_id: string | undefined;

      if (qualityAssessment.is_approved || request.skip_quality_check) {
        const storageStep = this.createStep("Storage", "storage");
        workflow.current_stage = "storage";

        console.log("\n[Stage 4/4] Storage");
        storageResult = await this.storageAgent.store(
          extractionResult,
          analysisResult,
          qualityAssessment,
          context,
        );
        storageStep.status = "completed";
        storageStep.completed_at = new Date().toISOString();
        storageStep.duration_ms =
          new Date(storageStep.completed_at).getTime() -
          new Date(storageStep.started_at!).getTime();

        best_practice_id = storageResult.best_practice_id;
        console.log(
          `✓ ${storageResult.updated_existing ? "Updated" : "Inserted"}: ${best_practice_id}`,
        );
        console.log(`  Embedding: ✓ Vector indexed: ✓`);
      } else {
        console.log("\n[Stage 4/4] Storage - SKIPPED (not approved)");
        context.errors.push("Content did not pass quality assessment");
      }

      workflow.progress_percentage = 100;
      workflow.status = "completed";
      workflow.current_stage = "completed";
      workflow.completed_at = new Date().toISOString();

      // Build metadata response
      const metadata: BestPracticeMetadata = {
        title: analysisResult.title,
        platform: analysisResult.platform,
        category: analysisResult.category,
        goal: analysisResult.goal,
        description: analysisResult.description,
        quality_score: qualityAssessment.overall_score,
        priority_score: storageResult
          ? this.calculatePriorityFromQuality(qualityAssessment)
          : 0,
        extracted_insights: analysisResult.key_insights,
        tags: analysisResult.tags,
        example_quotes: analysisResult.example_quotes,
        source_author: request.source_name,
      };

      const response: ProcessBestPracticeResponse = {
        success: qualityAssessment.is_approved,
        best_practice_id,
        metadata,
        warnings: context.warnings,
        errors: context.errors,
      };

      console.log(`\n${"=".repeat(60)}`);
      console.log(
        `[Orchestrator] Workflow Complete: ${response.success ? "✅ SUCCESS" : "❌ FAILED"}`,
      );
      console.log(`${"=".repeat(60)}\n`);

      return response;
    } catch (error) {
      workflow.status = "failed";
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(
        `\n❌ [Orchestrator] Workflow Failed: ${errorMessage}\n`,
        undefined,
        { component: "orchestrator" },
      );

      return {
        success: false,
        metadata: {
          title: "Failed to process",
          platform: request.platform || "meta",
          category: request.category || "unknown",
          goal: request.goal || "conversion",
          description: "Processing failed",
          quality_score: 0,
          priority_score: 0,
          extracted_insights: [],
          tags: [],
        },
        warnings: context.warnings,
        errors: [...context.errors, errorMessage],
      };
    }
  }

  /**
   * Process multiple best practices in batch
   */
  async processBatch(
    requests: ProcessBestPracticeRequest[],
  ): Promise<ProcessBestPracticeResponse[]> {
    console.log(
      `\n[Orchestrator] Starting batch processing: ${requests.length} requests`,
    );

    const results: ProcessBestPracticeResponse[] = [];

    for (let i = 0; i < requests.length; i++) {
      console.log(`\n--- Processing ${i + 1}/${requests.length} ---`);
      try {
        const result = await this.process(requests[i]);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to process request ${i + 1}:`, error as Error, {
          component: "orchestrator",
        });
        results.push({
          success: false,
          metadata: {
            title: "Batch processing failed",
            platform: "meta",
            category: "unknown",
            goal: "conversion",
            description: "Failed in batch processing",
            quality_score: 0,
            priority_score: 0,
            extracted_insights: [],
            tags: [],
          },
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }

      // Rate limiting pause between requests
      if (i < requests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `\n[Orchestrator] Batch complete: ${successCount}/${requests.length} succeeded`,
    );

    return results;
  }

  /**
   * Create a workflow step
   */
  private createStep(
    name: string,
    agent: "extraction" | "analysis" | "quality" | "storage",
  ): WorkflowStep {
    return {
      name,
      agent,
      status: "running",
      started_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate priority score from quality assessment
   */
  private calculatePriorityFromQuality(quality: {
    overall_score: number;
  }): number {
    return Math.round(quality.overall_score);
  }
}
