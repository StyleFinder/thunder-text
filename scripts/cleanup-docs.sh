#!/bin/bash
# Documentation Cleanup Script for Thunder Text
# Moves obsolete documentation to _deprecated folder for review before deletion
#
# Categories:
# - PHASE/PROGRESS docs: Migration tracking, now complete
# - FIX/SUMMARY docs: One-time fixes, historical
# - MIGRATION docs: Completed migrations (Render, Auth, UI, Polaris)
# - SESSION docs: AI session-specific notes
# - SETUP docs: One-time setup guides (may keep some)

set -e

PROJECT_ROOT="/Users/bigdaddy/projects/thunder-text"
DEPRECATED_DIR="$PROJECT_ROOT/_deprecated"
DEPRECATED_ROOT="$DEPRECATED_DIR/root-docs"
DEPRECATED_CLAUDEDOCS="$DEPRECATED_DIR/claudedocs"
DEPRECATED_DOCS="$DEPRECATED_DIR/docs"

# Create deprecated directories
mkdir -p "$DEPRECATED_ROOT"
mkdir -p "$DEPRECATED_CLAUDEDOCS"
mkdir -p "$DEPRECATED_DOCS"

echo "=== Thunder Text Documentation Cleanup ==="
echo "Moving obsolete docs to: $DEPRECATED_DIR"
echo ""

# Counter for moved files
moved_count=0

move_file() {
    local src="$1"
    local dest_dir="$2"
    local reason="$3"

    if [ -f "$src" ]; then
        local filename=$(basename "$src")
        echo "  [$reason] $filename"
        mv "$src" "$dest_dir/"
        moved_count=$((moved_count + 1))
    fi
}

cd "$PROJECT_ROOT"

echo "--- ROOT LEVEL DOCS ---"
echo ""

echo "[Phase/Progress Tracking - Completed migrations]"
move_file "PHASE1_COMPLETE.md" "$DEPRECATED_ROOT" "phase"
move_file "PHASE1_PROGRESS.md" "$DEPRECATED_ROOT" "phase"
move_file "PHASE2_PROGRESS.md" "$DEPRECATED_ROOT" "phase"
move_file "PHASE3_SUMMARY.md" "$DEPRECATED_ROOT" "phase"

echo ""
echo "[Migration Docs - Completed migrations]"
move_file "AUTH_MIGRATION_CHECKLIST.md" "$DEPRECATED_ROOT" "migration"
move_file "AUTH_MIGRATION_STRATEGY.md" "$DEPRECATED_ROOT" "migration"
move_file "MIGRATION_TO_RENDER.md" "$DEPRECATED_ROOT" "migration"
move_file "MIGRATION_STATUS.md" "$DEPRECATED_ROOT" "migration"
move_file "migration-guide.md" "$DEPRECATED_ROOT" "migration"
move_file "UI_MIGRATION_COMPLETE.md" "$DEPRECATED_ROOT" "migration"
move_file "POLARIS_REMOVAL_SUMMARY.md" "$DEPRECATED_ROOT" "migration"
move_file "REMAINING_POLARIS_FILES.md" "$DEPRECATED_ROOT" "migration"
move_file "ACE_UI_MIGRATION_COMPLETE.md" "$DEPRECATED_ROOT" "migration"
move_file "ACE_INTEGRATION_COMPLETE.md" "$DEPRECATED_ROOT" "migration"

echo ""
echo "[Fix Summaries - One-time fixes]"
move_file "BUILD_FIX_COMPLETE.md" "$DEPRECATED_ROOT" "fix"
move_file "CORS_SECURITY_FIX.md" "$DEPRECATED_ROOT" "fix"
move_file "EMBEDDED_AUTH_FIX.md" "$DEPRECATED_ROOT" "fix"
move_file "LAYOUT_FIX_SUMMARY.md" "$DEPRECATED_ROOT" "fix"
move_file "QUICK_FIX_TOKEN_EXCHANGE.md" "$DEPRECATED_ROOT" "fix"
move_file "RENDER_ENV_FIX.md" "$DEPRECATED_ROOT" "fix"
move_file "RENDER_ENV_REQUIRED.md" "$DEPRECATED_ROOT" "fix"
move_file "X_FRAME_OPTIONS_FIX.md" "$DEPRECATED_ROOT" "fix"
move_file "TYPESCRIPT_FIXES_SUMMARY.md" "$DEPRECATED_ROOT" "fix"
move_file "typescript-fixes-summary.md" "$DEPRECATED_ROOT" "fix"
move_file "PR_SUMMARY.md" "$DEPRECATED_ROOT" "fix"
move_file "SOLUTION_IMPLEMENTED.md" "$DEPRECATED_ROOT" "fix"

echo ""
echo "[Status/Analysis Docs - Point-in-time snapshots]"
move_file "DEPLOYMENT_STATUS.md" "$DEPRECATED_ROOT" "status"
move_file "DATABASE_VERIFICATION.md" "$DEPRECATED_ROOT" "status"
move_file "DESIGN_SYSTEM_STATUS.md" "$DEPRECATED_ROOT" "status"
move_file "LAYOUT_ANALYSIS.md" "$DEPRECATED_ROOT" "status"
move_file "PACKAGES_REVIEW.md" "$DEPRECATED_ROOT" "status"
move_file "SECURITY_PROGRESS.md" "$DEPRECATED_ROOT" "status"
move_file "CHECK_ENV_VARS.md" "$DEPRECATED_ROOT" "status"

echo ""
echo "[Issue/Session Docs - Historical context]"
move_file "ISSUE_SUMMARY_IMAGE_UPLOAD.md" "$DEPRECATED_ROOT" "issue"
move_file "SESSION_CONTEXT_MULTI_VARIANT_PLANNING.md" "$DEPRECATED_ROOT" "session"

