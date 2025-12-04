# Thunder Text Database Migration Guide

Since MCP Supabase server is not available, here are the steps to apply the database migration:

## Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**: 
   - Go to: https://app.supabase.com/project/***REMOVED***/sql/new

2. **Copy Migration SQL**:
   - Open the file `apply_migrations.sql` in this project
   - Copy the entire contents (600+ lines)

3. **Run Migration**:
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for completion (should take 10-30 seconds)

4. **Verify Success**:
   - Go to: https://app.supabase.com/project/***REMOVED***/editor
   - You should see the following tables:
     - stores
     - products  
     - images
     - templates
     - generation_jobs
     - usage_metrics
     - subscription_plans
     - usage_alerts
     - performance_data

## Option 2: Command Line (If you have service_role key)

If you have the actual `service_role` key (not the `anon` key):

1. Update the key in `run-migration.js`
2. Run: `node run-migration.js`

The current key in your environment appears to be the `anon` key which has limited permissions.

## What the Migration Creates

- **Multi-tenant database structure** with Row Level Security
- **4 subscription plans**: Starter ($29), Professional ($79), Enterprise ($199), Enterprise Plus ($499)
- **Usage tracking** and billing management tables
- **Product management** tables for Shopify integration
- **AI generation** job tracking and cost management
- **Performance analytics** tables

## After Migration

Once complete, you can:
1. Test the local application: `npm run dev`
2. Deploy to Render with database connected
3. Test end-to-end workflow with zunosai-staging-test-store

## Current Status

✅ Database connection confirmed  
⏳ Migration pending (manual step required)  
✅ Environment variables configured  
✅ Production credentials ready