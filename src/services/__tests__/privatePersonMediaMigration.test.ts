import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('private person media migration', () => {
  const sql = readFileSync(path.resolve(
    process.cwd(),
    'supabase/migrations/20260905000100_add_private_person_media_bucket.sql'
  ), 'utf8');
  const legacyMigrationSql = readFileSync(path.resolve(
    process.cwd(),
    'supabase/migrations/20260905000200_add_legacy_person_media_migration_rpcs.sql'
  ), 'utf8');

  it('creates a private image-only bucket and never grants viewer object listing', () => {
    expect(sql).toMatch(/'person-media',\s*'person-media',\s*false/);
    expect(sql).toContain("ARRAY['image/jpeg', 'image/png', 'image/webp']");
    expect(sql).toContain('private.is_valid_person_media_object_name(name)');
    expect(sql).toMatch(/\(profile-photo\|gallery-photo\)[^\n]+\\\.\(jpg\|png\|webp\)/);

    const readPolicy = sql.match(/CREATE POLICY "Person Media Authenticated Read"[\s\S]*?;\s*$/m)?.[0] ?? '';
    expect(readPolicy).toContain("private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')");
    expect(readPolicy).not.toContain("private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'viewer')");
  });

  it('removes typed media references from masked custom fields', () => {
    expect(sql).toContain("p_custom_fields - 'photoAsset' - 'voiceNoteAssets'");
    expect(sql).toContain("'gallery', '[]'::jsonb");
    expect(sql).toContain("'voiceNotes', '[]'::jsonb");
  });

  it('projects media updates only after the existing LWW winner is confirmed', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION private.project_person_media_update()');
    expect(sql).toContain("v_key NOT IN ('photoAsset', 'gallery')");
    expect(sql).toContain("v_metadata->'lastUpdatedOps'->v_key");
    expect(sql).toContain("IS DISTINCT FROM NEW.created_at");
    expect(sql).toContain('AFTER INSERT ON public.tree_operations');
  });

  it('strips provider media references from person metadata and backfills existing rows', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION private.strip_person_media_metadata()');
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF metadata ON public.people');
    expect(sql).toContain("- 'photoAsset'");
    expect(sql).toContain("- 'photoPath'");
    expect(sql).toMatch(/UPDATE public\.people[\s\S]*WHERE metadata \?\| ARRAY/);
  });

  it('validates private media paths and supports an explicit profile-photo removal', () => {
    expect(sql).toContain("v_custom_fields := v_custom_fields - 'photoAsset'");
    expect(sql).toContain("private.is_valid_person_media_asset(v_asset, NEW.tree_id, 'profile-photo')");
    expect(sql).toContain("private.is_valid_person_media_asset(v_asset, NEW.tree_id, 'gallery-photo')");
    expect(sql).toContain("p_asset->'bucket' IS DISTINCT FROM '\"person-media\"'::JSONB");
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF custom_fields ON public.people');
    expect(sql).toContain('REVOKE ALL ON FUNCTION private.project_person_media_update()');
  });

  it('keeps legacy migration mutations server-only and compare-and-set based', () => {
    expect(legacyMigrationSql).toContain('CREATE OR REPLACE FUNCTION public.attach_legacy_profile_person_media');
    expect(legacyMigrationSql).toContain('CREATE OR REPLACE FUNCTION public.attach_legacy_gallery_person_media');
    expect(legacyMigrationSql).toContain('photo_path IS NOT DISTINCT FROM p_expected_photo_path');
    expect(legacyMigrationSql).toContain('v_gallery->p_gallery_index IS DISTINCT FROM p_expected_item');
    expect(legacyMigrationSql).toContain("THEN item - 'path' - 'url'");
    expect(legacyMigrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.attach_legacy_profile_person_media[\s\S]*?FROM PUBLIC, anon, authenticated/);
    expect(legacyMigrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.attach_legacy_profile_person_media[\s\S]*?TO service_role/);
    expect(legacyMigrationSql).not.toMatch(/GRANT EXECUTE[\s\S]*?TO authenticated/);
  });
});
