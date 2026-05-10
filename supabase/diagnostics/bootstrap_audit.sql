-- Bootstrap Audit
-- Run this in a fresh or recently migrated Supabase environment to confirm
-- that the core schema bootstrap contract is present before relying on the app.

select 'tables' as category, table_name as item, 'present' as status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'trees',
    'people',
    'relationships',
    'tree_operations',
    'tree_collaborators',
    'tree_shares',
    'user_profiles',
    'user_keys',
    'activity_logs'
  )

union all

select 'people_columns' as category, column_name as item, data_type as status
from information_schema.columns
where table_schema = 'public'
  and table_name = 'people'
  and column_name in (
    'tree_id',
    'first_name',
    'last_name',
    'custom_fields',
    'metadata'
  )

union all

select 'trees_columns' as category, column_name as item, data_type as status
from information_schema.columns
where table_schema = 'public'
  and table_name = 'trees'
  and column_name in (
    'owner_id',
    'name',
    'focus_id',
    'settings'
  )

union all

select 'indexes' as category, indexname as item, 'present' as status
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_trees_owner_id',
    'idx_people_tree_id',
    'uq_relationships_tree_person_relative_type',
    'uq_tree_operations_tree_version',
    'uq_tree_collaborators_tree_email',
    'uq_tree_shares_tree_id'
  )

union all

select 'storage_bucket' as category, id as item, 'present' as status
from storage.buckets
where id = 'avatars'

order by category, item;
