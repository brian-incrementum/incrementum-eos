-- Migration: Add archive fields to metrics table
-- Description: Adds support for archiving metrics with reason and metadata
-- Run this in Supabase SQL Editor

-- Add archive fields to metrics table
ALTER TABLE public.metrics
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS archive_reason text;

-- Add index for faster queries on is_archived
CREATE INDEX IF NOT EXISTS idx_metrics_is_archived ON public.metrics(is_archived);

-- Add index for archived_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_metrics_archived_at ON public.metrics(archived_at) WHERE archived_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN public.metrics.is_archived IS 'Whether the metric has been archived (soft delete)';
COMMENT ON COLUMN public.metrics.archived_at IS 'Timestamp when the metric was archived';
COMMENT ON COLUMN public.metrics.archived_by IS 'User who archived the metric';
COMMENT ON COLUMN public.metrics.archive_reason IS 'Optional reason for archiving the metric';