echo ""
echo "[Improvement Plans - May be superseded]"
move_file "AUTHENTICATION_IMPROVEMENT_PLAN.md" "$DEPRECATED_ROOT" "plan"

echo ""
echo "--- CLAUDEDOCS ---"
echo ""

echo "[Session-specific docs]"
move_file "claudedocs/facebook-oauth-debugging-session.md" "$DEPRECATED_CLAUDEDOCS" "session"
move_file "claudedocs/session-context-image-upload-resolution.md" "$DEPRECATED_CLAUDEDOCS" "session"
move_file "claudedocs/SESSION_ONRENDER_MIGRATION_COMPLETE.md" "$DEPRECATED_CLAUDEDOCS" "session"

echo ""
echo "[Analysis/Status Reports - Point-in-time]"
move_file "claudedocs/ANALYSIS_REPORT_2025-12-01.md" "$DEPRECATED_CLAUDEDOCS" "analysis"
move_file "claudedocs/POST_MIGRATION_ANALYSIS_2025-12-01.md" "$DEPRECATED_CLAUDEDOCS" "analysis"
move_file "claudedocs/CONSOLE_LOG_ANALYSIS.md" "$DEPRECATED_CLAUDEDOCS" "analysis"
move_file "claudedocs/CODEBASE_OVERLAP_ANALYSIS.md" "$DEPRECATED_CLAUDEDOCS" "analysis"
move_file "claudedocs/PRODUCTION_READINESS_ANALYSIS.md" "$DEPRECATED_CLAUDEDOCS" "analysis"
move_file "claudedocs/code-analysis-report.md" "$DEPRECATED_CLAUDEDOCS" "analysis"

echo ""
echo "[Completed Migration Docs]"
move_file "claudedocs/COMPLETE_CLEANUP_SUMMARY.md" "$DEPRECATED_CLAUDEDOCS" "migration"
move_file "claudedocs/FINAL_MIGRATION_COMPLETE.md" "$DEPRECATED_CLAUDEDOCS" "migration"
move_file "claudedocs/SENTRY_MIGRATION_SUMMARY.md" "$DEPRECATED_CLAUDEDOCS" "migration"
move_file "claudedocs/RLS_SECURITY_IMPLEMENTATION_COMPLETE.md" "$DEPRECATED_CLAUDEDOCS" "migration"

echo ""
echo "[Fix Summaries]"
move_file "claudedocs/auth-ts-fixes-summary.md" "$DEPRECATED_CLAUDEDOCS" "fix"
move_file "claudedocs/test-fixes-summary.md" "$DEPRECATED_CLAUDEDOCS" "fix"

echo ""
echo "[Audits/Plans - May be superseded]"
move_file "claudedocs/todo-audit.md" "$DEPRECATED_CLAUDEDOCS" "audit"
move_file "claudedocs/code-quality-improvement-plan.md" "$DEPRECATED_CLAUDEDOCS" "plan"
move_file "claudedocs/critical-issues-status.md" "$DEPRECATED_CLAUDEDOCS" "status"
move_file "claudedocs/refactoring-plan-create-pd.md" "$DEPRECATED_CLAUDEDOCS" "plan"

echo ""
echo "--- DOCS FOLDER ---"
echo ""

echo "[Completed Migration/Status Docs]"
move_file "docs/CURRENT_STATUS_TOKEN_EXCHANGE.md" "$DEPRECATED_DOCS" "status"
move_file "docs/DEPLOYMENT_STATUS_NEW_API_KEYS.md" "$DEPRECATED_DOCS" "status"
move_file "docs/DEPLOYMENT_VERIFICATION.md" "$DEPRECATED_DOCS" "status"
move_file "docs/MIGRATION_PROGRESS_DAY_1.md" "$DEPRECATED_DOCS" "migration"
move_file "docs/SUPABASE_API_KEY_MIGRATION.md" "$DEPRECATED_DOCS" "migration"
move_file "docs/TOKEN_EXCHANGE_RESOLUTION_REPORT.md" "$DEPRECATED_DOCS" "migration"
move_file "docs/POLARIS_MIGRATION.md" "$DEPRECATED_DOCS" "migration"

echo ""
echo "[POC/Experimental Docs]"
move_file "docs/POC_REACT_ROUTER_7_RESULTS.md" "$DEPRECATED_DOCS" "poc"
move_file "docs/REACT_ROUTER_7_MIGRATION_PLAN.md" "$DEPRECATED_DOCS" "poc"
move_file "docs/plan.md" "$DEPRECATED_DOCS" "poc"

echo ""
echo "[Authentication Testing - May consolidate]"
move_file "docs/AUTHENTICATION_CLEANUP_SUMMARY.md" "$DEPRECATED_DOCS" "auth"
move_file "docs/AUTHENTICATION_TESTING_SUMMARY.md" "$DEPRECATED_DOCS" "auth"

echo ""
echo "=== CLEANUP COMPLETE ==="
echo ""
echo "Moved $moved_count files to $_deprecated"
echo ""
echo "Review the _deprecated folder and delete when ready:"
echo "  rm -rf $DEPRECATED_DIR"
echo ""
echo "--- FILES KEPT (Review these manually) ---"
echo ""
echo "Root level (keeping):"
ls -1 *.md 2>/dev/null | grep -v "^README.md$" | grep -v "^CLAUDE.md$" | head -20 || echo "  (none remaining)"
echo ""
echo "docs/ folder (keeping):"
ls -1 docs/*.md 2>/dev/null | head -20 || echo "  (none remaining)"
echo ""
echo "claudedocs/ folder (keeping):"
ls -1 claudedocs/*.md 2>/dev/null | head -20 || echo "  (none remaining)"
