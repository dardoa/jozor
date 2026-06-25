import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('avatar storage privacy migration', () => {
  it('does not allow viewer collaborators to list avatar object metadata', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260625161646_restrict_viewer_avatar_object_listing.sql'
    );
    const sql = readFileSync(migrationPath, 'utf8');
    const policySql = sql.match(/CREATE POLICY "Avatar Authenticated Read"[\s\S]*?;\s*$/m)?.[0] ?? '';

    expect(policySql).toContain("private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')");
    expect(policySql).not.toContain("private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'viewer')");
    expect(policySql).not.toContain('FOR SELECT USING (bucket_id = \'avatars\')');
  });
});
