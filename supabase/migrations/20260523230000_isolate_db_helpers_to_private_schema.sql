-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke public access to private schema
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role, postgres;

-- 1. Create secure implementations in private schema
CREATE OR REPLACE FUNCTION private.current_user_id_text()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.jwt() ->> 'sub';
$function$;

CREATE OR REPLACE FUNCTION private.is_tree_owner(p_tree_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.trees t
    WHERE t.id = p_tree_id
      AND t.owner_id = private.current_user_id_text()
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_tree_collaborator(p_tree_id uuid, p_required_role text DEFAULT 'viewer'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tree_collaborators
    WHERE tree_id = p_tree_id
      AND (
        collaborator_uid = private.current_user_id_text()
        OR lower(email) = lower(auth.jwt() ->> 'email')
      )
      AND (
        p_required_role = 'viewer'
        OR (p_required_role = 'editor' AND role = 'editor')
      )
  );
END;
$function$;

-- Grant execute on private functions to authenticated role for RLS policy execution
GRANT EXECUTE ON FUNCTION private.current_user_id_text() TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION private.is_tree_owner(uuid) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION private.is_tree_collaborator(uuid, text) TO authenticated, service_role, postgres;

-- 2. Convert public functions to thin SECURITY INVOKER wrappers
CREATE OR REPLACE FUNCTION public.current_user_id_text()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT private.current_user_id_text();
$function$;

CREATE OR REPLACE FUNCTION public.is_tree_owner(p_tree_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT private.is_tree_owner(p_tree_id);
$function$;

CREATE OR REPLACE FUNCTION public.is_tree_collaborator(p_tree_id uuid, p_required_role text DEFAULT 'viewer'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT private.is_tree_collaborator(p_tree_id, p_required_role);
$function$;
