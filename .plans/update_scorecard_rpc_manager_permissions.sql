-- Migration: Add manager visibility for team scorecards to get_scorecard_aggregate RPC
-- This allows managers to view team scorecards when they manage the team owner

CREATE OR REPLACE FUNCTION get_scorecard_aggregate(
  p_scorecard_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scorecard RECORD;
  v_has_access BOOLEAN := FALSE;
  v_is_admin BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Check if user is system admin
  SELECT is_system_admin INTO v_is_admin
  FROM profiles
  WHERE id = p_user_id;

  -- Get scorecard details
  SELECT * INTO v_scorecard
  FROM scorecards
  WHERE id = p_scorecard_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Scorecard not found',
      'data', NULL
    );
  END IF;

  -- Check access permissions
  IF v_is_admin THEN
    v_has_access := TRUE;
  ELSIF v_scorecard.owner_user_id = p_user_id THEN
    -- User owns the scorecard
    v_has_access := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM scorecard_members
    WHERE scorecard_id = p_scorecard_id
      AND user_id = p_user_id
  ) THEN
    -- User is a member of the scorecard
    v_has_access := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM metrics
    WHERE scorecard_id = p_scorecard_id
      AND owner_user_id = p_user_id
      AND is_active = TRUE
  ) THEN
    -- User owns a metric on the scorecard
    v_has_access := TRUE;
  ELSIF v_scorecard.type = 'role' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_scorecard.owner_user_id
      AND manager_id = p_user_id
  ) THEN
    -- For role scorecards: User is the manager of the scorecard owner
    v_has_access := TRUE;
  ELSIF v_scorecard.type = 'team' AND v_scorecard.team_id IS NOT NULL THEN
    -- For team scorecards: Check if user is the manager of the team owner
    IF EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN profiles p ON p.id = tm.user_id
      WHERE tm.team_id = v_scorecard.team_id
        AND tm.role = 'owner'
        AND p.manager_id = p_user_id
    ) THEN
      v_has_access := TRUE;
    END IF;
  END IF;

  -- Return permission denied if no access
  IF NOT v_has_access THEN
    RETURN jsonb_build_object(
      'error', 'Permission denied',
      'data', NULL
    );
  END IF;

  -- Build the aggregate result
  SELECT jsonb_build_object(
    'error', NULL,
    'data', jsonb_build_object(
      'scorecard', to_jsonb(v_scorecard.*),
      'metrics', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'scorecard_id', m.scorecard_id,
            'name', m.name,
            'description', m.description,
            'target', m.target,
            'unit', m.unit,
            'frequency', m.frequency,
            'owner_user_id', m.owner_user_id,
            'display_order', m.display_order,
            'created_at', m.created_at,
            'updated_at', m.updated_at,
            'is_active', m.is_active,
            'is_archived', m.is_archived,
            'archived_at', m.archived_at,
            'owner', (
              SELECT to_jsonb(p.*)
              FROM profiles p
              WHERE p.id = m.owner_user_id
            ),
            'entries', COALESCE((
              SELECT jsonb_agg(
                to_jsonb(me.*) ORDER BY me.created_at DESC
              )
              FROM (
                SELECT *
                FROM metric_entries
                WHERE metric_id = m.id
                ORDER BY created_at DESC
                LIMIT 10
              ) me
            ), '[]'::jsonb)
          )
        )
        FROM metrics m
        WHERE m.scorecard_id = p_scorecard_id
          AND m.is_active = TRUE
          AND m.is_archived = FALSE
        ORDER BY m.display_order
      ), '[]'::jsonb),
      'archivedMetrics', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'scorecard_id', m.scorecard_id,
            'name', m.name,
            'description', m.description,
            'target', m.target,
            'unit', m.unit,
            'frequency', m.frequency,
            'owner_user_id', m.owner_user_id,
            'display_order', m.display_order,
            'created_at', m.created_at,
            'updated_at', m.updated_at,
            'is_active', m.is_active,
            'is_archived', m.is_archived,
            'archived_at', m.archived_at,
            'owner', (
              SELECT to_jsonb(p.*)
              FROM profiles p
              WHERE p.id = m.owner_user_id
            ),
            'entries', COALESCE((
              SELECT jsonb_agg(
                to_jsonb(me.*) ORDER BY me.created_at DESC
              )
              FROM (
                SELECT *
                FROM metric_entries
                WHERE metric_id = m.id
                ORDER BY created_at DESC
                LIMIT 10
              ) me
            ), '[]'::jsonb)
          )
        )
        FROM metrics m
        WHERE m.scorecard_id = p_scorecard_id
          AND m.is_active = TRUE
          AND m.is_archived = TRUE
        ORDER BY m.archived_at DESC
      ), '[]'::jsonb),
      'employees', COALESCE((
        CASE
          WHEN v_scorecard.type = 'team' AND v_scorecard.team_id IS NOT NULL THEN
            -- For team scorecards, return team members with profiles
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'user_id', tm.user_id,
                  'profile', to_jsonb(p.*)
                )
              )
              FROM team_members tm
              JOIN profiles p ON p.id = tm.user_id
              WHERE tm.team_id = v_scorecard.team_id
                AND p.is_active = TRUE
            )
          ELSE
            -- For role scorecards, return all active employees
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'user_id', e.user_id,
                  'profile', to_jsonb(p.*)
                )
              )
              FROM employees e
              JOIN profiles p ON p.id = e.user_id
              WHERE p.is_active = TRUE
            )
        END
      ), '[]'::jsonb)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_scorecard_aggregate(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_scorecard_aggregate IS 'Loads complete scorecard aggregate with permission checks. Includes manager visibility: managers can view role scorecards of their direct reports, and team scorecards where they manage the team owner.';
