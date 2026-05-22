-- Current application code no longer calls these legacy tree-edit RPCs.
-- Person and relationship changes are projected through table writes under RLS
-- and logged through tree_operations. Keep the functions available for
-- compatibility review, but remove direct REST/RPC execution from browser roles.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) FROM PUBLIC;

COMMIT;

NOTIFY pgrst, 'reload schema';
