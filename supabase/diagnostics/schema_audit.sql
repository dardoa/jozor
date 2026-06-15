-- Run in Supabase SQL Editor to verify the live database matches the app contract.

-- 1) Required columns on core tables
select 'columns_people' as check_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'people'
  and column_name in (
    'id','tree_id','first_name','last_name','middle_name','birth_name','nick_name','suffix',
    'gender','birth_date','death_date','birth_place','death_place','bio','profession',
    'company','interests','photo_url','email','website','blog','address','custom_fields','metadata'
  )

union all

select 'columns_tree_operations' as check_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tree_operations'
  and column_name in ('id','tree_id','user_id','type','payload','version_seq','created_at')

union all

select 'columns_trees' as check_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'trees'
  and column_name in ('id','owner_id','name','focus_id','settings','created_at','updated_at')

union all

select 'columns_tree_collaborators' as check_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tree_collaborators'
  and column_name in ('id','tree_id','email','role','invited_by','invited_at')

union all

select 'functions' as check_name, routine_name as column_name, routine_type as data_type
from information_schema.routines
where specific_schema = 'public'
  and routine_name in (
    'sync_tree_batch',
    'create_tree_with_root',
    'replace_tree_content',
    'claim_collaborator_memberships',
    'current_user_id_text',
    'is_tree_collaborator'
  )

union all

select 'policies_people' as check_name, policyname as column_name, cmd as data_type
from pg_policies
where schemaname = 'public'
  and tablename = 'people'

union all

select 'policies_tree_operations' as check_name, policyname as column_name, cmd as data_type
from pg_policies
where schemaname = 'public'
  and tablename = 'tree_operations'

order by check_name, column_name;

-- 2) Replace the tree id below and inspect persisted people rows.
-- select id, tree_id, first_name, last_name, profession, bio, custom_fields, metadata
-- from public.people
-- where tree_id = 'REPLACE_WITH_TREE_ID'
-- order by first_name;

-- 3) Replace the tree id below and inspect the most recent operation log.
-- select id, tree_id, user_id, type, payload, version_seq, created_at
-- from public.tree_operations
-- where tree_id = 'REPLACE_WITH_TREE_ID'
-- order by version_seq desc
-- limit 20;
