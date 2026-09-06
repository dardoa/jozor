export const REQUIRED_MEDIA_API_PATHS = Object.freeze([
  '/people_secure', '/tree_change_signals',
  '/rpc/is_tree_owner', '/rpc/is_tree_collaborator',
  '/rpc/sync_tree_batch', '/rpc/import_tree_content', '/rpc/cleanup_failed_import_tree',
  '/rpc/attach_legacy_profile_person_media', '/rpc/attach_legacy_gallery_person_media',
  '/rpc/finalize_legacy_profile_person_media', '/rpc/finalize_legacy_gallery_person_media_checked',
  '/rpc/claim_person_media_cleanup', '/rpc/complete_person_media_cleanup',
  '/rpc/list_person_media_cleanup_candidates', '/rpc/count_pending_person_media_cleanup',
]);

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads only service metadata. Does not call RPCs, list people, create accounts,
 * migrate a schema, delete files, or claim that RLS/runtime behavior was tested.
 * @param {{ mode: string, supabaseUrl: string, serviceRoleKey: string }} config
 * @param {typeof fetch} request
 */
export async function inspectPersonMediaReadiness(config, request = fetch) {
  /** @type {{ id: string, present: boolean, reason: string }[]} */
  const checks = [];
  const readMetadata = async (path, accept = 'application/json') => {
    try {
      const response = await request(`${config.supabaseUrl}${path}`, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
        headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: accept },
      });
      if (!response.ok) return { value: null, reason: `http-${response.status}` };
      const value = await response.json();
      return { value, reason: 'received' };
    } catch {
      // Provider/network errors can contain URLs or request headers.
      return { value: null, reason: 'metadata-unavailable' };
    }
  };

  const catalog = await readMetadata('/rest/v1/', 'application/openapi+json');
  const paths = isRecord(catalog.value) && isRecord(catalog.value.paths) ? catalog.value.paths : null;
  checks.push({ id: 'api-catalog', present: paths !== null, reason: paths ? 'received' : catalog.reason });
  for (const path of REQUIRED_MEDIA_API_PATHS) {
    const method = path.startsWith('/rpc/') ? 'post' : 'get';
    const present = paths !== null && isRecord(paths[path]) && isRecord(paths[path][method]);
    checks.push({ id: path, present, reason: present ? 'exposed' : 'missing-or-unavailable' });
  }

  const bucket = await readMetadata('/storage/v1/bucket/person-media');
  const privateBucket = isRecord(bucket.value) && bucket.value.id === 'person-media' && bucket.value.public === false;
  const mimeTypes = isRecord(bucket.value) ? bucket.value.allowed_mime_types : null;
  const expected = ['image/jpeg', 'image/png', 'image/webp'];
  const restrictedImages = Array.isArray(mimeTypes) && mimeTypes.length === expected.length
    && expected.every(mime => mimeTypes.includes(mime));
  const bounded = isRecord(bucket.value) && bucket.value.file_size_limit === 5242880;
  checks.push({ id: 'private-image-bucket', present: privateBucket, reason: privateBucket ? 'private' : 'missing-public-or-unavailable' });
  checks.push({ id: 'image-types-and-size', present: restrictedImages && bounded, reason: restrictedImages && bounded ? 'matches-image-contract' : 'contract-mismatch-or-unavailable' });
  return {
    target: config.mode,
    status: checks.every(check => check.present) ? 'prerequisites-present' : 'blocked',
    runtimeVerified: false,
    mutationsPerformed: false,
    checks,
    pendingGates: ['hosted-api-routing', 'role-and-realtime-behavior', 'account-deletion', 'browser-reconnect', 'cleanup-activation-review'],
  };
}
