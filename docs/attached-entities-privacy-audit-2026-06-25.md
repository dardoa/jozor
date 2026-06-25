# Attached Entities Privacy Audit - 2026-06-25

## Scope
This audit reviews side channels around Sprint 14/15 privacy guarantees for viewer access. The focus is not the main `people_secure` read path, which already masks living/private people, but attached entities that can exist outside the direct person row:

- profile photos
- gallery images
- voice notes
- storage object metadata
- tree discussions
- media tables
- export/archive paths

## Current Protections Confirmed

### Secure people read path
- `people_secure` masks living/private person fields for viewer access.
- Masked fields include names, dates, places, contact details, bio, `metadata`, `photo_url`, `photo_path`, `photo_version`, `gallery`, `voiceNotes`, sources, and events.
- Direct `people` and `tree_checkpoints` reads are restricted to owners/editors.

### Export paths
- Viewer exports pass through `maskPeopleMap`.
- Covered formats include JSON, GEDCOM, ICS, JOZOR archive, publishing vector PDF, and HTML manuscript print/preview.

### Discussions
- `tree_discussions` are tree-level collaboration messages, not person-attached private records.
- Viewers can read tree discussions but cannot insert messages unless they are editors or owners.
- Insert policies verify caller identity and message length.

### Public media table
- `public.media` has RLS enabled with service-role-only access, so it is not an exposed viewer data path.

## Finding Closed In This Package

### Avatar object metadata listing
Earlier storage policy allowed viewer collaborators to `SELECT` object metadata under tree-scoped avatar folders:

```sql
private.is_tree_collaborator(tree_id, 'viewer')
```

That was too broad because a viewer could potentially list storage object names for a tree and discover hidden paths for living/private people, even though `people_secure` had removed those paths from the person payload.

Added migration:

```text
supabase/migrations/20260625161646_restrict_viewer_avatar_object_listing.sql
```

The new policy allows tree-scoped `avatars` metadata reads only for:

- tree owner
- editor collaborator

User profile avatar folders remain readable only by the owning user.

### Integration coverage expanded
The privacy integration test now seeds attached living-person media fields and verifies that:

- owners receive raw `photo_url`, `photo_path`, `photo_version`, `gallery`, and `voiceNotes`
- viewers receive `photo_url = null`, `photo_path = null`, `photo_version = 0`, empty `gallery`, and empty `voiceNotes`

## Remaining Risk

### Legacy public bucket URLs
The `avatars` bucket is still a legacy public bucket. This package intentionally does **not** make it private because the current UI and existing stored URLs rely on public object URLs.

This means:

- `people_secure` prevents viewers from learning hidden URLs through normal app reads.
- The new storage policy prevents viewer metadata listing/discovery through Supabase Storage APIs.
- A previously known public URL may still be fetchable directly because the bucket itself is public.

Fully closing that class of risk requires a larger migration:

1. Make avatar/gallery storage private.
2. Replace public URL generation with role-aware signed URL generation.
3. Ensure viewers only receive signed URLs for unmasked/deceased/non-private people.
4. Add expiration and cache invalidation rules.
5. Update image caching and export image prefetch paths accordingly.

That migration is intentionally deferred because it changes core image delivery behavior.

## Recommended Follow-Ups

1. **Private Media URL Migration**
   - Convert avatar/gallery reads to signed URLs.
   - Keep document/manuscript export image prefetch compatible with signed URLs.

2. **Owner/Editor Conflict Integration Tests**
   - Simulate concurrent owner/editor updates to the same person.
   - Verify conflict resolution does not overwrite newer owner data unexpectedly.

3. **Data Integrity Date Edge Cases**
   - Add tests for partial dates, free-form dates, invalid strings, and future Hijri/date-localization support.

4. **Health Center UX Polish**
   - Improve filters/actions in the existing Health Center rather than creating a new surface.
